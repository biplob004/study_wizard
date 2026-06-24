// The auth context object and its hook, kept separate from the provider component so
// the provider file exports a component only (clean React Fast Refresh).
import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
