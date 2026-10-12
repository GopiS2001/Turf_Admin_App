import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { GradientHeader } from '@/components/header';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, ChipRow, EmptyState, EnquiryBadge, ErrorState, Skeleton, Txt, tap, type IconName } from '@/components/ui';
import { useEnquiries, useUpdateEnquiry } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { EnquiryStatus } from '@/lib/types';
import { colors, fonts, radius, space } from '@/theme';

const STATUSES: EnquiryStatus[] = ['NEW', 'CONTACTED', 'CLOSED'];
const STATUS_LABEL: Record<EnquiryStatus, string> = { NEW: 'New', CONTACTED: 'Contacted', CLOSED: 'Closed' };
const STATUS_ICON: Record<EnquiryStatus, IconName> = {
  NEW: 'sparkles-outline',
  CONTACTED: 'call-outline',
  CLOSED: 'checkmark-done-outline',
};

const filters: { value: EnquiryStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function EnquiriesScreen() {
  const toast = useToast();
  const [status, setStatus] = useState<EnquiryStatus | undefined>();
  const list = useEnquiries(status);
  const update = useUpdateEnquiry();
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  async function setEnquiryStatus(id: number, current: EnquiryStatus, next: EnquiryStatus) {
    if (next === current) return;
    try {
      await update.mutateAsync({ id, status: next });
      toast(`Status changed to ${STATUS_LABEL[next]}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title="Enquiries" subtitle="From the website" back />
      <View style={{ paddingTop: space.md }}>
        <ChipRow>
          {filters.map((f) => (
            <Chip key={f.label} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ChipRow>
      </View>
      <FlatList
        data={items}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => list.refetch()} tintColor={colors.turf} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        renderItem={({ item: e }) => (
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="heading">{e.subject}</Txt>
                <Txt variant="caption">
                  {e.name} · {formatDateTime(e.createdAt)}
                </Txt>
              </View>
              <EnquiryBadge status={e.status} />
            </View>
            <Txt variant="body" style={{ color: '#3B4458' }}>
              {e.message}
            </Txt>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button small kind="secondary" icon="call-outline" title="Call" onPress={() => Linking.openURL(`tel:${e.phone.replace(/\s/g, '')}`)} />
              <Button small kind="secondary" icon="mail-outline" title="Email" onPress={() => Linking.openURL(`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.subject}`)}`)} />
            </View>
            <View style={styles.statusBox}>
              <Txt variant="overline">Status</Txt>
              <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={`Status for enquiry from ${e.name}`}>
                {STATUSES.map((st) => {
                  const active = e.status === st;
                  const saving = update.isPending && update.variables?.id === e.id && update.variables.status === st;
                  return (
                    <Pressable
                      key={st}
                      accessibilityRole="radio"
                      aria-checked={active}
                      aria-busy={saving}
                      disabled={update.isPending}
                      onPress={() => {
                        tap();
                        void setEnquiryStatus(e.id, e.status, st);
                      }}
                      style={[styles.segmentItem, active && styles.segmentActive]}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color={colors.turf} />
                      ) : (
                        <Ionicons name={STATUS_ICON[st]} size={15} color={active ? colors.white : colors.muted} />
                      )}
                      <Txt style={[styles.segmentText, active && { color: colors.white }]}>{STATUS_LABEL[st]}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: space.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={150} style={{ borderRadius: radius.lg }} />
              ))}
            </View>
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState icon="mail-open-outline" title="No enquiries" message="Messages from the website contact form appear here." />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.turf} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statusBox: { gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
    borderRadius: radius.sm + 2,
  },
  segmentActive: { backgroundColor: colors.turf },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
});
