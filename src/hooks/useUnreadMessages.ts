import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import type { SolyConciergeMessage, SolyConciergeRequest } from '../api/solyApi';

/**
 * Suivi des messages non lus, partage par le client et l administrateur.
 *
 * On memorise l id du DERNIER message vu par conversation plutot que la liste
 * complete des ids : la valeur reste minuscule (SecureStore est limite en
 * taille) et le compteur se recalcule tout seul quand de nouveaux messages
 * arrivent. Le compteur retombe a zero des que la conversation est ouverte,
 * ce qui fait disparaitre la pastille rouge.
 */

type SeenMap = Record<string, string>;

/** Cote client on compte ce qui vient de SOLY ; cote admin ce qui vient du client. */
export type UnreadAudience = 'client' | 'staff';

function isIncoming(message: SolyConciergeMessage, audience: UnreadAudience) {
  return audience === 'client'
    ? message.sender === 'staff' || message.sender === 'driver'
    : message.sender === 'client';
}

/** Messages entrants posterieurs au dernier message vu de cette conversation. */
function unreadInRequest(request: SolyConciergeRequest, seenId: string | undefined, audience: UnreadAudience) {
  const messages = request.messages ?? [];
  const seenIndex = seenId ? messages.findIndex((item) => item.id === seenId) : -1;
  return messages.slice(seenIndex + 1).filter((message) => isIncoming(message, audience)).length;
}

export function useUnreadMessages(audience: UnreadAudience) {
  const storageKey = `soly.seenMessages.${audience}`;
  const [seen, setSeen] = useState<SeenMap>({});
  const [ready, setReady] = useState(false);
  // Evite d ecrire dans SecureStore avant d avoir relu l etat persiste.
  const seenRef = useRef<SeenMap>({});

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync(storageKey)
      .then((raw) => {
        if (!mounted) return;
        const parsed = raw ? (JSON.parse(raw) as SeenMap) : {};
        seenRef.current = parsed;
        setSeen(parsed);
      })
      .catch(() => undefined)
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  /** Marque une conversation comme lue jusqu a son dernier message. */
  const markRequestSeen = useCallback((request: SolyConciergeRequest | null) => {
    if (!request) return;
    const last = request.messages?.[request.messages.length - 1];
    if (!last) return;
    if (seenRef.current[String(request.id)] === last.id) return;
    const next = { ...seenRef.current, [String(request.id)]: last.id };
    seenRef.current = next;
    setSeen(next);
    void SecureStore.setItemAsync(storageKey, JSON.stringify(next)).catch(() => undefined);
  }, [storageKey]);

  /** Total non lu, toutes conversations confondues. */
  const countUnread = useCallback(
    (requests: SolyConciergeRequest[]) =>
      requests.reduce((total, request) => total + unreadInRequest(request, seen[String(request.id)], audience), 0),
    [seen, audience],
  );

  /** Non lus d une seule conversation, pour une pastille par ligne. */
  const countUnreadFor = useCallback(
    (request: SolyConciergeRequest) => unreadInRequest(request, seen[String(request.id)], audience),
    [seen, audience],
  );

  return useMemo(
    () => ({ ready, markRequestSeen, countUnread, countUnreadFor }),
    [ready, markRequestSeen, countUnread, countUnreadFor],
  );
}
