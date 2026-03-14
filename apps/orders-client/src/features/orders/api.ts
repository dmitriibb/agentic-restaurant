import type { BasketLine } from "../basket/model";
import { serviceBaseUrls } from "../../shared/api/config";

export type OrderSubmitResponse = {
  orderId: number;
  requestId: string;
  status: string;
  totalAmount: number;
  userDisplayName?: string;
};

export async function submitOrder(token: string, userId: number, lines: BasketLine[]): Promise<OrderSubmitResponse> {
  const requestId = createRequestId();
  const response = await fetch(`${serviceBaseUrls.ordersService}/api/v1/orders/${requestId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId,
      items: lines.map((line) => ({ itemId: line.item.id, quantity: line.quantity }))
    })
  });

  if (!response.ok) {
    throw new Error("Order submission failed.");
  }

  return (await response.json()) as OrderSubmitResponse;
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
