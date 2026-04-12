import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, SafeAreaView,
} from 'react-native';
import { useRecorder } from '../../src/hooks/useRecorder';
import { transcribeAudio } from '../../src/lib/transcribe';
import { saveEntry } from '../../src/lib/supabase';

const MOODS = ['😔', '😐', '🙂', '😊', '✨'];

export default function RecordScreen() {
  const recorder = useRecorder();
  const [transcript, setTranscript] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleStopAndTranscribe() {
    const uri = await recorder.stopRecording();
    if (!uri) return;
    setTranscribing(true);
    try {
      const text = await transcribeAudio(uri);
      setTranscript(text);
    } catch (err: any) {
      Alert.alert('Transcription error', err.message);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSave() {
    if (!transcript) return Alert.alert('Nothing to save', 'Record something first!');
    setSaving(true);
    try {
      const firstSentence = transcript.split(/[.!?]/)[0].trim().slice(0, 60);
      await saveEntry({
        title: firstSentence || 'Journal entry',
        transcript,
        audioUri: recorder.audioUri,
        mood: selectedMood || null,
        durationSeconds: recorder.durationSeconds,
      });
      setTranscript('');
      setSelectedMood('');
      recorder.discardRecording();
      Alert.alert('Saved!', 'Your entry has been saved.');
    } catch (err: any) {
      Alert.alert('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  }

  const isRecording = recorder.state === 'recording';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Whisper</Text>
          <Text style={styles.subtitle}>your voice journal</Text>
        </View>

        <Text style={styles.timer}>{recorder.durationFormatted}</Text>

        <View style={styles.waveBox}>
          <Text style={styles.waveLabel}>
            {isRecording
              ? '● Recording...'
              : recorder.state === 'stopped'
              ? 'Recording complete'
              : 'Tap mic to start'}
          </Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => { recorder.discardRecording(); setTranscript(''); }}
            disabled={recorder.state === 'idle'}
          >
            <Text style={styles.sideBtnText}>Discard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={isRecording ? handleStopAndTranscribe : recorder.startRecording}
          >
            <Text style={styles.recordBtnIcon}>{isRecording ? '■' : '●'}</Text>
          </TouchableOpacity>

          <View style={{ width: 72 }} />
        </View>

        <Text style={styles.sectionLabel}>How are you feeling?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodBtn, selectedMood === m && styles.moodSelected]}
              onPress={() => setSelectedMood(m)}
            >
              <Text style={styles.moodEmoji}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Transcript</Text>
        <View style={styles.transcriptBox}>
          {transcribing
            ? <ActivityIndicator color="#c4572a" />
            : <Text style={transcript ? styles.transcriptText : styles.placeholder}>
                {transcript || 'Tap the mic to start. Your voice will be transcribed here.'}
              </Text>
          }
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (!transcript || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!transcript || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save entry</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf8f4' },
  container: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '500', color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#9b8e7e', fontStyle: 'italic' },
  timer: {
    fontSize: 48, fontWeight: '300', color: '#1a1a2e',
    textAlign: 'center', marginVertical: 16,
  },
  waveBox: {
    backgroundColor: '#f2ede4', borderWidth: 1, borderColor: '#ddd5c8',
    borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 24, minHeight: 80, justifyContent: 'center',
  },
  waveLabel: { color: '#9b8e7e', fontSize: 14 },
  btnRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 28,
  },
  sideBtn: { width: 72, alignItems: 'center' },
  sideBtnText: { color: '#9b8e7e', fontSize: 14 },
  recordBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#c4572a', alignItems: 'center', justifyContent: 'center',
  },
  recordBtnActive: { backgroundColor: '#c42a2a' },
  recordBtnIcon: { fontSize: 28, color: '#fff' },
  sectionLabel: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 1,
    color: '#9b8e7e', marginBottom: 10,
  },
  moodRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  moodBtn: {
    flex: 1, paddingVertical: 10, backgroundColor: '#f2ede4',
    borderWidth: 1.5, borderColor: '#ddd5c8',
    borderRadius: 10, alignItems: 'center',
  },
  moodSelected: { borderColor: '#c4572a', backgroundColor: 'rgba(196,87,42,0.08)' },
  moodEmoji: { fontSize: 20 },
  transcriptBox: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd5c8',
    borderRadius: 14, padding: 16, minHeight: 100,
    marginBottom: 20, justifyContent: 'center',
  },
  transcriptText: { fontStyle: 'italic', fontSize: 15, color: '#1a1a2e', lineHeight: 24 },
  placeholder: { color: '#ddd5c8', fontSize: 14, lineHeight: 22 },
  saveBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
