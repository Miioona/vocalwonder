/** Central API configuration: base URL and endpoint paths. */
export const CONFIG = {
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
    ENDPOINTS: {
      HEALTH: "/health",
      SCORES: "/scores",
      MY_SCORES: "/scores/me",
      MY_PROFILE: "/profile/me",
      NAME_AVAILABLE: "/profile/name-available",
      FRIENDS: "/friends",
    },
  },
} as const;
