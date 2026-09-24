import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchGifs, trendingGifs, type GifItem } from '@/lib/gifs';
import { C, R } from '@/lib/theme';
import { t } from '@/i18n';
import { GlassBottomSheet, GlassSurface } from '@/components/ui';

/**
 * Tenor-backed GIF picker. Presented as a bottom sheet from the composer.
 * Shows trending by default and live search results as the user types.
 */
export function GifPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (gif: GifItem) => void;
}) {
  const tr = t();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    const res = q.trim() ? await searchGifs(q) : await trendingGifs();
    setItems(res);
    setError(res.length === 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    void load('');
  }, [visible, load]);

  const debouncedSearch = useCallback(
    (v: string) => {
      setQuery(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void load(v), 350);
    },
    [load],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: C.overlay }} onPress={onClose}>
        <Pressable
          style={{
            marginTop: 'auto',
            height: '62%',
            paddingBottom: 16,
          }}
          onPress={() => {}}
        >
          <GlassBottomSheet style={{ height: '100%', paddingTop: 10, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl }}>
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong }} />
            </View>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, paddingHorizontal: 16, marginBottom: 8 }}>
              {tr.composer.gif}
            </Text>
            <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
              <GlassSurface style={{ paddingHorizontal: 12, paddingVertical: 2, borderRadius: R.m }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="search" size={18} color={C.textFaint} />
                  <TextInput
                    value={query}
                    onChangeText={debouncedSearch}
                    placeholder={tr.composer.gifSearchPlaceholder}
                    placeholderTextColor={C.textFaint}
                    autoCapitalize="none"
                    style={{ flex: 1, paddingVertical: 10, color: C.text, fontSize: 14.5 }}
                  />
                  {query.length > 0 ? (
                    <Pressable onPress={() => debouncedSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={C.textFaint} />
                    </Pressable>
                  ) : null}
                </View>
              </GlassSurface>
            </View>

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.red} />
              </View>
            ) : error ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
                <Ionicons name="cloud-offline-outline" size={30} color={C.textFaint} />
                <Text style={{ color: C.textFaint, textAlign: 'center', fontSize: 13 }}>
                  {tr.composer.gifUnavailable}
                </Text>
              </View>
            ) : (
              <FlatList
                data={items}
                numColumns={2}
                keyExtractor={(g) => g.id}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}
                columnWrapperStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      onPick(item);
                      onClose();
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      aspectRatio: item.width / item.height,
                      maxHeight: 180,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: C.surface,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <GifImage gif={item} />
                  </Pressable>
                )}
              />
            )}
          </GlassBottomSheet>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Animated preview. Uses a plain <Image> so the same code path works on
 * native and web; Tenor URLs are GIFs, which both platforms render.
 */
function GifImage({ gif }: { gif: GifItem }) {
  if (!gif.preview) return null;
  return (
    <Image
      source={{ uri: gif.preview }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
      accessibilityLabel={gif.alt}
    />
  );
}
