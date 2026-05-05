"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: "g d", label: "Go to Dashboard" },
  { keys: "g r", label: "Go to Roth IRA" },
  { keys: "g b", label: "Go to Brokerage" },
  { keys: "g t", label: "Go to Trade Log" },
  { keys: "?", label: "Show this help" },
];

const ROUTES: Record<string, string> = {
  "g d": "/",
  "g r": "/roth",
  "g b": "/brokerage",
  "g t": "/trades",
};

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [pending, setPending] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      if (key === "?" || (e.shiftKey && key === "?")) {
        e.preventDefault();
        setShowHelp((s) => !s);
        return;
      }

      if (key === "Escape") {
        setShowHelp(false);
        setPending("");
        return;
      }

      const combo = pending ? `${pending} ${key}` : key;
      const route = ROUTES[combo];
      if (route) {
        router.push(route);
        setPending("");
      } else if (Object.keys(ROUTES).some((r) => r.startsWith(combo))) {
        setPending(combo);
        clearTimeout(timer);
        timer = setTimeout(() => setPending(""), 1500);
      } else {
        setPending("");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [pending, router]);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(11, 17, 32, 0.85)", backdropFilter: "blur(4px)" }}
      onClick={() => setShowHelp(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-100">Keyboard Shortcuts</h2>
          <button onClick={() => setShowHelp(false)} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{s.label}</span>
              <kbd className="px-2 py-0.5 rounded text-xs font-mono bg-[#0b1120] border border-[#1f2a44] text-slate-300">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
