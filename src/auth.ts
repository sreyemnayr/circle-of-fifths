import NextAuth, { NextAuthConfig, Account } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import spotifyProfile, {
  refreshAccessToken,
  SpotifierJWT,
} from "@/SpotifyProfile";
import { JWT } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";

const client = await clientPromise;

export type AuthUser = {
  name?: string | null;
  email?: string | null;
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
  adapter: MongoDBAdapter(client, { databaseName: "spotifier" }),
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
        // Check if we have a stored account in the database for this user
        const client = await clientPromise;
        const db = client.db("spotifier");
        const accountsCollection = db.collection("accounts");

        // Convert userId to ObjectId if it's a string
        const userId =
          typeof token.sub === "string" && token.sub.length === 24
            ? new (await import("mongodb")).ObjectId(token.sub)
            : token.sub;

        const storedAccount = await accountsCollection.findOne({
          userId: userId,
          provider: "spotify",
        });

        if (storedAccount) {
          // Use the stored account data (which may have been refreshed by the cron job)
          const updatedToken: SpotifierJWT = {
            ...token,
            access_token: storedAccount.access_token,
            token_type: storedAccount.token_type,
            expires_at: storedAccount.expires_at,
            expires_in: storedAccount.expires_at - Date.now() / 1000,
            refresh_token: storedAccount.refresh_token,
            scope: storedAccount.scope,
            id: storedAccount.providerAccountId,
          };

          // If token is expired, try to refresh it
          if (
            Date.now() / 1000 >= (updatedToken.expires_at ?? 0) &&
            updatedToken.refresh_token
          ) {
            return refreshAccessToken(updatedToken);
          }

          return updatedToken;
        }

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

      // Manually create/update the account in the database since we're using JWT strategy
      if (account?.access_token && account?.refresh_token) {
        const client = await clientPromise;
        const db = client.db("spotifier");
        const accountsCollection = db.collection("accounts");

        // Convert userId to ObjectId if it's a string
        const userId =
          typeof token.sub === "string" && token.sub.length === 24
            ? new (await import("mongodb")).ObjectId(token.sub)
            : token.sub;

        await accountsCollection.updateOne(
          {
            userId: userId,
            provider: "spotify",
          },
          {
            $set: {
              userId: userId,
              provider: "spotify",
              type: "oauth",
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
            },
          },
          { upsert: true }
        );
      }

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
