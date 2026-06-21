"use client";

/* Anonymous, privacy-safe session id for usage dedup. There is no first-party
 * visitor cookie today, so we mint one in localStorage (mirrors the premium/draft
 * client-storage pattern). It is only ever sent to /api/track, which folds it with
 * a coarse IP into a salted hash server-side — the raw id never identifies a
 * person and never reaches the database. SSR-safe (returns null on the server). */

const KEY = "easyprompt.sid";

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let sid = window.localStorage.getItem(KEY);
    if (!sid || !/^[a-f0-9]{32}$/.test(sid)) {
      sid = randomHex(16);
      window.localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}
