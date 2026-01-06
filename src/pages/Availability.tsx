import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Clock, Save, Trash2, Info } from 'lucide-react';
import { format, addDays, startOfWeek, setHours, setMinutes } from 'date-fns';

interface TimeSlot {
  id?: string;
  date: Date;
  hour: number;
  status: 'certain' | 'uncertain' | null;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9 AM to 8 PM

export default function Availability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [existingAvailability, setExistingAvailability] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user, weekStart]);

  async function fetchAvailability() {
    const startDate = weekStart.toISOString();
    const endDate = addDays(weekStart, 7).toISOString();

    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('member_id', user?.id)
      .gte('start_time', startDate)
      .lt('start_time', endDate);

    if (data) {
      setExistingAvailability(data);
      
      // Convert to slots format
      const loadedSlots: TimeSlot[] = data.map((a) => ({
        id: a.id,
        date: new Date(a.start_time),
        hour: new Date(a.start_time).getHours(),
        status: a.status as 'certain' | 'uncertain',
      }));
      setSlots(loadedSlots);
    }
  }

  const getSlotStatus = (date: Date, hour: number): 'certain' | 'uncertain' | null => {
    const slot = slots.find(
      (s) =>
        format(s.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
        s.hour === hour
    );
    return slot?.status || null;
  };

  const toggleSlot = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingIndex = slots.findIndex(
      (s) => format(s.date, 'yyyy-MM-dd') === dateStr && s.hour === hour
    );

    if (existingIndex >= 0) {
      const currentStatus = slots[existingIndex].status;
      if (currentStatus === 'certain') {
        // Cycle: certain -> uncertain
        setSlots((prev) =>
          prev.map((s, i) => (i === existingIndex ? { ...s, status: 'uncertain' } : s))
        );
      } else {
        // Cycle: uncertain -> null (remove)
        setSlots((prev) => prev.filter((_, i) => i !== existingIndex));
      }
    } else {
      // Add new slot as certain
      setSlots((prev) => [
        ...prev,
        {
          date: setMinutes(setHours(date, hour), 0),
          hour,
          status: 'certain',
        },
      ]);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Delete existing availability for this week
      const startDate = weekStart.toISOString();
      const endDate = addDays(weekStart, 7).toISOString();

      await supabase
        .from('availability')
        .delete()
        .eq('member_id', user.id)
        .gte('start_time', startDate)
        .lt('start_time', endDate);

      // Insert new availability
      if (slots.length > 0) {
        const newSlots = slots.map((slot) => ({
          member_id: user.id,
          start_time: slot.date.toISOString(),
          end_time: new Date(slot.date.getTime() + 60 * 60 * 1000).toISOString(),
          status: slot.status,
        }));

        const { error } = await supabase.from('availability').insert(newSlots);

        if (error) throw error;
      }

      toast({
        title: 'Availability saved!',
        description: 'Your schedule has been updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: error.message,
      });
    }

    setSaving(false);
  };

  const clearAll = () => {
    setSlots([]);
  };

  const certainCount = slots.filter((s) => s.status === 'certain').length;
  const uncertainCount = slots.filter((s) => s.status === 'uncertain').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              Availability Matrix
            </h1>
            <p className="text-muted-foreground">
              Mark when you're free for rehearsals
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
            <Button onClick={handleSave} disabled={saving} className="hover-glow">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Legend */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary" />
                <span className="text-sm">Definitely Available ({certainCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-primary bg-accent" />
                <span className="text-sm">Uncertain ({uncertainCount})</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4" />
                <span className="text-sm">Click once for certain, twice for uncertain, third to remove</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Navigation */}
        <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button variant="outline" onClick={() => setWeekStart((prev) => addDays(prev, -7))}>
            Previous Week
          </Button>
          <span className="font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" onClick={() => setWeekStart((prev) => addDays(prev, 7))}>
            Next Week
          </Button>
        </div>

        {/* Grid */}
        <Card className="overflow-x-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4">
            <div className="min-w-[700px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-sm font-medium text-muted-foreground">Time</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="p-2 text-center text-sm font-medium"
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-muted-foreground">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
                  <div className="p-2 text-sm text-muted-foreground flex items-center">
                    {format(setHours(new Date(), hour), 'h a')}
                  </div>
                  {weekDays.map((day) => {
                    const status = getSlotStatus(day, hour);
                    return (
                      <button
                        key={`${day.toISOString()}-${hour}`}
                        onClick={() => toggleSlot(day, hour)}
                        className={`
                          h-10 rounded-md transition-all
                          ${status === 'certain' 
                            ? 'bg-primary hover:bg-primary/90' 
                            : status === 'uncertain'
                            ? 'bg-accent border-2 border-primary hover:bg-accent/80'
                            : 'bg-muted hover:bg-muted/80 border border-border'
                          }
                        `}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
