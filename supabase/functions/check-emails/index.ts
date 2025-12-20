// Setup: npm install -g supabase
// Deploy: supabase functions deploy check-emails
// Secrets: supabase secrets set EMAIL_PASSWORD_1=...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import imaps from "imap-simple";
import { simpleParser } from "simple-parser";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Get Active Email Accounts from DB
        const { data: accounts, error: accountError } = await supabase
            .from('email_accounts')
            .select('*')
            .eq('active', true);

        if (accountError) throw accountError;
        if (!accounts || accounts.length === 0) {
            return new Response(JSON.stringify({ message: 'No active email accounts found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Get Platforms Patterns
        const { data: platforms } = await supabase.from('platforms').select('*');

        let totalProcessed = 0;
        const logs: string[] = [];

        // 4. Process each email account
        for (const account of accounts) {
            logs.push(`Checking account: ${account.email}`);

            // Retrieve password from Env Vars (Security Best Practice)
            // We assume env vars are named like EMAIL_PASSWORD_user_gmail_com (sanitized)
            const envVarName = `EMAIL_PASSWORD_${account.email.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
            const password = Deno.env.get(envVarName);

            if (!password) {
                logs.push(`❌ Password not found for ${account.email} (Checked env: ${envVarName})`);
                continue;
            }

            const config = {
                imap: {
                    user: account.email,
                    password: password,
                    host: account.imap_host,
                    port: account.imap_port,
                    tls: true,
                    authTimeout: 10000,
                    tlsOptions: { rejectUnauthorized: false } // Sometimes needed for some providers
                }
            };

            try {
                const connection = await imaps.connect(config);
                await connection.openBox('INBOX');

                // Search criteria: UNSEEN emails
                const searchCriteria = ['UNSEEN'];
                const fetchOptions = {
                    bodies: ['HEADER', 'TEXT', ''],
                    markSeen: true // Mark as read after fetching
                };

                const messages = await connection.search(searchCriteria, fetchOptions);
                logs.push(`Found ${messages.length} unread emails`);

                for (const item of messages) {
                    const all = item.parts.find((part: any) => part.which === '');
                    const id = item.attributes.uid;
                    const idHeader = "Imap-Id: " + id + "\r\n";

                    // Parse Email
                    const mail = await simpleParser(idHeader + all.body);
                    const subject = mail.subject || '';
                    const from = mail.from?.text || '';
                    const textBody = mail.text || '';

                    // Extract email date (fallback to now if not available)
                    const emailDate = mail.date || new Date();

                    // Check if it matches any platform
                    let matchedPlatform = null;

                    // Simple matching logic (can be improved)
                    for (const platform of platforms || []) {
                        if (
                            (platform.email_pattern && from.includes(platform.email_pattern)) ||
                            subject.toLowerCase().includes(platform.name.toLowerCase())
                        ) {
                            matchedPlatform = platform;
                            break;
                        }
                    }

                    if (matchedPlatform) {
                        let amount = 0;
                        let currency = 'EUR';
                        let productName = 'Unknown Product';

                        // --- PARSING LOGIC PER PIATTAFORMA ---

                        // 1. PIXUP
                        if (matchedPlatform.name.toLowerCase() === 'pixup') {
                            // Product name: extract everything before " - STL From Designer"
                            // Format: "Product Price\nProduct Name - STL From Designer\t$2.50\nTotal Price:\t$2.50"
                            const productMatch = textBody.match(/Product\s+Price\s+(.+?)\s+-\s+STL\s+From\s+Designer/i);
                            if (productMatch) {
                                productName = productMatch[1].trim().replace(/\n/g, ' ').replace(/\t/g, ' ');
                            } else {
                                // Fallback: try to extract from line after "Product Price"
                                const fallbackMatch = textBody.match(/Product\s+Price\s+([^\n]+)/i);
                                if (fallbackMatch) {
                                    // Remove price at the end if present and "- STL" suffix
                                    productName = fallbackMatch[1].replace(/\$\s*\d+[.,]\d{2}.*$/, '').replace(/-\s*STL.*$/i, '').trim();
                                }
                            }

                            // Price: extract from "Total Price: $X.XX"
                            const priceMatch = textBody.match(/Total\s+Price:\s*[$€£]?\s*(\d+[.,]\d{2})/i);
                            if (priceMatch) {
                                amount = parseFloat(priceMatch[1].replace(',', '.'));
                                if (textBody.includes('$')) currency = 'USD';
                            }
                        }

                        // 2. CULTS3D
                        else if (matchedPlatform.name.toLowerCase().includes('cults')) {
                            // Product: "...bought your design [Name] on..."
                            const productMatch = textBody.match(/bought\s+your\s+design\s+([\s\S]*?)\s+on\s+/i);
                            if (productMatch) productName = productMatch[1].trim().replace(/\n/g, ' ');

                            // Price: Look for "Your income ... € 2,40" (Euro at the end is best)
                            // Priority: Euro value at the end > Your income > Total
                            const euroMatch = textBody.match(/€\s*(\d+[.,]\d{2})/);
                            if (euroMatch) {
                                amount = parseFloat(euroMatch[1].replace(',', '.'));
                                currency = 'EUR';
                            } else {
                                // Fallback to other currencies if Euro not found
                                const incomeMatch = textBody.match(/Your\s+income\s+[$]([A-Z]{2})?(\d+[.,]\d{2})/i);
                                if (incomeMatch) {
                                    amount = parseFloat(incomeMatch[2].replace(',', '.'));
                                    currency = 'USD'; // Default assumption if not EUR
                                }
                            }
                        }

                        // 3. CGTRADER
                        else if (matchedPlatform.name.toLowerCase().includes('cgtrader')) {
                            // Product: "Your model [Name] has been sold"
                            const productMatch = textBody.match(/Your\s+model\s+([\s\S]*?)\s+has\s+been\s+sold/i);
                            if (productMatch) productName = productMatch[1].trim().replace(/\n/g, ' ');

                            // Price: "...sold for $2.00"
                            const priceMatch = textBody.match(/sold\s+for\s+[$€£]?\s*(\d+[.,]\d{2})/i);
                            if (priceMatch) {
                                amount = parseFloat(priceMatch[1].replace(',', '.'));
                                if (textBody.includes('$')) currency = 'USD';
                            }
                        }

                        // 4. GENERIC FALLBACK (3DExport or others)
                        else {
                            const amountMatch = textBody.match(/(\d+[.,]\d{2})\s*€|€\s*(\d+[.,]\d{2})|\$(\d+[.,]\d{2})/);
                            if (amountMatch) {
                                const val = amountMatch[1] || amountMatch[2] || amountMatch[3];
                                amount = parseFloat(val.replace(',', '.'));
                            }
                            productName = subject;
                        }

                        // Clean up product name (remove excessive whitespace)
                        productName = productName.replace(/\s+/g, ' ').trim();

                        // Insert into DB
                        if (amount > 0) {
                            // Convert USD to EUR for Pixup (fixed rate: 1 USD = 0.95 EUR)
                            let finalAmount = amount;
                            let finalCurrency = currency;

                            if (matchedPlatform.name.toLowerCase() === 'pixup' && currency === 'USD') {
                                finalAmount = amount * 0.95; // Conversion rate
                                finalCurrency = 'EUR';
                                logs.push(`  💱 Converted: $${amount} USD → €${finalAmount.toFixed(2)} EUR`);
                            }

                            const { error: insertError } = await supabase.from('sales').insert({
                                platform_id: matchedPlatform.id,
                                email_account_id: account.id,
                                product_name: productName,
                                amount: finalAmount,
                                currency: finalCurrency,
                                sale_date: emailDate.toISOString(), // Use real email date
                                email_subject: subject,
                                email_body: textBody.substring(0, 1000)
                            });

                            if (!insertError) {
                                totalProcessed++;
                                logs.push(`✅ Processed: ${productName} (${currency} ${amount}) from ${matchedPlatform.name}`);
                            } else {
                                logs.push(`❌ DB Error: ${insertError.message}`);
                            }
                        } else {
                            logs.push(`⚠️ Skipped: Could not parse amount for ${subject}`);
                        }
                    }
                }

                connection.end();

                // Update last_checked timestamp
                await supabase
                    .from('email_accounts')
                    .update({ last_checked: new Date().toISOString() })
                    .eq('id', account.id);

            } catch (err: any) {
                logs.push(`❌ IMAP Error for ${account.email}: ${err.message}`);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processed: totalProcessed,
            logs: logs
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
