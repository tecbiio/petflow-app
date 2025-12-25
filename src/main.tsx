import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "./lib/queryClient";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ToastProvider";
import { AuthProvider } from "./components/AuthProvider";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const root = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
