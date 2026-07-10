export type PaymentGatewayMode = "razorpay" | "mock";

export const paymentModeLabel = (mode: PaymentGatewayMode): string =>
  mode === "mock" ? "Test mode (mock)" : "Razorpay test checkout";

export const paymentModeShortLabel = (mode: PaymentGatewayMode): string =>
  mode === "mock" ? "Mock" : "Razorpay test";

export const paymentModeDescription = (mode: PaymentGatewayMode): string =>
  mode === "mock"
    ? "Built-in mock checkout — no Razorpay account or keys needed. Click “Pay successfully” to simulate payment."
    : "Real Razorpay test checkout (checkout.razorpay.com). Use test cards/UPI — no real money moves in test mode.";
