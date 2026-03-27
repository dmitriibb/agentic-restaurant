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
  title = "Workspace",
  subtitle = "Shared navigation"
}: AppNavigationMenuProps) {
  return (
    <Stack className={className} sx={{ height: "100%", gap: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {subtitle}
        </Typography>
        <Typography variant="h6">{title}</Typography>
      </Stack>

      <List sx={{ p: 0, display: "grid", gap: 0.5, flex: 1 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            selected={item.active}
            onClick={item.onClick}
            disabled={item.disabled}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: item.active ? "primary.light" : "divider",
              backgroundColor: item.active ? "rgba(143, 45, 31, 0.08)" : "transparent"
            }}
          >
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontWeight: item.active ? 700 : 600 }}
            />
          </ListItemButton>
        ))}
      </List>

      {footer ? (
        <>
          <Divider />
          <Stack spacing={1.25}>{footer}</Stack>
        </>
      ) : null}
    </Stack>
  );
}