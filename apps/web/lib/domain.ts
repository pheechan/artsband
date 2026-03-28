export const instrumentOptions = [
  { value: "vocals", label: "Vocals" },
  { value: "guitar", label: "Guitar" },
  { value: "bass", label: "Bass" },
  { value: "keyboard", label: "Keyboard" },
  { value: "drums", label: "Drums" },
  { value: "other", label: "Other" },
] as const;

export const membershipStatuses = ["pending", "approved", "rejected", "suspended"] as const;
export const appRoles = ["admin", "moderator", "member"] as const;
export const eventStatuses = ["draft", "voting", "confirmed", "completed"] as const;

export type InstrumentPart = (typeof instrumentOptions)[number]["value"];
export type MembershipStatus = (typeof membershipStatuses)[number];
export type AppRole = (typeof appRoles)[number];
export type EventStatus = (typeof eventStatuses)[number];

export interface ProfileRecord {
  id: string;
  nickname: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  primary_instrument: InstrumentPart;
  secondary_instrument: InstrumentPart | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  student_id: string | null;
  membership_status: MembershipStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRecord {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface EventRecord {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  event_date: string;
  venue: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SongRecord {
  id: string;
  title: string;
  artist: string;
  event_id: string;
  youtube_link: string | null;
  spotify_link: string | null;
  suggested_by: string | null;
  vote_count: number;
  is_confirmed: boolean;
  created_at: string;
}

export interface SongWithEvent extends SongRecord {
  events: {
    title: string;
  } | null;
}

export interface VoteRecord {
  id: string;
  song_id: string;
  user_id: string;
  created_at: string;
}

export interface AvailabilityRecord {
  id: string;
  member_id: string;
  start_time: string;
  end_time: string;
  status: "certain" | "uncertain";
  created_at: string;
  updated_at: string;
}

export interface RehearsalWithSong {
  id: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
  status: string;
  songs: {
    title: string;
    artist: string;
  } | null;
}

export interface SchedulerCapability {
  mode: string;
  accepts_event_id: boolean;
  accepts_song_ids: boolean;
  slot_minutes_supported: number[];
  data_sources: string[];
}
