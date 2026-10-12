import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingCard } from '@/components/booking-card';
import { GradientHeader } from '@/components/header';
import { Chip, ChipRow, EmptyState, ErrorState, Input, Skeleton, tap } from '@/components/ui';
import { useBookingCounts, useBookings } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { errorMessage } from '@/lib/api';
import type { BookingStatus, DateRange } from '@/lib/types';
import { colors, radius, shadow, space } from '@/theme';

const statuses: { value: BookingStatus | undefined; label: string; key: BookingStatus | 'ALL' }[] = [
  { value: undefined, label: 'All', key: 'ALL' },
  { value: 'UPCOMING', label: 'Upcoming', key: 'UPCOMING' },
  { value: 'ONGOING', label: 'Ongoing', key: 'ONGOING' },
  { value: 'COMPLETED', label: 'Completed', key: 'COMPLETED' },
  { value: 'CANCELLED', label: 'Cancelled', key: 'CANCELLED' },
];

const ranges: { value: DateRange | undefined; label: string }[] = [
  { value: undefined, label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ status?: BookingStatus }>();
  const [status, setStatus] = useState<BookingStatus | undefined>(params.status);
  const [range, setRange] = useState<DateRange | undefined>();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 350);

  // "View all upcoming" from the dashboard switches the filter (derived during render, not in an effect).
  const [seenParam, setSeenParam] = useState(params.status);
  if (params.status !== seenParam) {
    setSeenParam(params.status);
    if (params.status) setStatus(params.status);
  }

  const list = useBookings({ status, range, q: q || undefined });
  const counts = useBookingCounts({ range, q: q || undefined });
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title="Bookings" subtitle="Manage the turf">
        <View style={{ marginTop: space.lg }}>
          <Input icon="search" value={search} onChangeText={setSearch} placeholder="Search name, phone or code" returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing" />
        </View>
      </GradientHeader>

      <View style={styles.filters}>
        <ChipRow>
          {statuses.map((s) => (
            <Chip key={s.key} label={s.label} count={counts.data?.[s.key]} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </ChipRow>
        <ChipRow>
          {ranges.map((r) => (
            <Chip key={r.label} label={r.label} active={range === r.value} onPress={() => setRange(r.value)} />
          ))}
        </ChipRow>
      </View>

      <FlatList
        data={items}
        keyExtractor={(b) => String(b.id)}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 110, gap: space.md }}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => list.refetch()} tintColor={colors.turf} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: space.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={150} style={{ borderRadius: radius.lg }} />
              ))}
            </View>
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState icon="calendar-clear-outline" title="No bookings" message="Nothing matches these filters." />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.turf} style={{ marginTop: space.md }} /> : null}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New booking"
        onPress={() => {
          tap();
          router.push('/booking/form');
        }}
        style={({ pressed }) => [styles.fab, { bottom: space.xl, opacity: pressed ? 0.85 : 1 }, insets.bottom > 0 && { bottom: space.lg }]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xs, backgroundColor: colors.bg },
  fab: {
    position: 'absolute',
    right: space.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.turf,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
});
