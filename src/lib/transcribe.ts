const WHISPER_ENDPOINT = process.env.EXPO_PUBLIC_WHISPER_ENDPOINT!;
const WHISPER_KEY = process.env.EXPO_PUBLIC_WHISPER_KEY!;

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!WHISPER_KEY) {
    return '[Transcription not configured — check your .env file]';
  }

  // Detect if we're on web or mobile
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  
  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (isWeb) {
    // On web, audioUri is already a blob URL
    const response = await fetch(audioUri);
    blob = await response.blob();
    fileName = 'recording.webm';
    mimeType = 'audio/webm';
  } else {
    // On mobile, read from file system
    const response = await fetch(audioUri);
    blob = await response.blob();
    fileName = 'recording.m4a';
    mimeType = 'audio/m4a';
  }

  const formData = new FormData();
  formData.append('file', blob, fileName);
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