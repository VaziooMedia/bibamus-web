import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rkmmrzkqzqpntgiguajz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbW1yemtxenFwbnRnaWd1YWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjA5MjcsImV4cCI6MjEwMjg5NjkyN30.JHYU0ARSlxR4iOeqs6tjtIN9QUeUKaIc7t2mhNiI6D4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
