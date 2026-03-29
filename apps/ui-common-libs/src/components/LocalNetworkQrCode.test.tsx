import { render, screen } from "@testing-library/react";

import { RestaurantUiProvider } from "../providers";
import { LocalNetworkQrCode } from "./LocalNetworkQrCode";

function renderQr(props?: Partial<React.ComponentProps<typeof LocalNetworkQrCode>>) {
  return render(
    <RestaurantUiProvider>
      <LocalNetworkQrCode {...props} />
    </RestaurantUiProvider>
  );
}

describe("LocalNetworkQrCode", () => {
  it("renders a QR code when a local IP is configured on localhost", () => {
    const { container } = renderQr({ localIp: "192.168.1.100" });

    expect(screen.getByText("Open the app via local network")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a compact fallback message when no local IP is configured on localhost", () => {
    const { container } = renderQr();

    expect(screen.getByText("ip address is not set - can't display QR code")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders nothing when hidden", () => {
    const { container } = renderQr({ hidden: true, localIp: "192.168.1.100" });

    expect(container).toBeEmptyDOMElement();
  });
});
