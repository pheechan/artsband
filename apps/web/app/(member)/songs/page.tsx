import Link from "next/link";
import { Music2, Plus, Vote } from "lucide-react";

import { FlashMessage } from "@/components/flash-message";
import { Badge, Button, Card, Input, Label } from "@/components/primitives";
import { requireApprovedViewer } from "@/lib/auth";
import type { EventRecord, SongWithEvent, VoteRecord } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SongsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireApprovedViewer();
  const params = (await searchParams) ?? {};
  const message = typeof params.message === "string" ? params.message : undefined;
  const tone = typeof params.tone === "string" ? params.tone : "info";

  const supabase = await createSupabaseServerClient();
  const [songsResult, activeEventsResult, userVotesResult] = await Promise.all([
    supabase.from("songs").select("*,events(title)").order("vote_count", { ascending: false }),
    supabase.from("events").select("*").in("status", ["draft", "voting"]).order("event_date", { ascending: true }),
    supabase.from("song_votes").select("*").eq("user_id", viewer.user.id),
  ]);

  const songs = (songsResult.data as SongWithEvent[] | null) ?? [];
  const activeEvents = (activeEventsResult.data as EventRecord[] | null) ?? [];
  const userVotes = new Set(((userVotesResult.data as VoteRecord[] | null) ?? []).map((vote) => vote.song_id));
  const suggestedSongs = songs.filter((song) => !song.is_confirmed);
  const confirmedSongs = songs.filter((song) => song.is_confirmed);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-8">
          <div className="flex items-center gap-3 text-primary">
            <Music2 className="h-8 w-8" />
            <h1 className="text-5xl">Song Hub</h1>
          </div>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Suggest songs for upcoming events and keep the ranking fair by handling every vote through the server.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge tone="brand">{suggestedSongs.length} in voting</Badge>
            <Badge tone="success">{confirmedSongs.length} confirmed</Badge>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center gap-2 text-primary">
            <Plus className="h-5 w-5" />
            <h2 className="text-3xl text-foreground">Suggest a song</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Song suggestions are stored through server-side route handlers, ready for stricter approval and scheduling logic later.</p>
          <form action="/api/member/songs" method="post" className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-id">Event</Label>
              <select
                id="event-id"
                name="event_id"
                required
                className="brand-ring h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground"
              >
                <option value="">Select an event</option>
                {activeEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="song-title">Song title</Label>
              <Input id="song-title" name="title" required placeholder="Bohemian Rhapsody" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="song-artist">Artist</Label>
              <Input id="song-artist" name="artist" required placeholder="Queen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube-link">YouTube link</Label>
              <Input id="youtube-link" name="youtube_link" type="url" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotify-link">Spotify link</Label>
              <Input id="spotify-link" name="spotify_link" type="url" placeholder="https://open.spotify.com/track/..." />
            </div>
            <Button type="submit" className="w-full">
              Submit suggestion
            </Button>
          </form>
        </Card>
      </section>

      <FlashMessage message={message} tone={tone === "success" || tone === "error" ? tone : "info"} />

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl text-foreground">Voting queue</h2>
          <Link href="/dashboard" className="text-sm font-semibold text-primary">
            Back to dashboard
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suggestedSongs.length > 0 ? suggestedSongs.map((song) => (
            <Card key={song.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{song.title}</p>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                </div>
                <Badge tone={userVotes.has(song.id) ? "brand" : "neutral"}>
                  <Vote className="mr-1 h-3 w-3" />
                  {song.vote_count}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">For {song.events?.title ?? "Unknown event"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {song.youtube_link ? (
                  <a href={song.youtube_link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">
                    YouTube
                  </a>
                ) : null}
                {song.spotify_link ? (
                  <a href={song.spotify_link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">
                    Spotify
                  </a>
                ) : null}
              </div>
              <form action={`/api/member/songs/${song.id}/vote`} method="post" className="mt-5">
                <Button type="submit" variant={userVotes.has(song.id) ? "primary" : "outline"} className="w-full">
                  {userVotes.has(song.id) ? "Remove vote" : "Vote for this song"}
                </Button>
              </form>
            </Card>
          )) : (
            <Card className="p-8">
              <p className="text-muted-foreground">No suggested songs yet. Start the queue with the form above.</p>
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl text-foreground">Confirmed songs</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {confirmedSongs.length > 0 ? confirmedSongs.map((song) => (
            <Card key={song.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{song.title}</p>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                </div>
                <Badge tone="success">Confirmed</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">For {song.events?.title ?? "Unknown event"}</p>
            </Card>
          )) : (
            <Card className="p-8">
              <p className="text-muted-foreground">No confirmed songs yet.</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
