import Ionicons from '@expo/vector-icons/Ionicons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RevenueChart } from '@/components/revenue-chart';
import { Avatar, BookingBadge, Button, Card, ChipRow, Chip, ErrorState, SectionHeader, Skeleton, Txt, tap, type IconName } from '@/components/ui';
import { useRevenue, useSummary, useUpcoming } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatINR, formatTimeRange, greeting } from '@/lib/format';
import type { DateRange } from '@/lib/types';
import { colors, fonts, radius, shadow, space } from '@/theme';

const ranges: { value: DateRange | undefined; label: string }[] = [
  { value: undefined, label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

/** TODAY / TMRW / FRI — the small label above the date number. */
function shortDay(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return 'TODAY';
  if (isTomorrow(d)) return 'TMRW';
  return format(d, 'EEE').toUpperCase();
}

function Stat({ icon, label, value, sub, loading }: { icon: IconName; label: string; value: string; sub?: string; loading: boolean }) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={colors.turf} />
      </View>
      <Txt variant="caption" style={{ marginTop: space.md }}>
        {label}
      </Txt>
      {loading ? <Skeleton height={26} width="70%" style={{ marginTop: 4 }} /> : <Txt style={styles.statValue}>{value}</Txt>}
      {sub ? (
        <Txt variant="caption" style={{ fontSize: 12 }} numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
    </Card>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const summary = useSummary(range);
  const upcoming = useUpcoming(5);
  const revenue = useRevenue(6);
  const s = summary.data;
  const refreshing = summary.isRefetching || upcoming.isRefetching || revenue.isRefetching;
  const rangeLabel = ranges.find((r) => r.value === range)?.label ?? 'All time';

  const refresh = () => Promise.all([summary.refetch(), upcoming.refetch(), revenue.refetch()]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.white} />}
    >
      <LinearGradient colors={[colors.navy900, colors.navy, colors.navy700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + space.lg }]}>
        <View style={[styles.glow, { pointerEvents: 'none' }]} />
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {format(new Date(), 'EEEE, d MMMM')}
            </Txt>
            <Txt style={styles.hello} numberOfLines={1}>
              {greeting()}, {user?.name.split(' ')[0]}
            </Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Account" onPress={() => router.push('/more')}>
            <Avatar name={user?.name ?? '?'} src={user?.profileImage} size={46} dark />
          </Pressable>
        </View>
        <View style={{ marginHorizontal: -space.lg, marginTop: space.lg }}>
          <ChipRow>
            {ranges.map((r) => (
              <Chip key={r.label} label={r.label} active={range === r.value} onPress={() => setRange(r.value)} dark />
            ))}
          </ChipRow>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.hero}>
          <LinearGradient colors={[colors.turf, '#0B6E49']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroInner}>
            <View style={[styles.heroGlow, { pointerEvents: 'none' }]} />
            <Txt variant="overline" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Payments collected · {rangeLabel}
            </Txt>
            {summary.isPending ? (
              <Skeleton height={44} width="60%" style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            ) : (
              <Txt style={styles.heroValue}>{formatINR(s?.totalPayments)}</Txt>
            )}
            <View style={styles.heroRow}>
              <View style={styles.heroPill}>
                <Ionicons name="today-outline" size={14} color={colors.white} />
                <Txt style={styles.heroPillText}>Today {formatINR(s?.todayRevenue)}</Txt>
              </View>
              {!!s?.paymentsBreakdown.refunded && (
                <View style={styles.heroPill}>
                  <Ionicons name="return-down-back-outline" size={14} color={colors.white} />
                  <Txt style={styles.heroPillText}>{formatINR(s.paymentsBreakdown.refunded)} refunded</Txt>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {summary.error ? (
          <Card>
            <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
          </Card>
        ) : (
          <View style={styles.grid}>
            <Stat
              icon="calendar"
              label="Court bookings"
              value={String(s?.totalBookings ?? 0)}
              sub={s ? `${s.bookingsByStatus.UPCOMING} upcoming · ${s.bookingsByStatus.CANCELLED} cancelled` : undefined}
              loading={summary.isPending}
            />
            <Stat
              icon="flash"
              label="Playing now"
              value={String(s?.bookingsByStatus.ONGOING ?? 0)}
              sub={`${s?.bookingsByStatus.COMPLETED ?? 0} completed`}
              loading={summary.isPending}
            />
            <Stat
              icon="hourglass"
              label="Outstanding"
              value={formatINR(s?.outstandingAmount)}
              sub="Still to collect"
              loading={summary.isPending}
            />
            <Stat icon="pricetag" label="Booked value" value={formatINR(s?.bookingValue)} sub={rangeLabel} loading={summary.isPending} />
          </View>
        )}

        <Button title="New booking" icon="add-circle" onPress={() => router.push('/booking/form')} />

        <Card>
          <SectionHeader title="Payments received" action={<Txt variant="caption">Last 6 months</Txt>} />
          {revenue.isPending ? (
            <Skeleton height={190} />
          ) : revenue.error ? (
            <ErrorState message={errorMessage(revenue.error)} onRetry={() => revenue.refetch()} />
          ) : (
            <RevenueChart data={revenue.data} />
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Upcoming"
            action={
              <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/bookings', params: { status: 'UPCOMING' } })} hitSlop={8}>
                <Txt variant="label" style={{ color: colors.turf }}>
                  View all
                </Txt>
              </Pressable>
            }
          />
          {upcoming.isPending ? (
            <View style={{ gap: space.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={56} />
              ))}
            </View>
          ) : upcoming.error ? (
            <ErrorState message={errorMessage(upcoming.error)} onRetry={() => upcoming.refetch()} />
          ) : upcoming.data.length === 0 ? (
            <Txt variant="caption" style={{ textAlign: 'center', paddingVertical: space.xl }}>
              No upcoming bookings.
            </Txt>
          ) : (
            upcoming.data.map((b, i) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={`${b.customerName}, ${formatTimeRange(b.timeIn, b.timeOut)}`}
                onPress={() => {
                  tap();
                  router.push(`/booking/${b.id}`);
                }}
                style={({ pressed }) => [styles.upcoming, i > 0 && styles.upcomingBorder, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.when, b.status === 'ONGOING' && { backgroundColor: colors.amberSoft }]}>
                  <Txt style={[styles.whenDay, b.status === 'ONGOING' && { color: colors.amber }]}>{shortDay(b.bookingDate)}</Txt>
                  <Txt style={[styles.whenNum, b.status === 'ONGOING' && { color: colors.amber }]}>{format(parseISO(b.bookingDate), 'd')}</Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="label" numberOfLines={1}>
                    {b.customerName}
                  </Txt>
                  <Txt variant="caption">{formatTimeRange(b.timeIn, b.timeOut)}</Txt>
                </View>
                {b.status === 'ONGOING' ? <BookingBadge status="ONGOING" /> : <Txt variant="label">{formatINR(b.totalAmount)}</Txt>}
              </Pressable>
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: 88, overflow: 'hidden' },
  glow: { position: 'absolute', right: -60, top: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.turfGlow, opacity: 0.22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hello: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.white, letterSpacing: 0.5 },
  body: { paddingHorizontal: space.lg, gap: space.lg, marginTop: -68 },
  hero: { borderRadius: radius.xl, ...shadow },
  heroInner: { borderRadius: radius.xl, padding: space.xl, overflow: 'hidden' },
  heroGlow: { position: 'absolute', right: -40, bottom: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.accent, opacity: 0.14 },
  heroValue: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.white, letterSpacing: 0.5, marginTop: 4 },
  heroRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.sm },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  heroPillText: { color: colors.white, fontFamily: fonts.medium, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexBasis: '47%', flexGrow: 1 },
  statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.turf50, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  upcomingBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  when: { width: 52, height: 46, borderRadius: radius.md, backgroundColor: colors.turf50, alignItems: 'center', justifyContent: 'center' },
  whenDay: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.6, color: colors.turf },
  whenNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: colors.turf },
});
