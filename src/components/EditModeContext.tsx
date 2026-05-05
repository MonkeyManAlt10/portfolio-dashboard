"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface EditModeContextType {
  isEditMode: boolean;
  password: string | null;
  enterEditMode: (pwd: string) => void;
  exitEditMode: () => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

const SESSION_KEY = "editPassword";

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    // Restore from sessionStorage on mount
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setPassword(stored);
  }, []);

  const enterEditMode = useCallback((pwd: string) => {
    sessionStorage.setItem(SESSION_KEY, pwd);
    setPassword(pwd);
  }, []);

  const exitEditMode = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setPassword(null);
  }, []);

  const authFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const stored = sessionStorage.getItem(SESSION_KEY);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string>),
      };
      if (stored) headers["x-edit-password"] = stored;

      const res = await fetch(url, { ...init, headers });
      if (res.status === 401) {
        exitEditMode();
      }
      return res;
    },
    [exitEditMode]
  );

  return (
    <EditModeContext.Provider
      value={{
        isEditMode: !!password,
        password,
        enterEditMode,
        exitEditMode,
        authFetch,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode(): EditModeContextType {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error("useEditMode must be used within EditModeProvider");
  return ctx;
}
