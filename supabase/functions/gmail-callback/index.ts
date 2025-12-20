// Gmail Callback - Gestisce il ritorno da Google OAuth
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const userEmail = url.searchParams.get('state'); // Email from state parameter

        if (!code) {
            return new Response('Authorization code not found', { status: 400 });
        }

        if (!userEmail) {
            return new Response('Email not found in state', { status: 400 });
        }

        const clientId = Deno.env.get('GMAIL_CLIENT_ID');
        const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            throw new Error('Failed to get access token');
        }

        // Save tokens to Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { error } = await supabase
            .from('email_accounts')
            .update({
                // Store tokens securely (you might want to encrypt these)
                imap_host: JSON.stringify({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: Date.now() + (tokens.expires_in * 1000)
                })
            })
            .eq('email', userEmail);

        if (error) throw error;

        // Redirect to success page
        return new Response(
            `<html><body><h1>✅ Autorizzazione Completata!</h1><p>Puoi chiudere questa finestra.</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );

    } catch (error: any) {
        return new Response(
            `<html><body><h1>❌ Errore</h1><p>${error.message}</p></body></html>`,
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }
});
