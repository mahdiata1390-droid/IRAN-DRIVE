import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface VoiceRecording {
  uri: string;
  durationMs: number;
}

/**
 * Microphone recording with level metering for a simple waveform.
 * Call `start()` after a press-hold, `stop()` to finish (returns the file),
 * `cancel()` to discard.
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [meter, setMeter] = useState<number[]>([]);
  const recRef = useRef<Audio.Recording | null>(null);
  const meterTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (meterTimer.current) clearInterval(meterTimer.current);
      void recRef.current?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) return false;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const options: Audio.RecordingOptions = {
      isMeteringEnabled: true,
      android: Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
      ios: Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
      web: { bitsPerSecond: 48000, mimeType: 'audio/webm' },
    };
    const { recording: rec } = await Audio.Recording.createAsync(options);
    recRef.current = rec;
    setRecording(true);
    setDurationMs(0);
    setMeter([]);

    const startedAt = Date.now();
    meterTimer.current = setInterval(() => {
      setDurationMs(Date.now() - startedAt);
      void rec.getStatusAsync().then((s) => {
        if (s.metering !== undefined && typeof s.metering === 'number') {
          // Roughly -60..0 dB → 0..1
          const level = Math.min(1, Math.max(0, (s.metering + 60) / 60));
          setMeter((m) => [...m.slice(-47), level]);
        }
      });
    }, 250);
    return true;
  }, []);

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    const rec = recRef.current;
    if (!rec) return null;
    if (meterTimer.current) clearInterval(meterTimer.current);
    setRecording(false);
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      const status = await rec.getStatusAsync();
      const finalDuration = (status.durationMillis as number | undefined) ?? durationMs;
      recRef.current = null;
      return uri ? { uri, durationMs: Math.max(500, finalDuration) } : null;
    } catch {
      recRef.current = null;
      return null;
    }
  }, [durationMs]);

  const cancel = useCallback(async () => {
    if (meterTimer.current) clearInterval(meterTimer.current);
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    setMeter([]);
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
      } catch {
        // already unloaded
      }
    }
  }, []);

  return { recording, durationMs, meter, start, stop, cancel };
}
