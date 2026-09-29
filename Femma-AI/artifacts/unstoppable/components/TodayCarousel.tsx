import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type CarouselItem = {
  id: string;
  tag: string;
  title: string;
  meta: string;
  media: React.ReactNode;
  onPress?: () => void;
  completed?: boolean;
  skipped?: boolean;
};

type Props = {
  title: string;
  items: CarouselItem[];
  onSeeAll?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Today Tasks default 16/10; Program cards use 4/5. */
  mediaAspectRatio?: number;
  /** Card width in px. Default 240. */
  cardWidth?: number;
};

function CarouselCard({
  item,
  titleColor,
  metaColor,
  tagColor,
  mediaAspectRatio,
  cardWidth,
}: {
  item: CarouselItem;
  titleColor: string;
  metaColor: string;
  tagColor: string;
  mediaAspectRatio: number;
  cardWidth: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={item.onPress}
      disabled={!item.onPress}
    >
      <View style={[styles.mediaWrap, { aspectRatio: mediaAspectRatio }]}>
        {item.media}
        {item.completed ? (
          <View style={styles.doneBadge}>
            <Feather name="check" size={14} color="#FFFFFF" />
          </View>
        ) : item.skipped ? (
          <View style={styles.skipBadge}>
            <Feather name="minus" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      {item.tag ? (
        <Text style={[styles.tag, { color: tagColor }]} numberOfLines={1}>
          {item.tag.toUpperCase()}
        </Text>
      ) : null}
      <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
        {item.title}
      </Text>
      {item.meta ? (
        <Text style={[styles.meta, { color: metaColor }]} numberOfLines={1}>
          {item.meta}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function TodayCarousel({
  title,
  items,
  onSeeAll,
  style,
  mediaAspectRatio = 16 / 10,
  cardWidth = 240,
}: Props) {
  const colors = useColors();

  if (!items.length) return null;

  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {onSeeAll ? (
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={onSeeAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>See all</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        decelerationRate="fast"
      >
        {items.map((item) => (
          <CarouselCard
            key={item.id}
            item={item}
            tagColor={colors.lavender}
            titleColor={colors.foreground}
            metaColor={colors.mutedForeground}
            mediaAspectRatio={mediaAspectRatio}
            cardWidth={cardWidth}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 8,
    paddingTop: 0,
    paddingBottom: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
  },
  row: {
    paddingHorizontal: 22,
    gap: 14,
  },
  card: {
    gap: 6,
  },
  mediaWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    position: 'relative',
  },
  doneBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
  },
  skipBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#94A3B8',
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    marginTop: 0,
  },
});
