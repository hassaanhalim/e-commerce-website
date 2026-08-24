import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY")?.trim();
    const customFrom = this.configService.get<string>("EMAIL_FROM")?.trim();

    this.frontendUrl = (
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173"
    ).replace(/\/+$/, "");

    // Resend allows "onboarding@resend.dev" by default, or verified custom domains
    this.fromEmail = customFrom || "Shoe Store <onboarding@resend.dev>";

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log("MailService initialized with Resend HTTPS API transport.");
    } else {
      this.isConfigured = false;
      this.logger.warn(
        "RESEND_API_KEY not configured. Email delivery will be simulated in server logs.",
      );
    }
  }

  async sendVerificationEmail(
    toEmail: string,
    recipientName: string,
    token: string,
  ): Promise<boolean> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const displayName = recipientName?.trim() || "Valued Customer";

    const subject = "Verify your email address - Shoe Store";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FBFAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B; }
    .container { max-width: 560px; margin: 30px auto; background: #ffffff; border-radius: 16px; border: 1px solid #E7E3DC; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background-color: #20252B; padding: 28px 32px; text-align: center; }
    .logo { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .content { padding: 36px 32px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 16px; color: #20252B; }
    p { font-size: 14px; line-height: 1.6; color: #667085; margin: 0 0 20px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #748779; color: #ffffff !important; text-decoration: none; padding: 13px 32px; font-size: 14px; font-weight: 600; border-radius: 12px; }
    .btn:hover { background-color: #5E7063; }
    .plain-link { word-break: break-all; font-size: 12px; color: #748779; }
    .notice { font-size: 12px; color: #8F9BB3; border-top: 1px solid #E7E3DC; padding-top: 20px; margin-top: 28px; }
    .footer { background-color: #F7F5F1; padding: 20px 32px; text-align: center; font-size: 12px; color: #8F9BB3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Shoe Store</div>
    </div>
    <div class="content">
      <h1>Verify your email address</h1>
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>Thank you for creating an account with Shoe Store. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>
      <p>This verification link will expire in <strong>60 minutes</strong>.</p>
      <div class="notice">
        <p style="margin-bottom: 8px;">If the button above does not work, copy and paste this link into your browser:</p>
        <p class="plain-link">${verificationUrl}</p>
        <p style="margin-top: 16px; margin-bottom: 0;">If you did not create an account with Shoe Store, please ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Shoe Store. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
Verify your email address - Shoe Store

Hello ${displayName},

Thank you for creating an account with Shoe Store. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 60 minutes.

If you did not create an account with Shoe Store, please ignore this email.
`;

    return this.deliverMail(toEmail, subject, htmlContent, textContent);
  }

  async sendWelcomeEmail(toEmail: string, recipientName: string): Promise<boolean> {
    const shopUrl = `${this.frontendUrl}/shop`;
    const displayName = recipientName?.trim() || "Valued Customer";

    const subject = "Welcome to Shoe Store!";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FBFAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B; }
    .container { max-width: 560px; margin: 30px auto; background: #ffffff; border-radius: 16px; border: 1px solid #E7E3DC; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background-color: #20252B; padding: 28px 32px; text-align: center; }
    .logo { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .content { padding: 36px 32px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 16px; color: #20252B; }
    p { font-size: 14px; line-height: 1.6; color: #667085; margin: 0 0 18px; }
    .feature-list { margin: 20px 0; padding-left: 20px; color: #4A5568; font-size: 13.5px; line-height: 1.8; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #748779; color: #ffffff !important; text-decoration: none; padding: 13px 32px; font-size: 14px; font-weight: 600; border-radius: 12px; }
    .btn:hover { background-color: #5E7063; }
    .footer { background-color: #F7F5F1; padding: 20px 32px; text-align: center; font-size: 12px; color: #8F9BB3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Shoe Store</div>
    </div>
    <div class="content">
      <h1>Welcome to Shoe Store, ${displayName}!</h1>
      <p>Your account is ready. You now have full access to our curated footwear collections, exclusive member features, and fast checkout.</p>
      
      <p><strong>With your new account, you can:</strong></p>
      <ul class="feature-list">
        <li>Browse and shop the latest athletic, casual, and formal styles</li>
        <li>Save your favorite footwear to your personal Wishlist</li>
        <li>Manage saved delivery addresses for 1-click checkout</li>
        <li>Track real-time order and shipment statuses</li>
        <li>Submit verified customer product reviews</li>
      </ul>

      <div class="btn-container">
        <a href="${shopUrl}" class="btn" target="_blank">Start Shopping</a>
      </div>

      <p style="font-size: 13px; color: #8F9BB3; margin-top: 24px;">Need assistance? Simply reply to this email or visit our Help Center anytime.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Shoe Store. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
Welcome to Shoe Store, ${displayName}!

Your account is ready. You now have full access to our footwear collections, order tracking, address book, and wishlist.

Start shopping here:
${shopUrl}

Thank you for choosing Shoe Store!
`;

    return this.deliverMail(toEmail, subject, htmlContent, textContent);
  }

  private async deliverMail(
    toEmail: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      this.logger.log(
        `[SIMULATED EMAIL] To: ${toEmail} | Subject: "${subject}" (RESEND_API_KEY not configured)`,
      );
      return true;
    }

    try {
      // 10-second timeout promise race to prevent hanging indefinitely
      const sendPromise = this.resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject,
        html,
        text,
      });

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((_, reject) =>
        setTimeout(() => reject(new Error("Email delivery request timed out (10s)")), 10000),
      );

      const response = (await Promise.race([sendPromise, timeoutPromise])) as any;

      if (response?.error) {
        this.logger.error(
          `Resend API error delivering to ${toEmail}: ${response.error?.message || "Unknown error"}`,
        );
        return false;
      }

      if (!response?.data?.id) {
        this.logger.error(
          `Resend API response contained no message ID for ${toEmail}: ${JSON.stringify(response)}`,
        );
        return false;
      }

      this.logger.log(
        `Email successfully delivered via Resend to ${toEmail} (ID: ${response.data.id})`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to deliver email via Resend to ${toEmail}: ${error?.message || "Unknown error"}`,
      );
      return false;
    }
  }
}
