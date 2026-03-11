import type { MenuItem } from "../menu/api";

export type BasketLine = {
  item: MenuItem;
  quantity: number;
};

export function upsertBasketLine(current: BasketLine[], item: MenuItem): BasketLine[] {
  const existing = current.find((line) => line.item.id === item.id);
  if (!existing) {
    return [...current, { item, quantity: 1 }];
  }

  return current.map((line) =>
    line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
  );
}

export function updateLineQuantity(current: BasketLine[], itemId: number, quantity: number): BasketLine[] {
  if (quantity < 1) {
    return current.filter((line) => line.item.id !== itemId);
  }
  return current.map((line) => (line.item.id === itemId ? { ...line, quantity } : line));
}
