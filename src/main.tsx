import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { waitForRootNode } from "rzr-connector";

waitForRootNode("root").then((root) =>
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);
