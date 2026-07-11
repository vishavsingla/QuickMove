import axios from "axios";
import { env } from "../config/env";

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  if (env.resendApiKey) {
    await axios.post(
      "https://api.resend.com/emails",
      { from: env.emailFrom, to: [to], subject, html },
      {
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }
  console.log(`[EMAIL:stub] to=${to} subject=${subject}`);
  console.log(html);
};

export const sendVerificationEmail = async (to: string, verifyUrl: string) => {
  const html = `<p>Verify your QuickMove email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  await sendEmail(to, "Verify your QuickMove email", html);
};
