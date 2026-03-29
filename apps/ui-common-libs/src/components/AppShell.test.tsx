import { fireEvent, render, screen } from "@testing-library/react";

import { RestaurantUiProvider } from "../providers";
import { AppShell } from "./AppShell";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

function renderShell() {
  return render(
    <RestaurantUiProvider>
      <AppShell navigation={<div>Navigation content</div>}>
        <div>Main content</div>
      </AppShell>
    </RestaurantUiProvider>
  );
}

describe("AppShell navigation layout", () => {
  it("uses side navigation for iPad Air landscape sized viewports", () => {
    setViewport(1180, 820);

    renderShell();

    expect(document.querySelector('[data-navigation-layout="side"]')).not.toBeNull();
    expect(document.querySelector('[data-navigation-layout="top"]')).toBeNull();
    expect(document.querySelector('[data-navigation-layout="overlay"]')).toBeNull();
  });

  it("uses top navigation for tablet portrait sized viewports", () => {
    setViewport(820, 1180);

    renderShell();

    expect(document.querySelector('[data-navigation-layout="side"]')).toBeNull();
    expect(document.querySelector('[data-navigation-layout="top"]')).not.toBeNull();
    expect(document.querySelector('[data-navigation-layout="overlay"]')).toBeNull();
  });

  it("keeps phones in overlay navigation even in landscape", () => {
    setViewport(844, 390);

    renderShell();

    expect(document.querySelector('[data-navigation-layout="side"]')).toBeNull();
    expect(document.querySelector('[data-navigation-layout="top"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Toggle Navigation" }));

    expect(document.querySelector('[data-navigation-layout="overlay"]')).not.toBeNull();
  });
});
