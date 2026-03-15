import { serviceBaseUrls } from "../../shared/api/config";
import type { ProductionOrder, OrderDetail, CommandResponse, ItemCommand } from "./types";

export async function fetchOrders(token: string, status?: string): Promise<ProductionOrder[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  params.set("limit", "200");

  const response = await fetch(
    `${serviceBaseUrls.productionService}/api/v1/production/orders?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load production orders.");
  }

  return (await response.json()) as ProductionOrder[];
}

export async function fetchOrderDetail(token: string, orderId: number): Promise<OrderDetail> {
  const response = await fetch(
    `${serviceBaseUrls.productionService}/api/v1/production/orders/${orderId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load order detail.");
  }

  return (await response.json()) as OrderDetail;
}

export async function sendItemCommand(
  token: string,
  itemId: string,
  command: ItemCommand,
  options?: { expectedVersion?: number; reason?: string }
): Promise<CommandResponse> {
  const body: Record<string, unknown> = {};
  if (options?.expectedVersion !== undefined) {
    body.expectedVersion = options.expectedVersion;
  }
  if (options?.reason) {
    body.reason = options.reason;
  }

  const response = await fetch(
    `${serviceBaseUrls.productionService}/api/v1/production/items/${itemId}/${command}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );

  if (response.status === 409) {
    const error = await response.json();
    throw new Error(error.error ?? "Conflict: item was modified or transition is invalid.");
  }

  if (response.status === 404) {
    throw new Error("Item not found.");
  }

  if (!response.ok) {
    throw new Error("Command failed.");
  }

  return (await response.json()) as CommandResponse;
}
