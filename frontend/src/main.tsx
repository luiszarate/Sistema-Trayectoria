import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CarreraProvider } from "./context/CarreraContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CarreraProvider>
        <App />
      </CarreraProvider>
    </BrowserRouter>
  </React.StrictMode>
);
