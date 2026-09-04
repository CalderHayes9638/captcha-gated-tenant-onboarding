export {};

const response = await fetch("http://localhost:3000/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: "buyer@example.com",
    password: "correct-horse-battery-staple",
    companyName: "Northwind Storefront",
    captchaToken: process.env.CAPTCHA_TOKEN ?? "paste-browser-captcha-token",
    captchaWidgetRecordId: process.env.CAPTCHA_WIDGET_RECORD_ID ?? "paste-widget-record-id",
    captchaVendor: "turnstile"
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
