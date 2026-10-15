"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "cre-done-steps";

/** Checked-off launch steps, remembered in this browser only. Storage failures just mean no persistence. */
export function useDoneSteps() {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) setDone(new Set(saved.filter((x) => typeof x === "string")));
    } catch {
      /* unavailable or corrupt: start empty */
    }
  }, []);

  const toggle = useCallback((id: string, checked: boolean) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable: progress just isn't remembered */
      }
      return next;
    });
  }, []);

  return { done, toggle };
}
