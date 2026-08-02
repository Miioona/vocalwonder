"use client";

import type { PlayerProfile } from "@vocalwonder/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api/request-api";
import { useSession } from "@/lib/auth/auth-client";
import { CONFIG } from "@/lib/config/config";
import { QUERY_KEYS } from "@/lib/query-keys";

const PROFILE_URL = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MY_PROFILE}`;

/** Das eigene Profil. `null` heißt: angemeldet, aber noch kein Spielername gesetzt. */
export const useMyProfile = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: [QUERY_KEYS.MY_PROFILE],
    queryFn: () => requestApi<PlayerProfile | null>({ url: PROFILE_URL }),
    enabled: Boolean(session),
  });
};

/**
 * Prüft einen Namen auf Verfügbarkeit — beim Verlassen des Feldes, nicht bei jedem Zeichen.
 * Verbindlich ist erst das Speichern: Zwischen Prüfung und Speichern kann ihn jemand nehmen.
 */
export const checkPlayerName = (playerName: string): Promise<{ available: boolean }> =>
  requestApi<{ available: boolean }>({
    url: `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.NAME_AVAILABLE}?name=${encodeURIComponent(playerName)}`,
  });

export const useSetPlayerName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerName: string) =>
      requestApi<PlayerProfile>({ url: PROFILE_URL, method: "put", data: { playerName } }),
    onSuccess: (profile) => {
      queryClient.setQueryData([QUERY_KEYS.MY_PROFILE], profile);
    },
  });
};
