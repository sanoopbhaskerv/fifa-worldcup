import type { FootballDataProvider } from "./football-provider";
import { ApiFootballDataProvider } from "./api-football-provider";
import { HybridFootballDataProvider } from "./hybrid-football-provider";
import { MockFootballDataProvider } from "./mock-football-provider";
import {
  hasStaticLiveKeys,
  StaticLiveFootballDataProvider,
} from "./static-live-football-provider";

export const footballProvider: FootballDataProvider = new HybridFootballDataProvider(
  hasStaticLiveKeys
    ? new StaticLiveFootballDataProvider()
    : new ApiFootballDataProvider(),
  new MockFootballDataProvider(),
);
