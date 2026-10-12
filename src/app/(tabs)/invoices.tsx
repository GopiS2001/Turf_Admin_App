import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { GradientHeader } from '@/components/header';
import { Chip, ChipRow, EmptyState, ErrorState, Input, InvoiceBadge, Skeleton, Txt, tap } from '@/components/ui';
import { useInvoices } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatINR } from '@/lib/format';
import type { InvoiceStatus } from '@/lib/types';
import { colors, fonts, radius, shadow, space } from '@/theme';

const statuses: { value: InvoiceStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function InvoicesScreen() {
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 350);
  const list = useInvoices({ status, q: q || undefined });
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title="Invoices" subtitle="Billing">
        <View style={{ marginTop: space.lg }}>
          <Input icon="search" value={search} onChangeText={setSearch} placeholder="Invoice, customer or booking" autoCorrect={false} />
        </View>
      </GradientHeader>
      <View style={{ paddingTop: space.md }}>
        <ChipRow>
          {statuses.map((s) => (
            <Chip key={s.label} label={s.label} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </ChipRow>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => list.refetch()} tintColor={colors.turf} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        renderItem={({ item: inv }) => {
          // Nothing is owed on a cancelled or refunded invoice.
          const closed = inv.status === 'CANCELLED' || inv.status === 'REFUNDED';
          const due = closed ? 0 : Math.max(0, inv.amount - inv.paidAmount);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Invoice ${inv.invoiceCode}`}
              onPress={() => {
                tap();
                router.push(`/invoice/${inv.id}`);
              }}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
            >
              <View style={styles.top}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="overline" style={{ color: colors.turf }}>
                    {inv.invoiceCode}
                  </Txt>
                  <Txt variant="heading" numberOfLines={1}>
                    {inv.customerName}
                  </Txt>
                </View>
                <InvoiceBadge status={inv.status} />
              </View>
              <View style={styles.split}>
                <View>
                  <Txt variant="caption">Amount</Txt>
                  <Txt style={styles.money}>{formatINR(inv.amount)}</Txt>
                </View>
                <View>
                  <Txt variant="caption">Paid</Txt>
                  <Txt style={styles.money}>{formatINR(inv.paidAmount)}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="caption">Due</Txt>
                  <Txt style={[styles.money, due > 0 && { color: colors.amber }]}>{formatINR(due)}</Txt>
                </View>
              </View>
              <Txt variant="caption" style={{ fontSize: 12 }}>
                {formatDateTime(inv.invoiceDate)}
                {inv.booking ? ` · ${inv.booking.bookingCode}` : ''}
              </Txt>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: space.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={130} style={{ borderRadius: radius.lg }} />
              ))}
            </View>
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState icon="document-text-outline" title="No invoices" message="Invoices are created automatically with each booking." />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.turf} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md, ...shadow },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  split: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md },
  money: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
});
