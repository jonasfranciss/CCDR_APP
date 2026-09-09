import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Substitui pelos teus dados reais do dashboard do Supabase (Project Settings > API)
const supabaseUrl = 'https://nwgmloromztpzbeupzgz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Z21sb3JvbXp0cHpiZXVwemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzU4MzgsImV4cCI6MjEwNDQ1MTgzOH0.ItFA7Qf2GoNzxZGzYbbR1wQf4DnmtCk5rncoDpfMgQs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});