"use client";

import type { SongScore } from "@vocalwonder/core";
import { useQuery } from "@tanstack/react-query";

import { requestApi } from "@/lib/api/request-api";
import { useSession } from "@/lib/auth/auth-client";
import { CONFIG } from "@/lib/config/config";
import { QUERY_KEYS } from "@/lib/query-keys";

/** Die letzten eigenen Ergebnisse. Ohne Anmeldung wird gar nicht erst gefragt. */
export const useMyScores = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: [QUERY_KEYS.MY_SCORES],
    queryFn: () =>
      requestApi<SongScore[]>({
        url: `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MY_SCORES}`,
      }),
    enabled: Boolean(session),
  });
};
