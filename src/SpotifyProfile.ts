import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import { WithId, Document } from "mongodb";

// if (!process.env.SPOTIFY_CLIENT_ID) {
//   throw new Error("Missing SPOTIFY_CLIENT_ID");
// }

// if (!process.env.SPOTIFY_CLIENT_SECRET) {
//   throw new Error("Missing SPOTIFY_CLIENT_SECRET");
// }

import { IHandleErrors } from "@spotify/web-api-ts-sdk";



import clientPromise from "@/lib/mongodb";

const client = await clientPromise;

const collection = client.db("spotifier").collection("keys")

interface Credentials extends WithId<Document> {
  label: string;
  clientId: string;
  clientSecret: string;
  burned: boolean;
  account: string;
}

const credentials: Credentials | null = await collection.findOne({ burned: false }) as Credentials | null;

if (!credentials) {
  throw new Error("No credentials found");
}

export class MyErrorHandler implements IHandleErrors {
  public async handleErrors(error: any): Promise<boolean> {
      if (error == "The app has exceeded its rate limits.") {
        console.log("CAUGHT 429")
        if(credentials) {
          await collection.updateOne({ _id: credentials._id }, { $set: { burned: true } });

        }
      }
      console.log(error)
      return false;
  }
}


const spotifyProfile = SpotifyProvider({
  clientId: credentials.clientId,
  clientSecret: credentials.clientSecret,
  
});

// console.log(credentials)

const authURL = new URL("https://accounts.spotify.com/authorize");

const scopes = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-library-read",
  // "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "streaming"
];

authURL.searchParams.append("scope", scopes.join(" "));

spotifyProfile.authorization = authURL.toString();

export default spotifyProfile;

export async function refreshAccessToken(token: JWT) {
  try {
    const response = await fetch(authURL, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      token_type: refreshedTokens.token_type,
      expires_at: refreshedTokens.expires_at,
      expires_in: (refreshedTokens.expires_at ?? 0) - Date.now() / 1000,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
      scope: refreshedTokens.scope,
    };
  } catch (error) {
    console.error(error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
