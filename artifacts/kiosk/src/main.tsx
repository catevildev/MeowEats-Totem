import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { getApiBaseUrl } from "./lib/api-config";
import "./index.css";

const apiBase = getApiBaseUrl();
if (apiBase) {
  setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);
