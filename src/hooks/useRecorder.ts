import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export type RecorderState = 'idle' | 'recording' | 'stopped';

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setState('recording');
      setDurationSeconds(0);
      setAudioUri(null);

      timerRef.current = setInterval(() => {
        setDurationSeconds((s) => s + 1);
      }, 1000);

      if (Platform.OS === 'web') {
        // Web recording using MediaRecorder API
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.start();
      } else {
        // Mobile recording using expo-av
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) throw new Error('Microphone permission denied');

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setState('idle');
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) return resolve(null);

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const uri = URL.createObjectURL(blob);
          setAudioUri(uri);
          setState('stopped');
          // Stop all tracks
          mediaRecorder.stream.getTracks().forEach(t => t.stop());
          resolve(uri);
        };

        mediaRecorder.stop();
      });
    } else {
      if (!recordingRef.current) return null;
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI() ?? null;
      recordingRef.current = null;
      setAudioUri(uri);
      setState('stopped');
      return uri;
    }
  }, []);

  const discardRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        } catch {}
        mediaRecorderRef.current = null;
      }
    } else {
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }
    }
    setState('idle');
    setDurationSeconds(0);
    setAudioUri(null);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    state,
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    audioUri,
    startRecording,
    stopRecording,
    discardRecording,
  };
}