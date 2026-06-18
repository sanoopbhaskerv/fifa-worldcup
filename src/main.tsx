import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { ThemeProvider } from "./app/theme-context";
import "./styles/tokens.css";
import "./styles/themes.css";
import "./styles/football.css";
import "./styles/home.css";
import "./styles/fantasy.css";
import "./styles/global.css";

/**
 * Shared TanStack Query client configured for app-wide offline-friendly reads.
 *
 * @remarks This client disables window-focus refetches because the football
 * provider hooks control their own polling cadence.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, networkMode: "offlineFirst" },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
