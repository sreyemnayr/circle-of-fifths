// import authOptions from "@/app/api/auth/[...nextauth]/authOptions";
import "@/app/globals.css";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { auth } from "@/auth"
import { Inter } from "next/font/google";

import Sheet from '@mui/joy/Sheet';


const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className} style={{overflow: "scroll"}}>
      <Sheet color="neutral" >{children}</Sheet>
      {/* The rest of your application */}

      </body>
      </AuthSessionProvider>
    </html>
  );
}
