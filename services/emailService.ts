import { Resend } from 'resend';

export interface EmailVerificationData {
  email: string;
  username: string;
  code: string;
}

export class EmailService {
  private static resend = new Resend(process.env.RESEND_API_KEY);
  private static readonly FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@planara.org';
  private static readonly SUBJECT = 'Verify your Planara account';

  static async sendVerificationCode(data: EmailVerificationData): Promise<void> {
    const htmlTemplate = this.getVerificationEmailTemplate(data);

    try {
      await this.resend.emails.send({
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
            color: #6b7280;
            margin-bottom: 24px;
        }
        .code-container {
            background: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #3b82f6;
            font-family: 'Courier New', monospace;
        }
        .code-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 8px;
        }
        .instructions {
            font-size: 16px;
            color: #4b5563;
            margin: 24px 0;
        }
        .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .warning-text {
            font-size: 14px;
            color: #92400e;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
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
            <h1 class="title">Verify Your Email Address</h1>
            <p class="greeting">Hi ${data.username},</p>
        </div>

        <p class="instructions">
            Welcome to Planara! To complete your account setup and start managing your projects, 
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