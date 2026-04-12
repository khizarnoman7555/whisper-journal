import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type JournalEntry = {
  id: string;
  user_id: string;
  title: string;
  transcript: string;
  audio_url: string | null;
  mood: string | null;
  duration_seconds: number;
  created_at: string;
};

export async function fetchEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveEntry(params: {
  title: string;
  transcript: string;
  audioUri: string | null;
  mood: string | null;
  durationSeconds: number;
}): Promise<JournalEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let audio_url: string | null = null;

  if (params.audioUri) {
    const fileName = `${user.id}/${Date.now()}.m4a`;
    const response = await fetch(params.audioUri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(fileName, blob, { contentType: 'audio/m4a' });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(fileName);
    audio_url = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      title: params.title,
      transcript: params.transcript,
      audio_url,
      mood: params.mood,
      duration_seconds: params.durationSeconds,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(entry: JournalEntry): Promise<void> {
  if (entry.audio_url) {
    const path = entry.audio_url.split('/audio-recordings/')[1];
    if (path) {
      await supabase.storage.from('audio-recordings').remove([path]);
    }
  }
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entry.id);
  if (error) throw error;
}
