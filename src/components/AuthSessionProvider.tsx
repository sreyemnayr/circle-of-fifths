"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import React from "react";
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import getInitColorSchemeScript from "@mui/system/cssVars/getInitColorSchemeScript";

function AuthSessionProvider({
  session,
  children,
}: {
  children: React.ReactNode;
  session: Session | null | undefined;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
      setMounted(true);
    }, []);
  
    if (!mounted) {
      // to avoid layout shift, render a placeholder button
      return <SessionProvider session={session}>
      
              {children}
      
      </SessionProvider>;
    }

  return <SessionProvider session={session}>
    <CssVarsProvider defaultMode="dark">
      {/* must be used under CssVarsProvider */}
      
            <CssBaseline disableColorScheme />
            {getInitColorSchemeScript({
              // These properties are normally set when importing from @mui/material,
              // but we have to set manually because we are importing from @mui/system.
              attribute: "data-mui-color-scheme",
              modeStorageKey: "mui-mode",
              colorSchemeStorageKey: "mui-color-scheme",
              // All options that you pass to CssVarsProvider you should also pass here.
              defaultMode: "dark",
            })}
            {children}
    </CssVarsProvider>
  </SessionProvider>;
}

export default AuthSessionProvider;
