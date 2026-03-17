export type ItemStatusCounts = {
  Queued: number;
  InProgress: number;
  Blocked: number;
  Ready: number;
};

export type ProductionOrder = {
  OrderID: number;
  ExternalRequestID: string;
  UserID: number;
  UserDisplayName: string | null;
  Status: string;
  TotalItemCount: number;
  ItemStatusCounts: ItemStatusCounts;
  CreatedAt: string;
  UpdatedAt: string;
  ReadyAt: string | null;
  Version: number;
};

export type DisplayOrder = {
  OrderID: number;
  Status: string;
  TotalItemCount: number;
  ItemStatusCounts: ItemStatusCounts;
  CreatedAt: string;
  UpdatedAt: string;
};

export type ProductionItem = {
  ID: string;
  OrderID: number;
  LineNumber: number;
  UnitSequence: number;
  SourceItemKey: string;
  MenuItemID: number;
  MenuItemName: string;
  StationKey: string;
  Status: string;
  ClaimedByUserID: number | null;
  ClaimedByDisplayName: string | null;
  BlockedReason: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  ClaimedAt: string | null;
  ReadyAt: string | null;
  Version: number;
};

export type OrderDetail = {
  order: ProductionOrder;
  items: ProductionItem[];
};

export type CommandResponse = {
  itemId: string;
  orderId: number;
  status: string;
  command: string;
  executedBy: string;
};

export type ItemCommand = "pickup" | "block" | "resume" | "ready";

export const STATUS_QUEUED = "QUEUED";
export const STATUS_IN_PROGRESS = "IN_PROGRESS";
export const STATUS_BLOCKED = "BLOCKED";
export const STATUS_READY = "READY";
export const STATUS_CANCELLED = "CANCELLED";
