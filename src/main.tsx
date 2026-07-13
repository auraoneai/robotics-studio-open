import React from "react";
import { createRoot } from "react-dom/client";
import { installOfficialStyleSheet } from "@auraone/aura-ide-kit";
import "@auraone/aura-ide-kit/styles.css";
import App from "./App";
import "./styles.css";

installOfficialStyleSheet(import.meta.env.VITE_AURAONE_OFFICIAL_STYLE_URL);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Robotics Studio Open root element is missing.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
