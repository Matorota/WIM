import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RTSApp from "./RTSApp.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RTSApp />
  </StrictMode>
);
