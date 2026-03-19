import { Resend } from 'resend';

// Initialize Resend with API key (will be undefined in development)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email using Resend
 * Falls back to console logging in development if no API key is set
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // In development without API key, log the email
  if (!resend) {
    console.log('\n ========== EMAIL SENT (DEV MODE) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    console.log('==========================================\n');
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'syntxt_ <noreply@syntxt.app>',
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send verification code email
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Verify your email - syntxt_`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your email</title>
    </head>
    <body style="font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; background-color: #0a0a0a; color: #fafafa; margin: 0; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #fafafa;">syntxt_</h1>
          <p style="color: #737373; font-size: 14px; margin-top: 8px;">Text-only microblogging</p>
        </div>
        
        <div style="text-align: center;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #fafafa;">Verify your email address</h2>
          <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Hi @${username},<br><br>
            Thanks for signing up! Please use the verification code below to verify your email address:
          </p>
          
          <div style="background-color: #262626; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <code style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #a3e635;">${code}</code>
          </div>
          
          <p style="color: #737373; font-size: 13px; margin: 24px 0 0 0;">
            This code will expire in 10 minutes. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #262626; text-align: center;">
          <p style="color: #525252; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} syntxt_. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
syntxt_ - Verify your email

Hi @${username},

Thanks for signing up! Please use the verification code below to verify your email address:

${code}

This code will expire in 10 minutes. If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} syntxt_. All rights reserved.
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
