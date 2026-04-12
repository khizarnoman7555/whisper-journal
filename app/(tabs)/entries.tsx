import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchEntries, deleteEntry, JournalEntry } from '../../src/lib/supabase';
import { supabase } from '../../src/lib/supabase';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function EntriesScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filtered, setFiltered] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await fetchEntries();
      setEntries(data);
      setFiltered(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function handleSearch(q: string) {
    setSearch(q);
    const lower = q.toLowerCase();
    setFiltered(entries.filter(
      e => e.title.toLowerCase().includes(lower) ||
           e.transcript.toLowerCase().includes(lower)
    ));
  }

  async function handleDelete(entry: JournalEntry) {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteEntry(entry); load(); },
      },
    ]);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const renderItem = ({ item }: { item: JournalEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardMeta}>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        <Text style={styles.cardMood}>{item.mood ?? ''}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardPreview} numberOfLines={2}>{item.transcript}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDuration}>▶ {formatDuration(item.duration_seconds)}</Text>
        <TouchableOpacity onPress={() => handleDelete(item)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Entries</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search entries..."
          placeholderTextColor="#ddd5c8"
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} color="#c4572a" />
        : <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No entries yet. Start recording!</Text>
            }
          />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf8f4' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '500', color: '#1a1a2e' },
  signOut: { fontSize: 13, color: '#9b8e7e' },
  searchWrap: { paddingHorizontal: 24, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#f2ede4', borderWidth: 1, borderColor: '#ddd5c8',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1a1a2e',
  },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd5c8',
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardDate: { fontSize: 12, color: '#9b8e7e' },
  cardMood: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#1a1a2e', marginBottom: 4 },
  cardPreview: { fontSize: 13, color: '#9b8e7e', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardDuration: { fontSize: 11, color: '#ddd5c8' },
  deleteText: { fontSize: 12, color: '#c42a2a' },
  empty: { textAlign: 'center', color: '#9b8e7e', marginTop: 60, fontSize: 14 },
});
