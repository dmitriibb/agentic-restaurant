import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export type TextSizeValue = 1 | 2 | 3;

export type TextSizeControlProps = {
  value: TextSizeValue;
  onChange: (value: TextSizeValue) => void;
  label?: string;
  testId?: string;
};

export function TextSizeControl({ value, onChange, label = "Text size", testId }: TextSizeControlProps) {
  return (
    <Stack spacing={0.75} data-testid={testId}>
      <Typography color="text.secondary">{label}</Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={String(value)}
        onChange={(_, nextValue) => {
          if (nextValue === "1" || nextValue === "2" || nextValue === "3") {
            onChange(Number(nextValue) as TextSizeValue);
          }
        }}
      >
        <ToggleButton value="1" aria-label="Set text size A">
          A
        </ToggleButton>
        <ToggleButton value="2" aria-label="Set text size A+">
          A+
        </ToggleButton>
        <ToggleButton value="3" aria-label="Set text size A++">
          A++
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}