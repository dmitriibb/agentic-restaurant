import { createTheme } from "@mui/material/styles";

export const restaurantUiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#8f2d1f",
      dark: "#6f2218",
      light: "#b85a47",
      contrastText: "#fffaf7"
    },
    secondary: {
      main: "#c98b2c",
      dark: "#9d6c22",
      light: "#e0af5c",
      contrastText: "#2a211d"
    },
    success: {
      main: "#4f6f52"
    },
    warning: {
      main: "#bc6c25"
    },
    error: {
      main: "#b3261e"
    },
    info: {
      main: "#415a77"
    },
    background: {
      default: "#f6f1ea",
      paper: "#fffdf9"
    },
    text: {
      primary: "#2f241f",
      secondary: "#63534b"
    },
    divider: "#e5d8ca"
  },
  shape: {
    borderRadius: 18
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: {
      fontSize: "2.6rem",
      fontWeight: 700,
      lineHeight: 1.05
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      lineHeight: 1.1
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 700,
      lineHeight: 1.2
    },
    button: {
      fontWeight: 700,
      letterSpacing: "0.02em",
      textTransform: "none"
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          "--app-content-gap": "1rem",
          "--app-content-gap-compact": "0.75rem",
          "--app-section-gap": "0.75rem",
          "--app-stack-gap": "2rem",
          "--app-toolbar-gap": "1rem",
          "--app-control-gap": "0.75rem",
          "--app-grid-gap": "1rem",
          "--app-card-padding": "1rem",
          "--app-card-padding-compact": "0.85rem",
          "--app-card-radius": "18px",
          "--app-card-radius-tight": "16px",
          "--app-card-border": "#e5d8ca",
          "--app-card-surface": "#fffdf9",
          "--app-card-surface-alt": "#fffaf5",
          "--app-success-surface": "#eff7f1",
          "--app-success-border": "#d4e6d6",
          "--app-max-entry-width": "760px",
          "--app-max-detail-width": "520px"
        },
        body: {
          background: "radial-gradient(circle at top, rgba(201, 139, 44, 0.14), transparent 32%), #f6f1ea"
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "linear-gradient(135deg, #fffdf9 0%, #f5ece1 100%)",
          color: "#2f241f",
          boxShadow: "0 12px 32px rgba(47, 36, 31, 0.08)",
          borderBottom: "1px solid #eadfce"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #eadfce",
          boxShadow: "0 16px 40px rgba(47, 36, 31, 0.08)"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: "large"
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: "1.1rem"
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: "medium",
        variant: "outlined"
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700
        }
      }
    }
  }
});
