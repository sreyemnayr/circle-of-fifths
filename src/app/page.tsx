"use client";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { SpotifySearch } from "@/components/SpotifySearch";

import sdk from "@/lib/spotify-sdk/ClientInstance";

export default function Home() {
  const session = useSession();
  const [displayOptions, setDisplayOptions] = useState<boolean>(false);

  return (
    <>
      {!!displayOptions && (
        <Modal
          disableScrollLock
          open={displayOptions}
          onClose={() => setDisplayOptions(false)}
          onClick={(e) => {
            e.stopPropagation();
            setDisplayOptions(false);
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <img
              src="/circle.jpg"
              style={{
                maxHeight: "80vw",
                maxWidth: "80vh",
                aspectRatio: "1",
                objectFit: "contain",
              }}
              alt="Circle of Fifths"
            />
          </Box>
        </Modal>
      )}

      <h1
        style={{
          fontSize: "2.5rem",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Circle of Fifths{" "}
        <span
          style={{
            paddingLeft: "14px",
            display: "inline-flex",
            flexDirection: "column",
            fontSize: "0.5rem",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span>Powered by</span>
          <img src="/spotify.png" style={{ height: "70px" }} alt="Spotify" />
        </span>
      </h1>
      <div style={{ padding: "0 5vw", fontSize: "0.7rem" }}>
        Given a seed track and optional vibes settings, this app will generate a
        long (~200 tracks) playlist with <em>no repeated tracks</em> that starts
        in the key of the seed track and follows the{" "}
        <div
          style={{
            display: "inline-block",
            fontWeight: "bold",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onClick={() => setDisplayOptions(true)}
        >
          circle of fifths
        </div>
        . You can find your seed track by either loading existing playlists or
        searching.{" "}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {!session || session.status != "authenticated" ? (
          <Button
            variant="contained"
            color="success"
            onClick={() =>
              signIn("spotify", {
                // redirectTo: "/api/nextauth/callback/spotify",
              })
            }
          >
            Authenticate with Spotify
          </Button>
        ) : (
          <>
            <SpotifySearch sdk={sdk} />
            <p>
              {" "}
              Logged into Spotify as {session.data.user?.name}.{" "}
              <Button
                variant="contained"
                color="error"
                onClick={() => signOut()}
              >
                {" "}
                Sign Out.
              </Button>
            </p>
          </>
        )}
        <div style={{ padding: "0 5vw" }}>
          Made with ❤️ by{" "}
          <a href="https://twitter.com/sreyemnayr">Ryan Meyers</a>
        </div>
        <div style={{ fontSize: "0.7rem", padding: "0 5vw" }}>
          Special thanks to Tim Williamson of The Nieux Society for inspiring
          this app with his deep and unrelenting love of Yacht Rock.
        </div>
      </div>
    </>
  );
}
