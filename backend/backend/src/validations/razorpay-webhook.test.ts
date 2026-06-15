import { createHmac } from "crypto";

describe("Module 1: Razorpay webhook verification", () => {
  const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.resetModules();
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  });

  afterAll(() => {
    if (previousSecret === undefined) {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    } else {
      process.env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
    }
  });

  it("validates the signature against the exact raw request bytes", async () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        event: "subscription.activated",
        payload: { subscription: { entity: { id: "sub_test" } } },
      }),
    );
    const signature = createHmac("sha256", "test-webhook-secret")
      .update(rawBody)
      .digest("hex");
    const { billingService } = await import("../services/billing.service");
    expect(billingService.verifyWebhookSignature(rawBody, signature)).toBe(
      true,
    );
    expect(
      billingService.verifyWebhookSignature(
        Buffer.from(`${rawBody.toString("utf8")} `),
        signature,
      ),
    ).toBe(false);
  });
});
