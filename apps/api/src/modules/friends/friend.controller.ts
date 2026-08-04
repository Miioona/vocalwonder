import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiResponse, FriendList, FriendStatus, PlayerSearchResult } from "@vocalwonder/core";
import { REALTIME_EVENTS } from "@vocalwonder/core";

import { emitToUser } from "../../realtime/realtime.js";

import {
  FriendActionError,
  acceptRequest,
  getFriendList,
  getPublicPlayer,
  removeFriendship,
  searchPlayers,
  sendRequest,
} from "./friend.service.js";

const targetSchema = z.object({ userId: z.string().min(1) });

/**
 * Ein Ereignis an den Betroffenen schicken, mit dem Menschen dahinter.
 *
 * Scheitert das Laden des Profils, geht die Anfrage trotzdem durch — der Einblender ist
 * Beiwerk, die Freundschaft ist die Hauptsache.
 */
async function notify(
  recipientId: string,
  actorId: string,
  event: typeof REALTIME_EVENTS.friendRequest | typeof REALTIME_EVENTS.friendAccepted,
): Promise<void> {
  try {
    const player = await getPublicPlayer(actorId);
    if (player) emitToUser(recipientId, event, { player });
  } catch (err) {
    console.error("[friends] Ereignis nicht zugestellt", err);
  }
}

/** In Express 5 ist ein Routenparameter nicht zwingend eine Zeichenkette. */
function paramUserId(params: Record<string, unknown>): string {
  const value = params.userId;
  return typeof value === "string" ? value : "";
}

/** Übersetzt die bewussten Fehlerfälle; alles andere geht an den allgemeinen Fehlerhandler. */
function handle(err: unknown, res: Parameters<RequestHandler>[1], next: () => void): void {
  if (err instanceof FriendActionError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  next();
}

export const getFriends: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const list = await getFriendList(user.id);
    const body: ApiResponse<FriendList> = { success: true, data: list };
    res.json(body);
  } catch (err) {
    next(err);
  }
};

export const getPlayerSearch: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const query = typeof req.query.query === "string" ? req.query.query : "";
    const results = await searchPlayers(user.id, query);

    const body: ApiResponse<PlayerSearchResult[]> = { success: true, data: results };
    res.json(body);
  } catch (err) {
    next(err);
  }
};

export const postRequest: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const parsed = targetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: z.prettifyError(parsed.error) },
      });
      return;
    }

    const status = await sendRequest(user.id, parsed.data.userId);

    // Der andere soll es sofort sehen, ohne die Seite neu zu laden. Aus gegenseitigen
    // Anfragen wird direkt eine Freundschaft — dann ist es das passendere Ereignis.
    await notify(
      parsed.data.userId,
      user.id,
      status === "friends" ? REALTIME_EVENTS.friendAccepted : REALTIME_EVENTS.friendRequest,
    );

    const body: ApiResponse<{ status: FriendStatus }> = { success: true, data: { status } };
    res.status(201).json(body);
  } catch (err) {
    handle(err, res, () => next(err));
  }
};

export const postAccept: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const otherId = paramUserId(req.params);
    const status = await acceptRequest(user.id, otherId);

    // Wer angefragt hatte, wartet auf genau diese Nachricht.
    await notify(otherId, user.id, REALTIME_EVENTS.friendAccepted);

    const body: ApiResponse<{ status: FriendStatus }> = { success: true, data: { status } };
    res.json(body);
  } catch (err) {
    handle(err, res, () => next(err));
  }
};

/** Ablehnen, zurückziehen, entfernen — für den Server dasselbe. */
export const deleteFriendship: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    await removeFriendship(user.id, paramUserId(req.params));
    const body: ApiResponse<{ removed: boolean }> = { success: true, data: { removed: true } };
    res.json(body);
  } catch (err) {
    handle(err, res, () => next(err));
  }
};
