// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// GANTI DENGAN STRING ASLI (Bukan process.env)
const supabaseUrl = "https://owrcxknmtwvrpdlsojgv.supabase.co"; 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cmN4a25tdHd2cnBkbHNvamd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTM2OTksImV4cCI6MjA5NDc2OTY5OX0.7iJ29gVrbIR_MORqfzsfiGhrpdUiGE2qJevUvevaJi8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);