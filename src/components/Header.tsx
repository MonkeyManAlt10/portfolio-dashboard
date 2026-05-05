"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Edit3, LogOut, TrendingUp, Menu, X } from "lucide-react";
import { useEditMode } from "./EditModeContext";
import PasswordModal from "./PasswordModal";
import { cn } from "@/lib/utils";

interface HeaderProps {
  lastUpdated?: string;
  marketState?: string;
}

const NAV_LINKS = [
  { href: "/", label: "Dashboard", shortcut: "g d" },
  { href: "/roth", label: "Roth IRA", shortcut: "g r" },
  { href: "/brokerage", label: "Brokerage", shortcut: "g b" },
  { href: "/trades", label: "Trade Log", shortcut: "g t" },
];

function MarketBadge({ state }: { state?: string }) {
  if (!state) return null;
  const configs: Record<string, { label: string; color: string }> = {
    REGULAR: { label: "Market Open", color: "bg-emerald-500" },
    PRE: { label: "Pre-Market", color: "bg-yellow-500" },
    POST: { label: "After-Hours", color: "bg-blue-500" },
    CLOSED: { label: "Market Closed", color: "bg-slate-500" },
  };
  const cfg = configs[state] ?? configs.CLOSED;
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.color)} />
      {cfg.label}
    </span>
  );
}

export default function Header({ lastUpdated, marketState }: HeaderProps) {
  const pathname = usePathname();
  const { isEditMode, exitEditMode } = useEditMode();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b flex items-center px-6"
        style={{ backgroundColor: "#0b1120", borderColor: "#1f2a44", backdropFilter: "blur(12px)" }}>
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-semibold text-slate-100 leading-none">
                Austin Krauskopf
              </div>
              <div className="text-xs text-slate-500 leading-none mt-0.5">
                Personal investment dashboard
              </div>
            </div>
          </Link>

          {/* Nav — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-colors",
                  pathname === link.href
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <MarketBadge state={marketState} />
            {lastUpdated && (
              <span className="hidden sm:block text-xs text-slate-500">
                Updated{" "}
                <span className="font-mono">
                  {new Date(lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            )}

            {isEditMode ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium border border-orange-500/30">
                  Editing
                </span>
                <button
                  onClick={exitEditMode}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
                  title="Exit Edit Mode"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
                style={{ borderColor: "#1f2a44", color: "#64748b" }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Mode</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-slate-400 hover:text-slate-200"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          className="md:hidden border-b px-6 py-4 flex flex-col gap-2 z-30 relative"
          style={{ backgroundColor: "#0b1120", borderColor: "#1f2a44" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === link.href
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}
