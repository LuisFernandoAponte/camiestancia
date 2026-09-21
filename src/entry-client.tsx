import ReactDOM from "react-dom/client";
import { StartClient } from "@tanstack/react-start";
import { getRouter } from "./router";

const router = getRouter();

ReactDOM.hydrateRoot(
  document.getElementById("root")!,
  <StartClient router={router} />
);
