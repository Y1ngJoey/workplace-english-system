export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Scenario = "接待" | "展会" | "谈判" | "会议" | "合同" | "演讲" | "其他";
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
