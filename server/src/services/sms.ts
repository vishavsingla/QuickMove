import axios from "axios";
import { env } from "../config/env";

export const sendSms = async (to: string, body: string): Promise<void> => {
  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
    const auth = Buffer.from(
      `${env.twilioAccountSid}:${env.twilioAuthToken}`
    ).toString("base64");
    await axios.post(
      url,
      new URLSearchParams({ To: to, From: env.twilioFromNumber, Body: body }).toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return;
  }
  console.log(`[SMS:stub] to=${to} body=${body}`);
};
