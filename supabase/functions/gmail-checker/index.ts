// Gmail Checker - processes sales emails and stores them in Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clean HTML email body into plain text
function cleanEmailBody(html: string): string {
    let text = html;
    // Remove script/style tags
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    // Strip all HTML tags
    text = text.replace(/<[^>]+>/g, " ");
    // Decode common entities
    const entities: Record<string, string> = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
        "&euro;": "€",
        "&#8364;": "€",
        "&dollar;": "$",
        "&#36;": "$",
        "&pound;": "£",
        "&#163;": "£",
    };
    for (const [entity, char] of Object.entries(entities)) {
        text = text.replace(new RegExp(entity, "g"), char);
    }
    // Normalize whitespace, including non‑breaking spaces
    text = text.replace(/[\u00a0\u202f]/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    return text;
}


// Helper to log to Supabase
async function logToDb(supabase: any, level: string, message: string, details: any = {}) {
    try {
        await supabase.from("app_logs").insert({
            level,
            message,
            details
        });
    } catch (e) {
        console.error("Failed to log to DB:", e);
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: accounts } = await supabase
            .from("email_accounts")
            .select("*")
            .not("imap_host", "is", null)
            .eq("active", true);

        if (!accounts || accounts.length === 0) {
            await logToDb(supabase, "ERROR", "No authorized accounts found");
            return new Response(JSON.stringify({ error: "No authorized accounts found" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const logs: string[] = [];
        let totalProcessed = 0;
        const { data: platforms } = await supabase.from("platforms").select("*");
        const { data: existingSales } = await supabase
            .from("sales")
            .select("email_subject")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        const processedSubjects = new Set((existingSales || []).map((s: any) => s.email_subject));

        let emailCount = 0;

        for (const account of accounts) {
            try {
                logs.push(`Checking ${account.email}...`);
                let tokens;
                try {
                    tokens = JSON.parse(account.imap_host);
                } catch {
                    logs.push(`❌ Error parsing tokens for ${account.email}`);
                    await logToDb(supabase, "ERROR", `Error parsing tokens for ${account.email}`);
                    continue;
                }
                let accessToken = tokens.access_token;
                if (Date.now() >= tokens.expires_at) {
                    logs.push(`🔄 Refreshing token...`);
                    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            client_id: Deno.env.get("GMAIL_CLIENT_ID")!,
                            client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
                            refresh_token: tokens.refresh_token,
                            grant_type: "refresh_token",
                        }),
                    });
                    if (!refreshResponse.ok) {
                        const errorText = await refreshResponse.text();
                        logs.push(`❌ Failed to refresh token: ${errorText}`);
                        await logToDb(supabase, "ERROR", `Failed to refresh token for ${account.email}`, { error: errorText });
                        continue;
                    }
                    const newTokens = await refreshResponse.json();
                    accessToken = newTokens.access_token;
                    await supabase.from("email_accounts").update({
                        imap_host: JSON.stringify({
                            ...tokens,
                            access_token: accessToken,
                            expires_at: Date.now() + newTokens.expires_in * 1000,
                        }),
                    }).eq("id", account.id);
                }

                // Search emails from the last 3 days (increased for safety)
                const lookbackDays = 3;
                const lookbackDate = new Date();
                lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
                const dateStr = lookbackDate.toISOString().split("T")[0].replace(/-/g, "/");
                const query = `after:${dateStr} (from:pixup3d.com OR from:cults3d.com OR from:cgtrader.com OR from:3dexport.com)`;

                const messagesResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (!messagesResponse.ok) {
                    logs.push(`❌ Failed to fetch messages: ${messagesResponse.status}`);
                    await logToDb(supabase, "ERROR", `Failed to fetch messages for ${account.email}`, { status: messagesResponse.status });
                    continue;
                }
                const messagesData = await messagesResponse.json();
                if (!messagesData.messages) {
                    logs.push(`No messages found for ${account.email}`);
                    continue;
                }
                logs.push(`📬 Found ${messagesData.messages.length} emails`);
                await logToDb(supabase, "INFO", `Found ${messagesData.messages.length} emails for ${account.email}`);

                for (const message of messagesData.messages.slice(0, 20)) {
                    const msgResponse = await fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    const msgData = await msgResponse.json();
                    const subject = msgData.payload.headers.find((h: any) => h.name === "Subject")?.value || "";
                    const from = msgData.payload.headers.find((h: any) => h.name === "From")?.value || "";
                    const dateHeader = msgData.payload.headers.find((h: any) => h.name === "Date")?.value || "";

                    // Parse email date (fallback to now if parsing fails)
                    let emailDate = new Date();
                    if (dateHeader) {
                        const parsedDate = new Date(dateHeader);
                        if (!isNaN(parsedDate.getTime())) {
                            emailDate = parsedDate;
                        }
                    }

                    if (processedSubjects.has(subject)) {
                        // logs.push(`Skipping processed: ${subject.substring(0, 30)}...`);
                        continue;
                    }

                    // Decode body (prefer plain text, fallback to html)
                    let body = "";
                    const decodeBody = (data: string) => {
                        const binary = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                        return new TextDecoder().decode(bytes);
                    };
                    if (msgData.payload.body?.data) {
                        body = decodeBody(msgData.payload.body.data);
                    } else if (msgData.payload.parts) {
                        const plain = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
                        if (plain?.body?.data) {
                            body = decodeBody(plain.body.data);
                        } else {
                            const htmlPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/html");
                            if (htmlPart?.body?.data) body = decodeBody(htmlPart.body.data);
                        }
                    }

                    const cleanBody = cleanEmailBody(body);

                    // Platform detection via domain
                    const domainMatch = from.toLowerCase().match(/@([a-z0-9.-]+)/);
                    const emailDomain = domainMatch ? domainMatch[1] : "";
                    const domainMap: Record<string, string> = {
                        "pixup3d.com": "pixup",
                        "cults3d.com": "cults3d",
                        "cgtrader.com": "cgtrader",
                        "3dexport.com": "3dexport",
                    };
                    const platformKey = Object.keys(domainMap).find((d) => emailDomain.includes(d));
                    const platformName = platformKey ? domainMap[platformKey] : null;
                    const matchedPlatform = platforms?.find((p) => p.name.toLowerCase() === platformName);
                    if (!matchedPlatform) {
                        continue;
                    }

                    let amount = 0;
                    let currency = "EUR";
                    let productName = "Unknown Product";

                    // Pixup parsing
                    if (platformName === "pixup") {
                        // Product name: extract everything before " - STL From Designer"
                        const productMatch = cleanBody.match(/Product\s+Price\s+(.+?)\s+-\s+STL\s+From\s+Designer/i);
                        if (productMatch) {
                            productName = productMatch[1].trim();
                        } else {
                            const fallbackMatch = cleanBody.match(/Product\s+Price\s+([^\n]+)/i);
                            if (fallbackMatch) {
                                productName = fallbackMatch[1].replace(/\$\s*\d+[.,]\d{2}.*$/, '').replace(/-\s*STL.*$/i, '').trim();
                            }
                        }

                        // Price: extract from "Total Price: $X.XX"
                        const priceMatch = cleanBody.match(/Total\s+Price:\s*\$\s*(\d+[.,]\d{2})/i);
                        if (priceMatch) {
                            amount = parseFloat(priceMatch[1].replace(",", "."));
                            currency = "USD";
                        }
                    }
                    // Cults3D parsing
                    else if (platformName === "cults3d") {
                        const productMatch = cleanBody.match(/bought\s+your\s+design\s+(.+?)\s+on\s+/i);
                        if (productMatch) productName = productMatch[1].trim();
                        let incomeMatch = cleanBody.match(/Your\s+income[^\n]*?\((?:€|EUR)\s*(\d+[.,]?\d*)\)/i);
                        if (!incomeMatch) incomeMatch = cleanBody.match(/\((?:€|EUR)\s*(\d+[.,]?\d*)\)/i);
                        if (!incomeMatch) incomeMatch = cleanBody.match(/Your\s+income[^\n]*?(?:€|EUR)\s*(\d+[.,]?\d*)/i);
                        if (incomeMatch) {
                            amount = parseFloat(incomeMatch[1].replace(",", "."));
                            currency = "EUR";
                        }
                    }
                    // 3DExport parsing
                    else if (platformName === "3dexport") {
                        const priceMatch = cleanBody.match(/[$€£]\s*(\d+[.,]\d{2})/);
                        if (priceMatch) {
                            amount = parseFloat(priceMatch[1].replace(",", "."));
                            if (cleanBody.includes("$")) currency = "USD";
                            else if (cleanBody.includes("€")) currency = "EUR";
                        }
                        productName = subject.replace(/Sale notification:?/i, "").trim();
                    }
                    // CGTrader parsing
                    else if (platformName === "cgtrader") {
                        // Extract product name from body
                        const productMatch = cleanBody.match(/Your\s+model\s+(.+?)\s+has\s+been\s+sold/i);
                        if (productMatch) {
                            productName = productMatch[1].trim();
                        } else {
                            // Fallback 1: Try "Model [name] has been sold" from subject
                            const subjectMatch1 = subject.match(/Model\s+(.+?)\s+has\s+been\s+sold/i);
                            if (subjectMatch1) {
                                productName = subjectMatch1[1].trim();
                            } else {
                                // Fallback 2: Try "Sold: [name]" or "Sale: [name]"
                                const subjectMatch2 = subject.match(/(?:Sold|Sale):\s*(.+)/i);
                                if (subjectMatch2) productName = subjectMatch2[1].trim();
                            }
                        }

                        // Try new format first: "Amount: $X.XX"
                        let priceMatch = cleanBody.match(/Amount:\s*\$\s*(\d+[.,]\d{2})/i);
                        if (priceMatch) {
                            amount = parseFloat(priceMatch[1].replace(",", "."));
                            currency = "USD";
                        } else {
                            // Fallback to old format: "sold for $X.XX"
                            priceMatch = cleanBody.match(/sold\s+for\s+[$€£]?\s*(\d+[.,]\d{2})/i);
                            if (priceMatch) {
                                amount = parseFloat(priceMatch[1].replace(",", "."));
                                if (cleanBody.includes("$")) currency = "USD";
                            }
                        }
                    }

                    emailCount++;

                    if (amount > 0 && productName !== "Unknown Product") {
                        // Convert USD to EUR for Pixup (fixed rate: 1 USD = 0.95 EUR)
                        let finalAmount = amount;
                        let finalCurrency = currency;

                        if (platformName === "pixup" && currency === "USD") {
                            finalAmount = amount * 0.95; // Conversion rate
                            finalCurrency = "EUR";
                        }

                        const { error } = await supabase.from("sales").insert({
                            platform_id: matchedPlatform.id,
                            email_account_id: account.id,
                            product_name: productName,
                            amount: finalAmount,
                            currency: finalCurrency,
                            sale_date: emailDate.toISOString(),
                            email_subject: subject,
                            email_body: cleanBody.substring(0, 1000),
                        });
                        if (!error) {
                            totalProcessed++;
                            processedSubjects.add(subject);
                            logs.push(`✅ INSERTED: ${productName.substring(0, 30)}`);
                        } else {
                            logs.push(`❌ DB Error: ${error.message}`);
                            await logToDb(supabase, "ERROR", "DB Insert Error", { error: error.message, subject });
                        }
                    } else {
                        logs.push(`⚠️ SKIPPED: incomplete data for ${subject}`);
                        // Log skipped email to DB for debugging
                        await logToDb(supabase, "WARN", "Parsing Failed", {
                            subject,
                            from,
                            platform: platformName,
                            extractedProduct: productName,
                            extractedAmount: amount,
                            snippet: cleanBody.substring(0, 200)
                        });
                    }
                }
            } catch (e: any) {
                logs.push(`❌ Error processing account ${account.email}: ${e.message}`);
                await logToDb(supabase, "ERROR", `Processing Error ${account.email}`, { error: e.message });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: totalProcessed, logs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

