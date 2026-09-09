// supabase.js
const SUPABASE_URL = "https://rpcczulnkogylqjzlikq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwY2N6dWxua29neWxxanpsaWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzM2NTUsImV4cCI6MjA3NjAwOTY1NX0.jTbunk_ErVYXEXriO6hWUhcV0MQrlnhkVRoJQHduLRA";

// create supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// optionally expose globally
window.supabase = supabaseClient;
