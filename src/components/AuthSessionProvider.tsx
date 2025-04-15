"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/providers/useSettings";
import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
//import getInitColorSchemeScript from "@mui/system/cssVars/getInitColorSchemeScript";
// import { getInitColorSchemeScript } from "@mui/material/styles";
import Button from "@mui/material/Button";

const baseUrl = "https://www.fifths.xyz";

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
    return (
      <SessionProvider
        session={session}
        baseUrl={baseUrl}
        basePath={`/api/nextauth`}
      >
        {/* {children} */}
        <body>
          <Button>Sign in</Button>
        </body>
      </SessionProvider>
    );
  }

  return (
    <>
      {/* must be used under CssVarsProvider */}

      <CssBaseline enableColorScheme />
      {/* {getInitColorSchemeScript({
        // These properties are normally set when importing from @mui/material,
        // but we have to set manually because we are importing from @mui/system.
        attribute: "data-mui-color-scheme",
        modeStorageKey: "mui-mode",
        colorSchemeStorageKey: "mui-color-scheme",
        // All options that you pass to CssVarsProvider you should also pass here.
        defaultMode: "dark",
      })} */}
      <SessionProvider
        session={session}
        baseUrl={baseUrl}
        basePath={`/api/nextauth`}
      >
        <SettingsProvider>{children}</SettingsProvider>
      </SessionProvider>
    </>
  );
}

export default AuthSessionProvider;
