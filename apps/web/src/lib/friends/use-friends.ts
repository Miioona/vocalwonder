"use client";

import type { FriendList, FriendStatus, PlayerSearchResult } from "@vocalwonder/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api/request-api";
import { useSession } from "@/lib/auth/auth-client";
import { CONFIG } from "@/lib/config/config";
import { QUERY_KEYS } from "@/lib/query-keys";

const FRIENDS_URL = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.FRIENDS}`;

/** Freunde, offene Anfragen an mich und meine eigenen offenen Anfragen. */
export const useFriends = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: [QUERY_KEYS.FRIENDS],
    queryFn: () => requestApi<FriendList>({ url: FRIENDS_URL }),
    enabled: Boolean(session),
  });
};

/** Sucht erst, wenn es etwas zu suchen gibt — zwei Zeichen sind die Untergrenze im Backend. */
export const usePlayerSearch = (query: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.PLAYER_SEARCH, query],
    queryFn: () =>
      requestApi<PlayerSearchResult[]>({
        url: `${FRIENDS_URL}/search?query=${encodeURIComponent(query)}`,
      }),
    enabled: query.trim().length >= 2,
  });

/**
 * Anfragen, annehmen, entfernen.
 *
 * Alle drei ändern dieselben zwei Listen, deshalb ein gemeinsamer Haken: Nach jedem Vorgang
 * werden Freundesliste und Suchergebnis neu geholt, damit die Knöpfe sofort stimmen.
 */
export const useFriendActions = () => {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FRIENDS] });
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLAYER_SEARCH] });
  };

  const request = useMutation({
    mutationFn: (userId: string) =>
      requestApi<{ status: FriendStatus }>({
        url: `${FRIENDS_URL}/requests`,
        method: "post",
        data: { userId },
      }),
    onSuccess: refresh,
  });

  const accept = useMutation({
    mutationFn: (userId: string) =>
      requestApi<{ status: FriendStatus }>({
        url: `${FRIENDS_URL}/${userId}/accept`,
        method: "post",
      }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (userId: string) =>
      requestApi<{ removed: boolean }>({ url: `${FRIENDS_URL}/${userId}`, method: "delete" }),
    onSuccess: refresh,
  });

  return { request, accept, remove };
};
