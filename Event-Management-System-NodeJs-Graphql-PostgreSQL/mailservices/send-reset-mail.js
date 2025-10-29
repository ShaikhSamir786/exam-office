const nodemailer = require("nodemailer");
const config = require("../configs/config");

const transporter = nodemailer.createTransport({
  host: config.mailService.host || "smtp.gmail.com",
  port: config.mailService.port || 587,
  secure: false, // true for port 465
  auth: {
    user: config.mailService.userName || "samirshaikh.lwt@gmail.com",
    pass: config.mailService.passWord || "tjqksckexlxegxzw", // app password
  },
});

// HTML template for reset password OTP
function getHtmlTemplate({ subject, content }) {
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

// Send Reset Password OTP
async function sendResetPassword(to, otpforresetpassword) {
  const subject = "Reset Password OTP";
  const html = getHtmlTemplate({
    subject,
    content: `Your verification OTP is <b>${otpforresetpassword}</b>. It will expire in 10 minutes.`,
  });

  try {
    const info = await transporter.sendMail({
      from: `"My App" <${config.mailService.userName}>`, // must match auth user
      to,
      subject,
      text: `Your verification OTP is ${otpforresetpassword}`,
      html,
    });
    return info;
  } catch (error) {
    console.error("❌ Error sending reset password email:", error.message);
    throw new Error("Email sending failed");
  }
}

module.exports = sendResetPassword;
