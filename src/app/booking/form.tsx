import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, format, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '@/components/header';
import { useToast } from '@/components/toast';
import { Button, Card, Chip, ChipRow, ErrorState, Input, Skeleton, Txt, tap } from '@/components/ui';
import { useBooking, usePricing, useSaveBooking } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { formatINR, toISODate } from '@/lib/format';
import { estimatePrice, TIME_OPTIONS, toMinutes } from '@/lib/pricing';
import type { Booking, BookingInput, PaymentType } from '@/lib/types';
import { colors, fonts, radius, space } from '@/theme';

const PHONE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hhmm = (t: string) => t.slice(0, 5);
const label = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const hh = h % 24;
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(m).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
};

function Form({ booking }: { booking?: Booking }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const save = useSaveBooking();
  const pricing = usePricing();
  const isEdit = !!booking;

  const [name, setName] = useState(booking?.customerName ?? '');
  const [phone, setPhone] = useState(booking?.customerPhone ?? '');
  const [email, setEmail] = useState(booking?.customerEmail ?? '');
  const [date, setDate] = useState(booking?.bookingDate ?? toISODate(new Date()));
  const [timeIn, setTimeIn] = useState(booking ? hhmm(booking.timeIn) : '18:00');
  const [timeOut, setTimeOut] = useState(booking ? hhmm(booking.timeOut) : '19:00');
  const [guests, setGuests] = useState(booking?.additionalGuests ?? 0);
  const [notes, setNotes] = useState(booking?.notes ?? '');
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<PaymentType>('UPI');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const days = useMemo(() => {
    const today = new Date();
    const list = Array.from({ length: 31 }, (_, i) => toISODate(addDays(today, i - 1)));
    if (booking && !list.includes(booking.bookingDate)) list.unshift(booking.bookingDate);
    return list;
  }, [booking]);

  const estimate = estimatePrice({ plans: pricing.data ?? [], date, timeIn, timeOut, additionalGuests: guests });

  function validate() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter the customer name';
    if (!PHONE.test(phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
    if (email.trim() && !EMAIL.test(email.trim())) e.email = 'Enter a valid email';
    const mins = toMinutes(timeOut) - toMinutes(timeIn);
    if (mins <= 0) e.time = 'Time out must be after time in';
    else if (mins > 360) e.time = 'A booking can be at most 6 hours';
    if (payAmount && !(Number(payAmount) > 0)) e.pay = 'Enter an amount above 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    // On edit, only send slot fields that changed: they make the server re-price the booking.
    const slotChanged =
      !booking ||
      date !== booking.bookingDate ||
      timeIn !== hhmm(booking.timeIn) ||
      timeOut !== hhmm(booking.timeOut) ||
      guests !== booking.additionalGuests;
    const input = {
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim() || undefined,
      notes: notes.trim() || undefined,
      ...(slotChanged && { bookingDate: date, timeIn, timeOut, additionalGuests: guests }),
      ...(!isEdit && payAmount && { payment: { amount: Number(payAmount), paymentType: payType } }),
    } as BookingInput;
    try {
      const saved = await save.mutateAsync({ id: booking?.id, input });
      toast(isEdit ? 'Booking updated' : `Booking ${saved.bookingCode} created`);
      if (isEdit && router.canGoBack()) router.back();
      else router.replace(`/booking/${saved.id}`);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title={isEdit ? 'Edit booking' : 'New booking'} subtitle={isEdit ? booking.bookingCode : 'Reserve a slot'} back />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + 120 }}>
          {errors.form && (
            <View style={styles.formError} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.red} />
              <Txt variant="caption" style={{ color: colors.red, flex: 1 }}>
                {errors.form}
              </Txt>
            </View>
          )}

          <Card style={{ gap: space.lg }}>
            <Txt variant="overline">Customer</Txt>
            <Input label="Customer name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" autoCapitalize="words" />
            <Input label="Phone" value={phone} onChangeText={setPhone} error={errors.phone} icon="call-outline" keyboardType="phone-pad" />
            <Input label="Email (optional)" value={email} onChangeText={setEmail} error={errors.email} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
          </Card>

          <Card padded={false} style={{ paddingVertical: space.lg, gap: space.md }}>
            <Txt variant="overline" style={{ paddingHorizontal: space.lg }}>
              Date
            </Txt>
            <ChipRow activeIndex={days.indexOf(date)}>
              {days.map((d) => {
                const active = d === date;
                const dt = parseISO(d);
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    aria-selected={active}
                    accessibilityLabel={format(dt, 'EEEE d MMMM')}
                    onPress={() => {
                      tap();
                      setDate(d);
                    }}
                    style={[styles.day, active && styles.dayActive]}
                  >
                    <Txt style={[styles.dayWeek, active && { color: 'rgba(255,255,255,0.8)' }]}>{format(dt, 'EEE')}</Txt>
                    <Txt style={[styles.dayNum, active && { color: colors.white }]}>{format(dt, 'd')}</Txt>
                    <Txt style={[styles.dayWeek, active && { color: 'rgba(255,255,255,0.8)' }]}>{format(dt, 'MMM')}</Txt>
                  </Pressable>
                );
              })}
            </ChipRow>

            <Txt variant="overline" style={{ paddingHorizontal: space.lg, marginTop: space.sm }}>
              Time in · {label(timeIn)}
            </Txt>
            <ChipRow activeIndex={TIME_OPTIONS.indexOf(timeIn)}>
              {TIME_OPTIONS.slice(0, -1).map((t) => (
                <Chip key={t} label={label(t)} active={timeIn === t} onPress={() => setTimeIn(t)} />
              ))}
            </ChipRow>
            <Txt variant="overline" style={{ paddingHorizontal: space.lg, marginTop: space.sm }}>
              Time out · {label(timeOut)}
            </Txt>
            <ChipRow activeIndex={TIME_OPTIONS.indexOf(timeOut) - 1}>
              {TIME_OPTIONS.slice(1).map((t) => (
                <Chip key={t} label={label(t)} active={timeOut === t} onPress={() => setTimeOut(t)} />
              ))}
            </ChipRow>
            {errors.time && (
              <Txt variant="caption" style={{ color: colors.red, paddingHorizontal: space.lg }} accessibilityRole="alert">
                {errors.time}
              </Txt>
            )}

            <View style={styles.stepperRow}>
              <View style={{ flex: 1 }}>
                <Txt variant="label">Additional guests</Txt>
                <Txt variant="caption">Players above the {estimate?.maxGuests ?? 14} included</Txt>
              </View>
              <View style={styles.stepper}>
                <Pressable accessibilityRole="button" accessibilityLabel="Fewer guests" onPress={() => { tap(); setGuests((g) => Math.max(0, g - 1)); }} style={styles.stepBtn}>
                  <Ionicons name="remove" size={18} color={colors.ink} />
                </Pressable>
                <Txt style={styles.stepValue}>{guests}</Txt>
                <Pressable accessibilityRole="button" accessibilityLabel="More guests" onPress={() => { tap(); setGuests((g) => Math.min(50, g + 1)); }} style={styles.stepBtn}>
                  <Ionicons name="add" size={18} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          </Card>

          <Card>
            <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />
          </Card>

          {!isEdit && (
            <Card style={{ gap: space.lg }}>
              <Txt variant="overline">Payment received now (optional)</Txt>
              <Input label="Amount (₹)" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" error={errors.pay} icon="cash-outline" placeholder="0" />
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                {(['UPI', 'CASH', 'BANK_TRANSFER'] as const).map((m) => (
                  <Chip key={m} label={m === 'BANK_TRANSFER' ? 'Bank transfer' : m === 'CASH' ? 'Cash' : 'UPI'} active={payType === m} onPress={() => setPayType(m)} />
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {estimate ? `${estimate.planName} · ${estimate.totalHours} hr${guests ? ` · +${guests} guests` : ''}` : 'Pick a valid time'}
          </Txt>
          <Txt style={styles.footerTotal}>{estimate ? formatINR(estimate.totalAmount) : '—'}</Txt>
        </View>
        <Button title={isEdit ? 'Save' : 'Create'} kind="accent" icon="checkmark" loading={save.isPending} onPress={submit} style={{ minWidth: 130 }} />
      </View>
    </View>
  );
}

export default function BookingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const bookingId = id ? Number(id) : NaN;
  const existing = useBooking(bookingId);

  if (!id) return <Form />;
  if (existing.isPending) {
    return (
      <View style={{ flex: 1 }}>
        <GradientHeader title="Edit booking" back />
        <View style={{ padding: space.lg, gap: space.md }}>
          <Skeleton height={200} style={{ borderRadius: radius.lg }} />
          <Skeleton height={240} style={{ borderRadius: radius.lg }} />
        </View>
      </View>
    );
  }
  if (existing.error) {
    return (
      <View style={{ flex: 1 }}>
        <GradientHeader title="Edit booking" back />
        <ErrorState message={errorMessage(existing.error)} onRetry={() => existing.refetch()} />
      </View>
    );
  }
  return <Form booking={existing.data} />;
}

const styles = StyleSheet.create({
  formError: { flexDirection: 'row', gap: space.sm, alignItems: 'center', backgroundColor: colors.redSoft, borderRadius: radius.md, padding: space.md },
  day: { width: 62, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center' },
  dayActive: { backgroundColor: colors.turf, borderColor: colors.turf },
  dayWeek: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  dayNum: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, marginTop: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.pill, padding: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: fonts.semibold, fontSize: 16, minWidth: 24, textAlign: 'center', color: colors.ink },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.navy,
  },
  footerTotal: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, color: colors.accent },
});
