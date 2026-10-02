import type { CreatePaymentInput, PaymentProvider, PaymentResult } from "./provider";

/**
 * Demo only: no network calls, no API keys, no card data. Card format was already validated in
 * the browser, so every well-formed request succeeds.
 */
export class DemoPaymentProvider implements PaymentProvider {
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const valid = Number.isSafeInteger(input.amountCents) && input.amountCents > 0 && input.currency === "EUR";
    return {
      id: crypto.randomUUID(),
      status: valid ? "SUCCEEDED" : "FAILED",
      provider: "DEMO",
      amountCents: input.amountCents,
      currency: input.currency,
    };
  }
}
