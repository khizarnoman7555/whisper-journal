const WHISPER_ENDPOINT = process.env.EXPO_PUBLIC_WHISPER_ENDPOINT!;
const WHISPER_KEY = process.env.EXPO_PUBLIC_WHISPER_KEY!;

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!WHISPER_KEY) {
    return '[Transcription not configured — check your .env file]';
  }

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as any);
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'en');
  formData.append('response_format', 'text');

  const response = await fetch(WHISPER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHISPER_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Transcription failed: ${err}`);
  }

  const text = await response.text();
  return text.trim();
}
