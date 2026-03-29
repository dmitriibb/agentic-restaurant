import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { QRCodeSVG } from "qrcode.react";

export type LocalNetworkQrCodeProps = {
  hidden?: boolean;
  localIp?: string;
  label?: string;
};

function resolveDisplayHost(localIp?: string): string {
  if (typeof window === "undefined") {
    return localIp?.trim() ?? "";
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (!isLocalhost) {
    return hostname;
  }

  return localIp?.trim() ?? "";
}

function buildDisplayUrl(host: string): string {
  if (!host || typeof window === "undefined") {
    return "";
  }

  return `${window.location.protocol}//${host}${window.location.port ? `:${window.location.port}` : ""}`;
}

export function LocalNetworkQrCode({
  hidden = false,
  localIp,
  label = "Open the app via local network"
}: LocalNetworkQrCodeProps) {
  if (hidden) {
    return null;
  }

  const displayHost = resolveDisplayHost(localIp);
  const displayUrl = buildDisplayUrl(displayHost);

  if (!displayUrl) {
    return (
      <Typography variant="body2" color="text.secondary">
        ip address is not set - can't display QR code
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25} sx={{ alignItems: "center", justifySelf: "center", width: "fit-content", mx: "auto" }}>
      <Box
        sx={{
          display: "inline-flex",
          backgroundColor: "#ffffff",
          p: 1.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider"
        }}
      >
        <QRCodeSVG value={displayUrl} size={156} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "center" }}>
        {label}
      </Typography>
    </Stack>
  );
}
