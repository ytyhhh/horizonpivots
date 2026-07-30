"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "campus-radar-saved-jobs";
const EVENT_NAME = "campus-radar-saved-jobs-change";
const EMPTY = "[]";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT_NAME, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? EMPTY;
}

function getServerSnapshot() {
  return EMPTY;
}

export function useSavedJobs() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  let ids: string[] = [];
  try {
    ids = JSON.parse(snapshot);
  } catch {
    ids = [];
  }

  function setIds(next: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_NAME));
  }

  return { ids, setIds };
}
