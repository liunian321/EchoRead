import { useEffect } from "preact/hooks";

export function useShortcut(shortcut: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Basic parser for shortcut string like "Alt+T"
      const keys = shortcut.toLowerCase().split("+");
      const isAlt = keys.includes("alt") || keys.includes("option");
      const isCtrl = keys.includes("ctrl") || keys.includes("control");
      const isShift = keys.includes("shift");
      const isMeta = keys.includes("meta") || keys.includes("cmd") || keys.includes("command");

      // Find the main key (e.g., 't')
      const key = keys.find(k => !["alt", "option", "ctrl", "control", "shift", "meta", "cmd", "command"].includes(k));

      if (
        (isAlt === e.altKey) &&
        (isCtrl === e.ctrlKey) &&
        (isShift === e.shiftKey) &&
        (isMeta === e.metaKey) &&
        (key && e.key.toLowerCase() === key)
      ) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcut, callback]);
}
