/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_FOOTBALL_DATA_API_KEY?: string;
  readonly VITE_API_FOOTBALL_API_KEY?: string;
  readonly VITE_FOOTBALL_DATA_BASE_URL?: string;
  readonly VITE_API_FOOTBALL_BASE_URL?: string;
  readonly VITE_API_FOOTBALL_DAILY_BUDGET?: string;
  readonly VITE_BACKEND_API_BASE_URL?: string;
  readonly VITE_FANTASY_API_BASE_URL?: string;
}
