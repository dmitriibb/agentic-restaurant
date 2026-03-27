import { render, screen } from "@testing-library/react";

import { ActionButton, InfoCard, RestaurantUiProvider, StatusBadge } from "./index";

describe("ui-common-libs", () => {
  it("renders shared primitives inside the provider", () => {
    render(
      <RestaurantUiProvider>
        <InfoCard title="Kitchen overview" description="Shared cards should use the same typography.">
          <StatusBadge label="Ready" tone="success" />
          <ActionButton>Refresh board</ActionButton>
        </InfoCard>
      </RestaurantUiProvider>
    );

    expect(screen.getByText("Kitchen overview")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh board" })).toBeInTheDocument();
  });
});