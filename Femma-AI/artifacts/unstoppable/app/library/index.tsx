import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalog } from '@/hooks/useCatalog';
import { libraryPath } from '@/lib/catalog';
import { useColors } from '@/hooks/useColors';

export default function LibraryIndex() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useCatalog();
  const topPad = insets.top + 8;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Text style={{ color: colors.foreground, fontFamily: 'Manrope_700Bold' }}>Could not load catalog</Text>
        <TouchableOpacity onPress={() => refetch()} style={[styles.retry, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: 40, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Course library</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Browse all published categories from Fema AI.</Text>
        {data.categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            activeOpacity={0.88}
            onPress={() => router.push(libraryPath(category.id) as never)}
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <LinearGradient colors={[`${category.color}30`, `${category.color}08`]} style={styles.cardAccent} />
            <View style={[styles.icon, { backgroundColor: `${category.color}18` }]}>
              <Feather name={category.icon} size={22} color={category.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{category.title}</Text>
              <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                {category.courses.length} courses
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retry: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  back: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: 'Manrope_500Medium', marginBottom: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardAccent: { ...StyleSheet.absoluteFill },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  cardMeta: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2 },
});
