const OTP_EXPIRY_MINUTES = 10;

exports.sendOtpSms = async ({ phone, otp }) => {
  const message = `Your OTP for admin password reset is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
  const provider = String(process.env.SMS_PROVIDER || "custom").toLowerCase();
  const apiUrl = process.env.SMS_API_URL;
  const apiToken = process.env.SMS_API_TOKEN;

  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !from) {
      throw new Error("Twilio SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER");
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: `+91${phone}`,
      From: from,
      Body: message,
    });

    const encodedCreds = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCreds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Twilio SMS send failed");
    }

    return { mocked: false, provider: "twilio" };
  }

  if (!apiUrl) {
    console.log(`[OTP SMS MOCK] ${phone}: ${message}`);
    return { mocked: true };
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
    },
    body: JSON.stringify({ phone, message, otp }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to send OTP SMS");
  }

  return { mocked: false, provider: "custom" };
};

exports.OTP_EXPIRY_MINUTES = OTP_EXPIRY_MINUTES;
