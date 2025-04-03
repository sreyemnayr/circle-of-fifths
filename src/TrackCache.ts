// import { WithId, Document } from "mongodb";
import { TrackItem, AudioFeatures } from "@spotify/web-api-ts-sdk"; // use "@spotify/web-api-ts-sdk" in your own project

import clientPromise from "@/lib/mongodb";

const client = await clientPromise;

export type TrackItemWithAudioFeatures = TrackItem & {
  features?: AudioFeatures;
};

const collection = client
  .db("spotifier")
  .collection<TrackItemWithAudioFeatures>("tracks");

export async function getCachedTracks(
  track_ids: string[]
): Promise<TrackItemWithAudioFeatures[]> {
  const tracks = await collection.find({ id: { $in: track_ids } }).toArray();
  return tracks as TrackItemWithAudioFeatures[];
}

export async function getRepresentativeTrack(
  feature: string,
  min: number,
  max: number
) {
  const track = await collection.findOne(
    {
      [`features.${feature}`]: { $gte: min, $lte: max },
    },
    { sort: { popularity: -1 } }
  );
  return track;
}

export async function cacheTrack(track: TrackItemWithAudioFeatures) {
  await collection.insertOne(track);
}

export async function cacheTracks(tracks: TrackItemWithAudioFeatures[]) {
  await collection.insertMany(tracks);
}
