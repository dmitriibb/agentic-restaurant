import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PropsWithChildren, ReactNode } from "react";

export type InfoCardProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>;

export function InfoCard({ eyebrow, title, description, actions, children }: InfoCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.25}>
          {eyebrow ? (
            <Typography variant="overline" color="text.secondary">
              {eyebrow}
            </Typography>
          ) : null}
          <Typography variant="h5">{title}</Typography>
          {description ? <Typography color="text.secondary">{description}</Typography> : null}
          {children}
        </Stack>
      </CardContent>
      {actions ? <CardActions sx={{ px: 2, pb: 2 }}>{actions}</CardActions> : null}
    </Card>
  );
}