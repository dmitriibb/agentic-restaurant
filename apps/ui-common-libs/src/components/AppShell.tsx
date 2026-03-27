import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
  AppBar,
  Box,
  Collapse,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";

const DRAWER_WIDTH = 280;
const TABLET_MIN_WIDTH = 600;
const DESKTOP_MIN_WIDTH = 1200;

function readViewportWidth(): number {
  if (typeof window === "undefined") {
    return DESKTOP_MIN_WIDTH;
  }

  return window.innerWidth;
}

export type AppShellProps = PropsWithChildren<{
  appTitle: string;
  navigation: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  defaultNavigationOpen?: boolean;
  headerEyebrow?: string;
  navigationContentClassName?: string;
}>;

export function AppShell({
  appTitle,
  navigation,
  headerActions,
  footer,
  defaultNavigationOpen = true,
  headerEyebrow = "Agentic Restaurant",
  navigationContentClassName,
  children
}: AppShellProps) {
  const [viewportWidth, setViewportWidth] = useState(readViewportWidth);
  const isDesktop = viewportWidth >= DESKTOP_MIN_WIDTH;
  const isTablet = viewportWidth >= TABLET_MIN_WIDTH && viewportWidth < DESKTOP_MIN_WIDTH;
  const [navigationOpen, setNavigationOpen] = useState(() => defaultNavigationOpen && readViewportWidth() >= DESKTOP_MIN_WIDTH);
  const navigationContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(readViewportWidth());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setNavigationOpen(defaultNavigationOpen);
      return;
    }

    setNavigationOpen(false);
  }, [defaultNavigationOpen, isDesktop, isTablet]);

  useEffect(() => {
    if (isDesktop || isTablet || !navigationOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('[data-shared-nav-toggle="true"]')) {
        return;
      }

      if (navigationContentRef.current?.contains(target)) {
        return;
      }

      setNavigationOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDesktop, isTablet, navigationOpen]);

  const toggleNavigation = () => {
    setNavigationOpen((value) => !value);
  };

  const permanentRail = isDesktop ? (
    <Drawer
      open={navigationOpen}
      variant="persistent"
      sx={{
        width: navigationOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          padding: 2.5
        }
      }}
    >
      <Box component="nav" ref={navigationContentRef} className={navigationContentClassName} sx={{ mt: 8, height: "100%" }}>
        {navigation}
      </Box>
    </Drawer>
  ) : null;

  const topNavigation = isTablet ? (
    <Collapse in={navigationOpen}>
      <Box
        component="nav"
        ref={navigationContentRef}
        className={navigationContentClassName}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          px: 2,
          py: 2
        }}
      >
        {navigation}
      </Box>
    </Collapse>
  ) : null;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", backgroundColor: "background.default" }}>
      {permanentRail}
      <Drawer
        open={!isDesktop && !isTablet && navigationOpen}
        onClose={() => setNavigationOpen(false)}
        variant="temporary"
        sx={{
          display: isDesktop || isTablet ? "none" : "block",
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            padding: 2.5,
            backgroundColor: "background.paper"
          }
        }}
      >
        <Box component="nav" ref={navigationContentRef} className={navigationContentClassName} sx={{ mt: 2, height: "100%" }}>
          {navigation}
        </Box>
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 2.5, minHeight: 76 }}>
            <IconButton
              aria-label="Toggle Navigation"
              color="inherit"
              edge="start"
              onClick={toggleNavigation}
              data-shared-nav-toggle="true"
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>
                {headerEyebrow}
              </Typography>
              <Typography variant="h6" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {appTitle}
              </Typography>
            </Box>
            {headerActions ? <Stack direction="row" spacing={1.25}>{headerActions}</Stack> : null}
          </Toolbar>
        </AppBar>

        {topNavigation}

        <Box
          component="main"
          sx={{
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2, sm: 3 },
            display: "grid",
            gap: 3
          }}
        >
          {children}
        </Box>

        {footer ? (
          <Box component="footer" sx={{ px: { xs: 2, sm: 3, lg: 4 }, pb: 3 }}>
            {footer}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}