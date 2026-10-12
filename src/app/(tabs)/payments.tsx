import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { GradientHeader } from '@/components/header';
import { Chip, ChipRow, EmptyState, ErrorState, Input, KindBadge, Skeleton, Txt, tap } from '@/components/ui';
import { usePayments } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatINR, humanize } from '@/lib/format';
import type { PaymentType } from '@/lib/types';
import { colors, fonts, radius, shadow, space } from '@/theme';

const types: { value: PaymentType | undefined; label: string }[] = [
  { value: undefined, label: 'All methods' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
];

const methodIcon = { UPI: 'phone-portrait-outline', CASH: 'cash-outline', BANK_TRANSFER: 'business-outline' } as const;

export default function PaymentsScreen() {
  const [type, setType] = useState<PaymentType | undefined>();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 350);
  const list = usePayments({ paymentType: type, q: q || undefined });
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title="Payments" subtitle="Money in & out">
        <View style={{ marginTop: space.lg }}>
          <Input icon="search" value={search} onChangeText={setSearch} placeholder="Customer, booking or transaction ID" autoCorrect={false} />
        </View>
      </GradientHeader>
      <View style={{ paddingTop: space.md }}>
        <ChipRow>
          {types.map((t) => (
            <Chip key={t.label} label={t.label} active={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </ChipRow>
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => list.refetch()} tintColor={colors.turf} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        renderItem={({ item: p }) => {
          const refund = p.kind === 'REFUND';
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tap();
                if (p.booking) router.push(`/booking/${p.booking.id}`);
              }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.icon, refund && { backgroundColor: colors.violetSoft }]}>
                <Ionicons name={methodIcon[p.paymentType]} size={20} color={refund ? colors.violet : colors.turf} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt variant="label" numberOfLines={1}>
                  {p.booking?.customerName ?? 'Booking'}
                </Txt>
                <Txt variant="caption" numberOfLines={1}>
                  {p.booking?.bookingCode} · {humanize(p.paymentType)}
                  {p.transactionId ? ` · ${p.transactionId}` : ''}
                </Txt>
                <Txt variant="caption" style={{ fontSize: 12 }}>
                  {formatDateTime(p.paidAt)}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Txt style={[styles.amount, refund && { color: colors.violet }]}>
                  {refund ? '−' : '+'}
                  {formatINR(p.amount)}
                </Txt>
                <KindBadge kind={p.kind} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: space.md }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={84} style={{ borderRadius: radius.lg }} />
              ))}
            </View>
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState icon="wallet-outline" title="No payments" message="Payments you record appear here." />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.turf} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow,
  },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.turf50, alignItems: 'center', justifyContent: 'center' },
  amount: { fontFamily: fonts.semibold, fontSize: 16, color: colors.turf, fontVariant: ['tabular-nums'] },
});
