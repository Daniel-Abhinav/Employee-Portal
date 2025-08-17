import { createClient } from '@supabase/supabase-js'

// You'll need to replace these with your actual values
const supabaseUrl = 'https://ldxqtbjrnjiztwwtwhch.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeHF0YmpybmppenR3d3R3aGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDU4ODgsImV4cCI6MjA3MDEyMTg4OH0.z_yTGg_YGWkuHNo1dDct7yam3xi0Q2uvU0OCirorF-k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
