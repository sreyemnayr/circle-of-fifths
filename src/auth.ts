import NextAuth, { NextAuthConfig, Account } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import spotifyProfile, { refreshAccessToken } from "@/SpotifyProfile";
import { JWT } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";

const client = await clientPromise;

export type AuthUser = {
  name: string;
  email: string;
  image: string;
  access_token: string;
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  scope: string;
  id: string;
};

const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(client),
  providers: [spotifyProfile],

  session: {
    maxAge: 60 * 60, // 1hr
    strategy: "jwt",
  },

  // cookies: {
  //   pkceCodeVerifier: {
  //     name: "authjs.pkce.code_verifier",
  //     options: {
  //       httpOnly: true,
  //       sameSite: "lax",
  //       path: "/",
  //       secure: true,
  //     },
  //   },
  // },

  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      if (!account) {
        return token;
      }

      const updatedToken = {
        ...token,
        access_token: account?.access_token,
        token_type: account?.token_type,
        expires_at: account?.expires_at ?? Date.now() / 1000,
        expires_in: (account?.expires_at ?? 0) - Date.now() / 1000,
        refresh_token: account?.refresh_token,
        scope: account?.scope,
        id: account?.providerAccountId,
      };

      if (Date.now() / 1000 - 60 * 30 >= updatedToken.expires_at) {
        return refreshAccessToken(updatedToken);
      }

      return updatedToken;
    },
    async session({ session, token }: { session: any; token: any }) {
      const user: AuthUser = {
        ...session?.user,
        access_token: token?.access_token,
        token_type: token?.token_type,
        expires_at: token?.expires_at,
        expires_in: token?.expires_in,
        refresh_token: token?.refresh_token,
        scope: token?.scope,
        id: token?.id,
      };
      // async session({ session, user }) {
      //   session.user = user;
      //   const account = await authConfig.adapter?.getUser
      //   // session.error = token?.error;
      //   return session;
      // },
      session.user = user;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  basePath: "/api/nextauth",
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
