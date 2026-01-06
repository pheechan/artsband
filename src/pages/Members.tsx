import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Guitar, Mic, Piano, Drum } from 'lucide-react';

interface Profile {
  id: string;
  nickname: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_instrument: string;
  secondary_instrument: string | null;
  bio: string | null;
}

const instrumentIcons: Record<string, React.ReactNode> = {
  vocals: <Mic className="h-4 w-4" />,
  guitar: <Guitar className="h-4 w-4" />,
  bass: <Guitar className="h-4 w-4" />,
  keyboard: <Piano className="h-4 w-4" />,
  drums: <Drum className="h-4 w-4" />,
};

const instrumentColors: Record<string, string> = {
  vocals: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  guitar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  bass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  keyboard: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  drums: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function Members() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('nickname', { ascending: true });

      if (data) setProfiles(data);
      setLoading(false);
    }

    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter(
    (p) =>
      p.nickname.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.primary_instrument.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByInstrument = filteredProfiles.reduce((acc, profile) => {
    const instrument = profile.primary_instrument;
    if (!acc[instrument]) acc[instrument] = [];
    acc[instrument].push(profile);
    return acc;
  }, {} as Record<string, Profile[]>);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Member Directory
            </h1>
            <p className="text-muted-foreground">
              {profiles.length} members in the club
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or instrument..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {Object.entries(groupedByInstrument).map(([instrument, members]) => (
              <div key={instrument}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 capitalize">
                  {instrumentIcons[instrument]}
                  {instrument}
                  <Badge variant="secondary">{members.length}</Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((profile) => (
                    <MemberCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No members found</h3>
            <p className="text-muted-foreground">
              Try a different search term.
            </p>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function MemberCard({ profile }: { profile: Profile }) {
  const initials = profile.nickname.slice(0, 2).toUpperCase();

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{profile.nickname}</h3>
            {profile.full_name && (
              <p className="text-sm text-muted-foreground truncate">{profile.full_name}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge className={instrumentColors[profile.primary_instrument] || instrumentColors.other}>
                {profile.primary_instrument}
              </Badge>
              {profile.secondary_instrument && (
                <Badge variant="outline" className="text-xs">
                  +{profile.secondary_instrument}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {profile.bio && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{profile.bio}</p>
        )}
      </CardContent>
    </Card>
  );
}
