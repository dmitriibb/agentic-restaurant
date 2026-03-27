import Button, { type ButtonProps } from "@mui/material/Button";

export type ActionButtonTone = "primary" | "secondary" | "neutral";

export type ActionButtonProps = ButtonProps & {
  tone?: ActionButtonTone;
};

const toneByVariant: Record<ActionButtonTone, ButtonProps["color"]> = {
  primary: "primary",
  secondary: "secondary",
  neutral: "inherit"
};

export function ActionButton({ tone = "primary", variant = "contained", ...props }: ActionButtonProps) {
  return <Button color={toneByVariant[tone]} variant={variant} {...props} />;
}