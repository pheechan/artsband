import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Music, Users, Clock, ChevronRight, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Event {
  id: string;
  title: string;
  theme: string | null;
  event_date: string;
  venue: string | null;
  status: string;
}

interface Rehearsal {
  id: string;
  start_time: string;
  end_time: string;
  location: string | null;
  songs: {
    title: string;
    artist: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [myRehearsals, setMyRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch upcoming events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);

      if (events) setUpcomingEvents(events);

      // Fetch my rehearsals
      const { data: rehearsals } = await supabase
        .from('rehearsals')
        .select(`
          id,
          start_time,
          end_time,
          location,
          songs (
            title,
            artist
          )
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      if (rehearsals) setMyRehearsals(rehearsals as unknown as Rehearsal[]);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'voting': return 'bg-warning text-warning-foreground';
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back<span className="font-script text-primary">, Band!</span>
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your music club today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Gigs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myRehearsals.length}</p>
                  <p className="text-sm text-muted-foreground">My Rehearsals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Hours Practiced</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Songs Performed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Events */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Gigs
                </CardTitle>
                <CardDescription>Events you're participating in</CardDescription>
              </div>
              <Link to="/songs">
                <Button variant="ghost" size="sm">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        {event.venue && (
                          <p className="text-xs text-muted-foreground">{event.venue}</p>
                        )}
                      </div>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events</p>
                  <p className="text-sm">Check back later for new gigs!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Rehearsals */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  My Rehearsals
                </CardTitle>
                <CardDescription>Your scheduled practice sessions</CardDescription>
              </div>
              <Link to="/availability">
                <Button variant="ghost" size="sm">
                  Update availability <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : myRehearsals.length > 0 ? (
                <div className="space-y-3">
                  {myRehearsals.map((rehearsal) => (
                    <div
                      key={rehearsal.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{rehearsal.songs?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          by {rehearsal.songs?.artist}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(rehearsal.start_time), 'MMM d, h:mm a')}
                        </p>
                        {rehearsal.location && (
                          <p className="text-xs text-muted-foreground">{rehearsal.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduled rehearsals</p>
                  <p className="text-sm">Update your availability to get scheduled!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link to="/availability">
                <Button variant="outline" className="hover:border-primary hover:text-primary">
                  <Clock className="mr-2 h-4 w-4" />
                  Update Availability
                </Button>
              </Link>
              <Link to="/songs">
                <Button variant="outline" className="hover:border-primary hover:text-primary">
                  <Music className="mr-2 h-4 w-4" />
                  Suggest a Song
                </Button>
              </Link>
              <Link to="/members">
                <Button variant="outline" className="hover:border-primary hover:text-primary">
                  <Users className="mr-2 h-4 w-4" />
                  View Members
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
