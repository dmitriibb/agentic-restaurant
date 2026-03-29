import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type AppNavigationMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

export type AppNavigationMenuProps = {
  items: AppNavigationMenuItem[];
  footer?: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
};

export function AppNavigationMenu({
  items,
  footer,
  className,
  title,
  subtitle
}: AppNavigationMenuProps) {
  return (
    <Stack className={className} sx={{ height: "100%", gap: 2, minHeight: 0 }}>
      {title || subtitle ? (
        <Stack spacing={0.5}>
          {subtitle ? (
            <Typography variant="overline" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
          {title ? <Typography variant="h6">{title}</Typography> : null}
        </Stack>
      ) : null}

      <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 0.75, flex: 1, justifyContent: "flex-start" }}>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            selected={item.active}
            onClick={item.onClick}
            disabled={item.disabled}
            sx={{
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: item.active ? "primary.light" : "divider",
              backgroundColor: item.active ? "rgba(143, 45, 31, 0.08)" : "transparent",
              flex: "0 0 auto",
              flexGrow: 0,
              minHeight: 48,
              maxHeight: 48,
              px: 1.5,
              py: 0.75,
              alignItems: "center"
            }}
          >
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontWeight: item.active ? 700 : 600, fontSize: "0.95rem" }}
            />
          </ListItemButton>
        ))}
      </List>

      {footer ? (
        <>
          <Divider />
          <Stack spacing={1.25} sx={{ mt: "auto", pb: 0.5 }}>{footer}</Stack>
        </>
      ) : null}
    </Stack>
  );
}
