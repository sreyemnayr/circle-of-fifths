import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import type { AuthUser } from "@/auth";

export function useTokenRefresh() {
  const { data: session, update } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for authentication errors
    const sessionWithError = session as any;
    if (sessionWithError?.error === "RefreshAccessTokenError") {
      console.log(
        "Authentication error detected, signing out:",
        sessionWithError.error_description
      );
      signOut();
      return;
    }

    const user = session?.user as AuthUser | undefined;
    if (!user?.expires_at) return;

    const checkTokenExpiry = async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = user.expires_at;

      // If token expires within 5 minutes, refresh the session
      if (expiresAt - now < 300) {
        console.log("Token expiring soon, refreshing session...");
        await update();
      }
    };

    // Check every minute
    intervalRef.current = setInterval(checkTokenExpiry, 60000);

    // Initial check
    checkTokenExpiry();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, update, signOut]);

  return { session };
}
