import { Resend } from 'resend';

export interface EmailVerificationData {
  email: string;
  username: string;
  code: string;
}

export class EmailService {
  private static resend: Resend | null = null;
  private static readonly FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@planara.org';
  private static readonly SUBJECT = 'Verify your Planara account';

  private static getClient(): Resend {
    if (!EmailService.resend) {
      const key = process.env.RESEND_API_KEY;
      if (!key) throw new Error('RESEND_API_KEY not configured');
      EmailService.resend = new Resend(key);
    }
    return EmailService.resend;
  }

  static async sendVerificationCode(data: EmailVerificationData): Promise<void> {
    // Development fallback: if no RESEND_API_KEY, simulate send instead of failing
    if (!process.env.RESEND_API_KEY) {
      console.warn('[DEV] RESEND_API_KEY not set. Simulating verification email send', {
        to: data.email,
        username: data.username,
        code: data.code,
      });
      return;
    }

    const htmlTemplate = this.getVerificationEmailTemplate(data);

    try {
      await this.getClient().emails.send({
        from: this.FROM_EMAIL,
        to: data.email,
        subject: this.SUBJECT,
        html: htmlTemplate,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  private static getVerificationEmailTemplate(data: EmailVerificationData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Planara Account</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 16px;
        }
        .greeting {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 16px;
        }
        .code-container {
            background: #f1f5f9;
            border: 2px dashed #94a3b8;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .code-label {
            font-size: 14px;
            color: #6b7280;
        }
        .instructions {
            font-size: 16px;
            color: #374151;
            margin-bottom: 16px;
        }
        .warning {
            background: #fff7ed;
            border: 1px solid #fdba74;
            border-radius: 12px;
            padding: 16px;
            margin-top: 16px;
        }
        .warning-text {
            color: #9a3412;
            font-size: 14px;
        }
        .footer {
            margin-top: 24px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .link {
            color: #3b82f6;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Planara</div>
            <div class="title">Verify Your Email</div>
        </div>

        <p class="greeting">
            Hi ${data.username},
        </p>
        <p class="instructions">
            please verify your email address using the code below:
        </p>

        <div class="code-container">
            <div class="code">${data.code}</div>
            <div class="code-label">Your 6-digit verification code</div>
        </div>

        <p class="instructions">
            Enter this code in the verification form to activate your account. 
            This code will expire in <strong>10 minutes</strong> for security reasons.
        </p>

        <div class="warning">
            <p class="warning-text">
                <strong>Security Notice:</strong> If you didn't create a Planara account, 
                please ignore this email. Your email address will not be used without verification.
            </p>
        </div>

        <div class="footer">
            <p>
                Need help? Contact us at 
                <a href="mailto:hello@planara.org" class="link">hello@planara.org</a>
            </p>
            <p>© 2025 Planara. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }
}
