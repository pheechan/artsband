import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Music, Heart, Plus, Youtube, ExternalLink, Check, Loader2 } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  youtube_link: string | null;
  spotify_link: string | null;
  vote_count: number;
  is_confirmed: boolean;
  suggested_by: string | null;
  event_id: string;
  events?: {
    title: string;
  };
}

interface Event {
  id: string;
  title: string;
  status: string;
}

export default function SongHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [newSong, setNewSong] = useState({
    title: '',
    artist: '',
    youtube_link: '',
    event_id: '',
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    // Fetch songs with event info
    const { data: songsData } = await supabase
      .from('songs')
      .select(`
        *,
        events (title)
      `)
      .order('vote_count', { ascending: false });

    if (songsData) setSongs(songsData);

    // Fetch active events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, status')
      .in('status', ['draft', 'voting'])
      .order('event_date', { ascending: true });

    if (eventsData) setEvents(eventsData);

    // Fetch user's votes
    if (user) {
      const { data: votesData } = await supabase
        .from('song_votes')
        .select('song_id')
        .eq('user_id', user.id);

      if (votesData) {
        setUserVotes(new Set(votesData.map((v) => v.song_id)));
      }
    }

    setLoading(false);
  }

  const handleVote = async (songId: string) => {
    if (!user) return;

    const hasVoted = userVotes.has(songId);

    if (hasVoted) {
      // Remove vote
      await supabase
        .from('song_votes')
        .delete()
        .eq('song_id', songId)
        .eq('user_id', user.id);

      setUserVotes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    } else {
      // Add vote
      await supabase
        .from('song_votes')
        .insert({ song_id: songId, user_id: user.id });

      setUserVotes((prev) => new Set(prev).add(songId));
    }

    // Refresh songs to get updated vote count
    fetchData();
  };

  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    const { error } = await supabase.from('songs').insert({
      title: newSong.title,
      artist: newSong.artist,
      youtube_link: newSong.youtube_link || null,
      event_id: newSong.event_id,
      suggested_by: user.id,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to suggest song',
        description: error.message,
      });
    } else {
      toast({
        title: 'Song suggested!',
        description: 'Your song has been added to the voting list.',
      });
      setIsDialogOpen(false);
      setNewSong({ title: '', artist: '', youtube_link: '', event_id: '' });
      fetchData();
    }

    setSubmitting(false);
  };

  const suggestedSongs = songs.filter((s) => !s.is_confirmed);
  const confirmedSongs = songs.filter((s) => s.is_confirmed);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Music className="h-8 w-8 text-primary" />
              Song Hub
            </h1>
            <p className="text-muted-foreground">
              Suggest songs and vote for your favorites
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="hover-glow">
                <Plus className="mr-2 h-4 w-4" />
                Suggest a Song
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suggest a Song</DialogTitle>
                <DialogDescription>
                  Add a song you'd like to perform at an upcoming event.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitSong} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event">Event</Label>
                  <Select
                    value={newSong.event_id}
                    onValueChange={(v) => setNewSong({ ...newSong, event_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Song Title</Label>
                  <Input
                    id="title"
                    value={newSong.title}
                    onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                    placeholder="e.g., Bohemian Rhapsody"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist</Label>
                  <Input
                    id="artist"
                    value={newSong.artist}
                    onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                    placeholder="e.g., Queen"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube Link (optional)</Label>
                  <Input
                    id="youtube"
                    value={newSong.youtube_link}
                    onChange={(e) => setNewSong({ ...newSong, youtube_link: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !newSong.event_id}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Song'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="voting" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <TabsList>
            <TabsTrigger value="voting">
              Voting ({suggestedSongs.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({confirmedSongs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voting" className="mt-6">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="h-40 animate-pulse bg-muted" />
                ))}
              </div>
            ) : suggestedSongs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suggestedSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    hasVoted={userVotes.has(song.id)}
                    onVote={() => handleVote(song.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No songs to vote on</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to suggest a song for an upcoming event!
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Suggest a Song
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6">
            {confirmedSongs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {confirmedSongs.map((song) => (
                  <SongCard key={song.id} song={song} isConfirmed />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Check className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No confirmed songs yet</h3>
                <p className="text-muted-foreground">
                  Songs will appear here once they're confirmed for events.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

interface SongCardProps {
  song: Song;
  hasVoted?: boolean;
  onVote?: () => void;
  isConfirmed?: boolean;
}

function SongCard({ song, hasVoted, onVote, isConfirmed }: SongCardProps) {
  return (
    <Card className={`overflow-hidden hover:border-primary/50 transition-all ${hasVoted ? 'border-primary bg-accent/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{song.title}</CardTitle>
            <CardDescription className="truncate">{song.artist}</CardDescription>
          </div>
          {isConfirmed && (
            <Badge className="bg-success text-success-foreground shrink-0">
              <Check className="mr-1 h-3 w-3" />
              Confirmed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {song.events && (
          <p className="text-sm text-muted-foreground mb-3">
            For: {song.events.title}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {song.youtube_link && (
              <a href={song.youtube_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Youtube className="h-4 w-4" />
                </Button>
              </a>
            )}
            {song.spotify_link && (
              <a href={song.spotify_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>

          {!isConfirmed && onVote && (
            <Button
              variant={hasVoted ? 'default' : 'outline'}
              size="sm"
              onClick={onVote}
              className={hasVoted ? 'hover-glow' : ''}
            >
              <Heart className={`mr-1 h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
              {song.vote_count}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
