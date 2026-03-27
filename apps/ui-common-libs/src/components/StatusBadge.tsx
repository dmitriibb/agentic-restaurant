import Chip from "@mui/material/Chip";

export type StatusBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

const colorByTone: Record<StatusBadgeTone, "default" | "info" | "success" | "warning" | "error"> = {
  neutral: "default",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error"
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <Chip color={colorByTone[tone]} label={label} variant={tone === "neutral" ? "outlined" : "filled"} />;
}