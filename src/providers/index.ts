import type { FootballDataProvider } from "./football-provider";
import { ApiFootballDataProvider, backendApiBaseUrl } from "./api-football-provider";
import {
  hasStaticLiveKeys,
  StaticLiveFootballDataProvider,
} from "./static-live-football-provider";

/** App-wide provider instance. Provider errors surface to the UI with retry actions. */
export const footballProvider: FootballDataProvider = hasStaticLiveKeys && !backendApiBaseUrl
  ? new StaticLiveFootballDataProvider()
  : new ApiFootballDataProvider();
