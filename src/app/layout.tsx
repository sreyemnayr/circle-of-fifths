import "@/app/globals.css";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { auth } from "@/auth";
import { Inter } from "next/font/google";
import type { Metadata } from "next";

import Paper from "@mui/material/Paper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotifier",
  description: "A Spotify playlist generator",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await getServerSession(authOptions);
  const session = await auth();

  return (
    <html lang="en">
      <AuthSessionProvider session={session}>
        <body className={inter.className} style={{ overflow: "auto" }}>
          <Paper elevation={3}>{children}</Paper>
          {/* The rest of your application */}
        </body>
      </AuthSessionProvider>
    </html>
  );
}
