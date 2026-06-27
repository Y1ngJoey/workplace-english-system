export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Scenario = string;
export type ReviewSection = "learned" | "used" | "mistakes" | "hard" | "next";

export type CorpusEntry = {
  id: string;
  user_id: string;
  scenario: string;
  chinese_intent: string | null;
  english_expression: string;
  mistake_note: string | null;
  tags: string[] | null;
  source: string | null;
  mastery: number | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  task_type: string | null;
  completed: boolean | null;
  minutes_spent: number | null;
  notes: string | null;
  created_at: string | null;
};

export type WeeklyReview = {
  id: string;
  user_id: string;
  week_start: string;
  corpus_added: number | null;
  days_completed: number | null;
  emails_written: number | null;
  interpreting_sessions: number | null;
  section_order: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReviewItem = {
  id: string;
  user_id: string;
  review_id: string;
  section: ReviewSection;
  content: string;
  position: number;
  created_at: string | null;
};

export type Template = {
  id: string;
  user_id: string | null;
  category: string;
  title: string;
  content_en: string;
  content_zh: string | null;
  is_favorite: boolean | null;
  created_at: string | null;
};

export type GlossaryTerm = {
  id: string;
  user_id: string | null;
  category: string;
  term_en: string;
  term_zh: string;
  example: string | null;
  is_favorite: boolean | null;
  mastery: number | null;
  created_at: string | null;
};

export type GrammarPoint = {
  id: string;
  slug: string;
  name_zh: string;
  priority: number;
  rules_md: string;
  examples: Json;
  common_mistakes: Json;
};

export type RoleplayScript = {
  id: string;
  user_id: string | null;
  category: string;
  title: string;
  content_en: string;
  content_zh: string | null;
  is_favorite: boolean | null;
  created_at: string | null;
};

export type GrowthLog = {
  id: string;
  user_id: string;
  log_date: string;
  type: string | null;
  title: string | null;
  media_url: string | null;
  notes: string | null;
  created_at: string | null;
};

export type UserSettings = {
  user_id: string;
  daily_goal_minutes: number | null;
  last_export_at: string | null;
  created_at: string | null;
};

export type Visibility = "private" | "public";
export type TravelPlaceType = "stay" | "food" | "see" | "shop";
export type TravelMediaKind = "photo" | "video";

export type SiteText = {
  id: string;
  user_id: string;
  slot: string;
  content: string;
  updated_at: string | null;
};

export type JazzTimeline = {
  id: string;
  user_id: string;
  entry_date: string;
  title: string;
  note: string;
  reference_url: string | null;
  video_url: string | null;
  visibility: Visibility;
  position: number;
  created_at: string | null;
};

export type JazzCompare = {
  id: string;
  user_id: string;
  title: string;
  before_url: string | null;
  after_url: string | null;
  visibility: Visibility;
  created_at: string | null;
};

export type JazzInspiration = {
  id: string;
  user_id: string;
  video_url: string | null;
  note: string;
  tags: string[] | null;
  visibility: Visibility;
  created_at: string | null;
};

export type TravelTrip = {
  id: string;
  user_id: string;
  title: string;
  country: string | null;
  country_flag: string | null;
  date_start: string | null;
  date_end: string | null;
  intro: string | null;
  cover_emoji: string | null;
  cover_url: string | null;
  sort_order: number;
  created_at: string | null;
};

export type TravelPlace = {
  id: string;
  user_id: string;
  trip_id: string;
  day_label: string;
  date_label: string;
  type: string;
  type_color: TravelPlaceType;
  name: string;
  address: string | null;
  mood: string | null;
  visibility: Visibility;
  sort_order: number;
  created_at: string | null;
};

export type TravelPlaceMedia = {
  id: string;
  user_id: string;
  place_id: string;
  kind: TravelMediaKind;
  url: string;
  platform: string | null;
  sort_order: number;
  created_at: string | null;
};

type RowMap = {
  corpus_entries: CorpusEntry;
  daily_logs: DailyLog;
  weekly_reviews: WeeklyReview;
  review_items: ReviewItem;
  templates: Template;
  glossary: GlossaryTerm;
  grammar_points: GrammarPoint;
  roleplay_scripts: RoleplayScript;
  growth_log: GrowthLog;
  user_settings: UserSettings;
  site_texts: SiteText;
  jazz_timeline: JazzTimeline;
  jazz_compare: JazzCompare;
  jazz_inspiration: JazzInspiration;
  trips: TravelTrip;
  places: TravelPlace;
  place_media: TravelPlaceMedia;
  idea_bank: {
    id: string;
    user_id: string;
    idea: string;
    source: string | null;
    status: string | null;
    linked_corpus_id: string | null;
    created_at: string | null;
  };
};

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      [TableName in keyof RowMap]: TableDefinition<RowMap[TableName]>;
    } & {
      content_posts: TableDefinition<Record<string, unknown>>;
      leads: TableDefinition<Record<string, unknown>>;
      app_admins: TableDefinition<Record<string, unknown>>;
      grammar_practice: TableDefinition<Record<string, unknown>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
