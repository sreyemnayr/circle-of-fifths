import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";

const REFRESH_THRESHOLD_MINUTES = 30; // Refresh tokens that expire within 30 minutes

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const client = await clientPromise;
    const db = client.db("spotifier");
    const accountsCollection = db.collection("accounts");

    // Find tokens that will expire within the threshold
    const threshold =
      Math.floor(Date.now() / 1000) + REFRESH_THRESHOLD_MINUTES * 60;

    const expiringAccounts = await accountsCollection
      .find({
        provider: "spotify",
        type: "oauth",
        expires_at: { $lte: threshold },
        refresh_token: { $exists: true, $ne: null },
      })
      .toArray();

    console.log(`Found ${expiringAccounts.length} tokens to refresh`);

    const refreshResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const account of expiringAccounts) {
      try {
        const refreshedTokens = await refreshSpotifyToken(
          account.refresh_token
        );

        // Update the account with new tokens
        await accountsCollection.updateOne(
          { _id: account._id },
          {
            $set: {
              access_token: refreshedTokens.access_token,
              expires_at: refreshedTokens.expires_at,
              token_type: refreshedTokens.token_type,
              scope: refreshedTokens.scope,
              refresh_token:
                refreshedTokens.refresh_token || account.refresh_token,
            },
          }
        );

        refreshResults.successful++;
        console.log(`Successfully refreshed token for user ${account.userId}`);
      } catch (error) {
        refreshResults.failed++;
        const errorMsg = `Failed to refresh token for user ${account.userId}: ${error}`;
        refreshResults.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      message: "Token refresh completed",
      results: refreshResults,
      processed: expiringAccounts.length,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} - ${error}`);
  }

  const tokens = await response.json();

  return {
    access_token: tokens.access_token,
    expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    token_type: tokens.token_type,
    scope: tokens.scope,
    refresh_token: tokens.refresh_token, // May be undefined if not provided
  };
}
