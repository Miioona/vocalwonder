import type { SongScore, SongScoreInput } from "@vocalwonder/core";

import { requestApi } from "@/lib/api/request-api";
import { CONFIG } from "@/lib/config/config";

/**
 * Schickt ein gespieltes Ergebnis ans Backend. Ohne Anmeldung antwortet der Server mit 401 —
 * das ist kein Fehler, sondern der Normalfall für alle, die kein Konto wollen.
 */
export async function saveScore(input: SongScoreInput): Promise<SongScore> {
  return requestApi<SongScore>({
    url: `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.SCORES}`,
    method: "post",
    data: input,
  });
}
