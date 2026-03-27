import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type ChoiceCardTone = "primary" | "secondary";

export type ChoiceCardProps = {
  title: string;
  description?: string;
  tone?: ChoiceCardTone;
  onClick: () => void;
  testId?: string;
};

export function ChoiceCard({ title, description, tone = "primary", onClick, testId }: ChoiceCardProps) {
  const isPrimary = tone === "primary";

  return (
    <Card
      sx={{
        minHeight: 220,
        border: "2px solid",
        borderColor: isPrimary ? "primary.main" : "secondary.main",
        background: isPrimary
          ? "linear-gradient(160deg, rgba(143, 45, 31, 0.94), rgba(111, 34, 24, 0.98))"
          : "linear-gradient(180deg, rgba(255, 253, 249, 1), rgba(246, 241, 234, 1))",
        color: isPrimary ? "primary.contrastText" : "text.primary"
      }}
    >
      <CardActionArea
        component="button"
        type="button"
        onClick={onClick}
        data-testid={testId}
        sx={{ height: "100%", borderRadius: "inherit" }}
      >
        <CardContent sx={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center", p: 3.5 }}>
          <Stack spacing={1.25} sx={{ alignItems: "center" }}>
            <Typography variant="h4">{title}</Typography>
            {description ? (
              <Typography color={isPrimary ? "rgba(255, 250, 247, 0.84)" : "text.secondary"}>{description}</Typography>
            ) : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}