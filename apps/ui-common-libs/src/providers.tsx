import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";

import { CssBaseline, ThemeProvider } from "@mui/material";
import type { PropsWithChildren } from "react";

import { restaurantUiTheme } from "./theme";

export function RestaurantUiProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={restaurantUiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}