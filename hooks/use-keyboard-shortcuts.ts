"use client";

import { useEffect, useRef } from "react";

/**
 * Shortcut syntax:
 * - "n", "/", "?"          single key (no Ctrl/⌘/Alt)
 * - "mod+k"                ⌘ on macOS, Ctrl elsewhere
 * - "g d"                  sequence: press G, then D within 1s
 */
export interface KeyboardShortcut {
  keys: string;
  handler: (event: KeyboardEvent) => void;
  /** Fire even while typing in an input or with a dialog open (e.g. ⌘K). */
  global?: boolean;
}

const SEQUENCE_TIMEOUT_MS = 1000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function isOverlayOpen(): boolean {
  return Boolean(
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]'
    )
  );
}

function matchesSingle(spec: string, event: KeyboardEvent): boolean {
  const parts = spec.split("+");
  const key = parts.pop()!;
  const needsMod = parts.includes("mod");
  const hasMod = event.metaKey || event.ctrlKey;
  if (needsMod !== hasMod) return false;
  if (event.altKey) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    let pendingPrefix: string | null = null;
    let pendingAt = 0;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const blocked = isTypingTarget(event.target) || isOverlayOpen();

      // Second key of a sequence ("g" then "d").
      if (pendingPrefix && Date.now() - pendingAt < SEQUENCE_TIMEOUT_MS && !blocked) {
        const prefix = pendingPrefix;
        pendingPrefix = null;
        const match = latest.current.find((s) => {
          const [first, second] = s.keys.split(" ");
          return second !== undefined && first === prefix && matchesSingle(second, event);
        });
        if (match) {
          event.preventDefault();
          match.handler(event);
          return;
        }
      }
      pendingPrefix = null;

      for (const shortcut of latest.current) {
        if (blocked && !shortcut.global) continue;
        const [first, second] = shortcut.keys.split(" ");
        if (second !== undefined) {
          if (matchesSingle(first, event)) {
            pendingPrefix = first;
            pendingAt = Date.now();
            return;
          }
          continue;
        }
        if (matchesSingle(first, event)) {
          event.preventDefault();
          shortcut.handler(event);
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere (for key hints). */
export function modKeyLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
}
