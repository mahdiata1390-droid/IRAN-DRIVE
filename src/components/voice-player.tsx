import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { C } from '@/lib/theme';

type SoundInstance = Awaited<ReturnType<typeof Audio.Sound.createAsync>>['sound'];

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Play/pause/seek player for voice notes and audio files with a small
 * meter-driven waveform.
 */
export function VoicePlayer({
  uri,
  durationMs,
  waveform,
  mine,
}: {
  uri: string;
  durationMs: number;
  waveform?: number[];
  mine?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(durationMs);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef<SoundInstance | null>(null);

  const bars = useMemo(
    () =>
      waveform && waveform.length >= 8
        ? waveform
        : Array.from({ length: 24 }, (_, i) => 0.35 + 0.4 * Math.abs(Math.sin(i * 1.7))),
    [waveform],
  );

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, [uri]);

  const load = async (): Promise<SoundInstance> => {
    if (soundRef.current) return soundRef.current;
    setLoading(true);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { progressUpdateIntervalMillis: 200, shouldPlay: false },
      (s) => {
        if (s.isLoaded) {
          setPosition(s.positionMillis);
          if (s.durationMillis) setDuration(s.durationMillis);
          if (s.didJustFinish) {
            setPlaying(false);
            setPosition(0);
            void soundRef.current?.setPositionAsync(0);
          }
        }
      },
    );
    soundRef.current = sound;
    setLoading(false);
    return sound;
  };

  const toggle = () => {
    void (async () => {
      try {
        const sound = await load();
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;
        if (playing) {
          await sound.pauseAsync();
          setPlaying(false);
        } else {
          await sound.playAsync();
          setPlaying(true);
        }
      } catch {
        setPlaying(false);
      }
    })();
  };

  const seekTo = (fraction: number) => {
    void (async () => {
      const sound = soundRef.current;
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        await sound.setPositionAsync(fraction * status.durationMillis);
        setPosition(fraction * status.durationMillis);
      }
    })();
  };

  const color = mine ? '#fff' : C.text;
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 190 }}>
      <Pressable
        onPress={toggle}
        disabled={loading}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: mine ? 'rgba(255,255,255,0.2)' : C.red,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={loading ? 'hourglass' : playing ? 'pause' : 'play'} size={18} color="#fff" />
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 22 }}>
          {bars.slice(0, 24).map((level, i) => {
            const passed = i / bars.length <= progress;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: Math.max(3, Math.min(22, level * 22)),
                  borderRadius: 2,
                  backgroundColor: passed
                    ? mine
                      ? '#fff'
                      : C.red
                    : mine
                      ? 'rgba(255,255,255,0.35)'
                      : C.borderStrong,
                }}
              />
            );
          })}
        </View>
        <Text style={{ color, fontSize: 10.5, opacity: 0.8, fontVariant: ['tabular-nums'] }}>
          {fmt(position)} / {fmt(duration)}
        </Text>
      </View>

      {/* Seek shortcuts */}
      {[0.25, 0.5, 0.75].map((f) => (
        <Pressable key={f} onPress={() => seekTo(f)} style={{ width: 0, height: 0 }} />
      ))}
    </View>
  );
}
