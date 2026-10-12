import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { dayLabel, formatINR, formatTimeRange } from '@/lib/format';
import type { Booking } from '@/lib/types';
import { colors, fonts, radius, shadow, space } from '@/theme';
import { BookingBadge, PaymentBadge, Txt, bookingTone, tap } from './ui';

const stripe = { blue: colors.sky, amber: colors.accent, green: colors.turf, red: colors.red, gray: colors.faint, violet: colors.violet };

/** Booking list row: status stripe, customer, slot, amount and a paid-progress bar. */
export function BookingCard({ booking: b }: { booking: Booking }) {
  const paidRatio = b.totalAmount > 0 ? Math.min(1, b.amountPaid / b.totalAmount) : 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Booking ${b.bookingCode}, ${b.customerName}`}
      onPress={() => {
        tap();
        router.push(`/booking/${b.id}`);
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
    >
      <View style={[styles.stripe, { backgroundColor: stripe[bookingTone[b.status]] }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="heading" numberOfLines={1}>
              {b.customerName}
            </Txt>
            <Txt variant="caption">{b.bookingCode}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Txt style={styles.amount}>{formatINR(b.totalAmount)}</Txt>
            <Txt variant="caption">{formatINR(b.amountPaid)} paid</Txt>
          </View>
        </View>
        <View style={styles.slot}>
          <Ionicons name="calendar-outline" size={15} color={colors.muted} />
          <Txt variant="caption" style={{ color: colors.ink }}>
            {dayLabel(b.bookingDate)}
          </Txt>
          <View style={styles.dot} />
          <Ionicons name="time-outline" size={15} color={colors.muted} />
          <Txt variant="caption" style={{ color: colors.ink }}>
            {formatTimeRange(b.timeIn, b.timeOut)}
          </Txt>
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${paidRatio * 100}%` }]} />
        </View>
        <View style={styles.badges}>
          <BookingBadge status={b.status} />
          <PaymentBadge status={b.paymentStatus} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow,
  },
  stripe: { width: 4 },
  body: { flex: 1, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', gap: space.md },
  amount: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink, fontVariant: ['tabular-nums'] },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.faint, marginHorizontal: 2 },
  progress: { height: 5, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.turf, borderRadius: 3 },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
