// supabase.js
const SUPABASE_URL = "https://lbynmptomywbkpukjxex.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxieW5tcHRvbXl3YmtwdWtqeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MDg2ODUsImV4cCI6MjA3NTk4NDY4NX0.-O7JU8hjLYZSwTW7e9vfZz6n1klpf2pEPWYBgj3i5ZI";

// create supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// optionally expose globally
window.supabase = supabaseClient;
