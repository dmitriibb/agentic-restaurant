import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { RestaurantUiProvider } from "@agentic-restaurant/ui-common-libs";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RestaurantUiProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RestaurantUiProvider>
  </React.StrictMode>
);
