"use client";

import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { useEditMode } from "./EditModeContext";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface PasswordModalProps {
  onClose: () => void;
}

export default function PasswordModal({ onClose }: PasswordModalProps) {
  const { enterEditMode } = useEditMode();
  const [digits, setDigits] = useState<string[]>(Array(8).fill(""));
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getPassword = () => digits.join("");

  async function handleSubmit() {
    const pwd = getPassword();
    if (pwd.length < 8) return;

    setLoading(true);
    try {
      const res = await fetch("/api/portfolio", {
        headers: { "x-edit-password": pwd },
      });
      // We test the password by hitting a write route
      const testRes = await fetch("/api/positions", {
        method: "POST",
        headers: { "x-edit-password": pwd, "Content-Type": "application/json" },
        body: JSON.stringify({ __test: true }),
      });

      // A 400 (bad body) still means auth passed; 401 means wrong password
      if (testRes.status === 401) {
        setError(true);
        setDigits(Array(8).fill(""));
        inputRefs.current[0]?.focus();
        toast.error("Incorrect password");
      } else {
        enterEditMode(pwd);
        toast.success("Edit mode enabled");
        onClose();
      }
      void res;
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Enter") {
      handleSubmit();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && index < 7) {
      inputRefs.current[index + 1]?.focus();
      return;
    }
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(false);
    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && index === 7) {
      // Auto-submit when all digits filled from last box
      setTimeout(() => handleSubmit(), 50);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (!text) return;
    const next = Array(8).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const focusIdx = Math.min(text.length, 7);
    inputRefs.current[focusIdx]?.focus();
    if (text.length === 8) setTimeout(() => handleSubmit(), 50);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(11, 17, 32, 0.85)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 border"
        style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}
      >
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Edit Mode</h2>
        <p className="text-sm text-slate-400 mb-6">
          Enter your 8-digit password to enable editing.
        </p>

        <div className="flex gap-2 justify-center mb-6">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              autoFocus={i === 0}
              className={cn(
                "w-9 h-11 text-center text-lg font-mono rounded-lg border outline-none transition-all",
                "focus:ring-2 focus:ring-blue-500",
                error
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-[#1f2a44] bg-[#0b1120] text-slate-100",
                digit && !error && "border-blue-500/50"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">
            Incorrect password. Try again.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-[#1f2a44] hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || digits.some((d) => !d)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
