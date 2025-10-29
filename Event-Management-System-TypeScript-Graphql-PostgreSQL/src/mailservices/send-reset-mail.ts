import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import config from "../configs/config.ts";

interface HtmlTemplateOptions {
  subject: string;
  content: string;
}

const transporter: Transporter = nodemailer.createTransport({
  host: config.mailService.host || process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(config.mailService.port || process.env.MAIL_PORT || 587),
  secure: false, // use true for port 465
  auth: {
    user: config.mailService.userName || process.env.MAIL_USER,
    pass: config.mailService.passWord || process.env.MAIL_PASSWORD,
  },
});

function getHtmlTemplate({ subject, content }: HtmlTemplateOptions): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"><title>${subject}</title></head>
      <body style="font-family:Arial, sans-serif; background:#f7f7f7; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ccc;">
          <h2 style="color:#345C72; text-align:center;">My App</h2>
          <p style="font-size:16px; line-height:1.6;">${content}</p>
          <p style="font-size:14px; color:#999; text-align:center; margin-top:40px;">
            &copy; ${new Date().getFullYear()} My App. All rights reserved.
          </p>
        </div>
      </body>
    </html>`;
}

export async function sendResetPassword(
  to: string,
  otpForResetPassword: string
): Promise<nodemailer.SentMessageInfo> {
  const subject = "Reset Password OTP";
  const html = getHtmlTemplate({
    subject,
    content: `Your verification OTP is <b>${otpForResetPassword}</b>. It will expire in 10 minutes.`,
  });

  try {
    const info = await transporter.sendMail({
      from: `"My App" <${
        config.mailService.userName || process.env.MAIL_USER
      }>`,
      to,
      subject,
      text: `Your verification OTP is ${otpForResetPassword}`,
      html,
    });

    return info;
  } catch (error: any) {
    console.error("❌ Error sending reset password email:", error.message);
    throw new Error("Email sending failed");
  }
}
