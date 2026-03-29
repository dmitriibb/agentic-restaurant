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

type Viewport = {
  width: number;
  height: number;
};

function readViewport(): Viewport {
  if (typeof window === "undefined") {
    return {
      width: DESKTOP_MIN_WIDTH,
      height: 800
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function isLandscapeViewport(viewport: Viewport): boolean {
  return viewport.width >= viewport.height;
}

function hasTabletSizedShortestSide(viewport: Viewport): boolean {
  return Math.min(viewport.width, viewport.height) >= TABLET_MIN_WIDTH;
}

function usesSideNavigation(viewport: Viewport): boolean {
  return viewport.width >= DESKTOP_MIN_WIDTH || (hasTabletSizedShortestSide(viewport) && isLandscapeViewport(viewport));
}

function usesTopNavigation(viewport: Viewport): boolean {
  return viewport.width < DESKTOP_MIN_WIDTH && hasTabletSizedShortestSide(viewport) && !isLandscapeViewport(viewport);
}

export type AppShellProps = PropsWithChildren<{
  appTitle?: string;
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
  headerEyebrow,
  navigationContentClassName,
  children
}: AppShellProps) {
  const [viewport, setViewport] = useState(readViewport);
  const isSideNavigation = usesSideNavigation(viewport);
  const isTopNavigation = usesTopNavigation(viewport);
  const isOverlayNavigation = !isSideNavigation && !isTopNavigation;
  const [navigationOpen, setNavigationOpen] = useState(() => defaultNavigationOpen && usesSideNavigation(readViewport()));
  const navigationContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleResize() {
      setViewport(readViewport());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isSideNavigation) {
      setNavigationOpen(defaultNavigationOpen);
      return;
    }

    setNavigationOpen(false);
  }, [defaultNavigationOpen, isSideNavigation]);

  useEffect(() => {
    if (!isOverlayNavigation || !navigationOpen) {
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
  }, [isOverlayNavigation, navigationOpen]);

  const toggleNavigation = () => {
    setNavigationOpen((value) => !value);
  };

  const permanentRail = isSideNavigation ? (
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
      <Box
        component="nav"
        ref={navigationContentRef}
        className={navigationContentClassName}
        data-navigation-layout="side"
        sx={{ mt: 8, height: "100%" }}
      >
        {navigation}
      </Box>
    </Drawer>
  ) : null;

  const topNavigation = isTopNavigation ? (
    <Collapse in={navigationOpen}>
      <Box
        component="nav"
        ref={navigationContentRef}
        className={navigationContentClassName}
        data-navigation-layout="top"
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
        open={isOverlayNavigation && navigationOpen}
        onClose={() => setNavigationOpen(false)}
        variant="temporary"
        sx={{
          display: isOverlayNavigation ? "block" : "none",
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            padding: 2.5,
            backgroundColor: "background.paper"
          }
        }}
      >
        <Box
          component="nav"
          ref={navigationContentRef}
          className={navigationContentClassName}
          data-navigation-layout="overlay"
          sx={{ mt: 2, height: "100%" }}
        >
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
              {headerEyebrow ? (
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>
                  {headerEyebrow}
                </Typography>
              ) : null}
              {appTitle ? (
                <Typography variant="h6" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {appTitle}
                </Typography>
              ) : null}
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
