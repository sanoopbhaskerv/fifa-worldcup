import type { FootballDataProvider } from "./football-provider";
import { ApiFootballDataProvider, backendApiBaseUrl } from "./api-football-provider";
import { HybridFootballDataProvider } from "./hybrid-football-provider";
import { MockFootballDataProvider } from "./mock-football-provider";
import {
  hasStaticLiveKeys,
  StaticLiveFootballDataProvider,
} from "./static-live-football-provider";

/** App-wide provider instance with live/static-live first and mock fallback second. */
export const footballProvider: FootballDataProvider = new HybridFootballDataProvider(
  hasStaticLiveKeys && !backendApiBaseUrl
    ? new StaticLiveFootballDataProvider()
    : new ApiFootballDataProvider(),
  new MockFootballDataProvider(),
);
