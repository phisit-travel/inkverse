"use client";

import { SessionProvider } from "next-auth/react";

// Scoped SessionProvider for the apply flow only — ApplyClient calls
// useSession().update() after auto-approval to refresh the role immediately.
// The rest of the app uses the server `auth()` and needs no client session
// context, so we don't wrap the whole app (keeps the per-page session fetch
// off every other route).
export default function ApplyProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
