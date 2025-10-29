import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import config from "../configs/config.ts";

interface HtmlTemplateOptions {
  subject: string;
  content: string;
}

const transporter: Transporter = nodemailer.createTransport({
  host: config.mailService.host || "smtp.gmail.com",
  port: Number(config.mailService.port) || 587,
  secure: false, // true for port 465, false for others
  auth: {
    user: config.mailService.userName,
    pass: config.mailService.passWord,
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
    </html>
  `;
}

export async function sendVerificationEmail(
  to: string,
  otp: string
): Promise<nodemailer.SentMessageInfo> {
  const subject = "Verify your email";
  const html = getHtmlTemplate({
    subject,
    content: `Your verification OTP is <b>${otp}</b>. It will expire in 10 minutes.`,
  });

  const info = await transporter.sendMail({
    from: `"My App" <${config.mailService.userName}>`,
    to,
    subject,
    text: `Your verification OTP is ${otp}`,
    html,
  });

  return info;
}
