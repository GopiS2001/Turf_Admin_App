import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentActions } from '@/components/document-actions';
import { GradientHeader } from '@/components/header';
import { useToast } from '@/components/toast';
import {
  BookingBadge,
  Button,
  Card,
  Chip,
  ErrorState,
  IconButton,
  Input,
  InvoiceBadge,
  KindBadge,
  PaymentBadge,
  Row,
  SectionHeader,
  Sheet,
  Skeleton,
  Txt,
  confirm,
} from '@/components/ui';
import { useAddPayment, useBooking, useCancelBooking, useDeleteBooking } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, formatINR, formatTime, humanize } from '@/lib/format';
import type { Booking, PaymentType } from '@/lib/types';
import { colors, fonts, radius, space } from '@/theme';

const methods: { value: PaymentType; label: string }[] = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
];

function PaymentSheet({ booking, visible, onClose }: { booking: Booking; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const add = useAddPayment();
  const cancelled = booking.status === 'CANCELLED';
  const balance = Math.max(0, booking.totalAmount - booking.amountPaid);
  const [refund, setRefund] = useState(cancelled);
  const [amount, setAmount] = useState(String((cancelled ? booking.amountPaid : balance) || ''));
  const [method, setMethod] = useState<PaymentType>('UPI');
  const [txn, setTxn] = useState('');
  const [error, setError] = useState<string>();

  async function save() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount above 0');
    setError(undefined);
    try {
      await add.mutateAsync({
        bookingId: booking.id,
        input: { amount: value, paymentType: method, kind: refund ? 'REFUND' : undefined, transactionId: txn.trim() || undefined },
      });
      toast(refund ? 'Refund recorded' : 'Payment recorded');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={refund ? 'Record a refund' : 'Record a payment'}>
      <View style={styles.sheetSummary}>
        <View>
          <Txt variant="caption">Paid so far</Txt>
          <Txt variant="heading">{formatINR(booking.amountPaid)}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="caption">Balance due</Txt>
          <Txt variant="heading">{formatINR(balance)}</Txt>
        </View>
      </View>
      {!cancelled && (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="Payment" active={!refund} onPress={() => { setRefund(false); setAmount(String(balance || '')); }} />
          <Chip label="Refund" active={refund} onPress={() => { setRefund(true); setAmount(String(booking.amountPaid || '')); }} />
        </View>
      )}
      <Input label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={error} icon="cash-outline" />
      <View style={{ gap: 6 }}>
        <Txt variant="label">Method</Txt>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {methods.map((m) => (
            <Chip key={m.value} label={m.label} active={method === m.value} onPress={() => setMethod(m.value)} />
          ))}
        </View>
      </View>
      <Input label="Transaction ID (optional)" value={txn} onChangeText={setTxn} autoCapitalize="characters" icon="receipt-outline" />
      <Button title={refund ? 'Save refund' : 'Save payment'} icon="checkmark-circle" loading={add.isPending} onPress={save} />
    </Sheet>
  );
}

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);
  const { data: b, isPending, error, refetch } = useBooking(bookingId);
  const cancel = useCancelBooking();
  const remove = useDeleteBooking();
  const [sheet, setSheet] = useState(false);

  if (isPending) {
    return (
      <View style={{ flex: 1 }}>
        <GradientHeader title="Booking" back />
        <View style={{ padding: space.lg, gap: space.md }}>
          {[160, 220, 180].map((h, i) => (
            <Skeleton key={i} height={h} style={{ borderRadius: radius.lg }} />
          ))}
        </View>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1 }}>
        <GradientHeader title="Booking" back />
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </View>
    );
  }

  const paidRatio = b.totalAmount > 0 ? Math.min(1, b.amountPaid / b.totalAmount) : 0;
  const overpaid = b.amountPaid - b.totalAmount > 0.005 ? b.amountPaid - b.totalAmount : 0;
  const canCancel = b.status === 'UPCOMING' || b.status === 'ONGOING';
  const canPay = b.status !== 'CANCELLED' || b.amountPaid > 0;

  async function onCancel() {
    const ok = await confirm(
      `Cancel ${b!.bookingCode}?`,
      `The slot will be freed.${b!.amountPaid > 0 ? ` ${formatINR(b!.amountPaid)} was paid — record a refund afterwards if needed.` : ''}`,
      'Cancel booking',
      true,
    );
    if (!ok) return;
    try {
      await cancel.mutateAsync(b!.id);
      toast('Booking cancelled');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function onDelete() {
    const ok = await confirm(`Delete ${b!.bookingCode}?`, 'This permanently removes the booking, its invoice and payments. To keep records, cancel instead.', 'Delete', true);
    if (!ok) return;
    try {
      await remove.mutateAsync(b!.id);
      toast('Booking deleted');
      // Opened from a link there may be no screen to return to.
      if (router.canGoBack()) router.back();
      else router.replace('/bookings');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader
        title={b.bookingCode}
        subtitle="Booking"
        back
        extraBottom={70}
        right={
          b.status !== 'CANCELLED' ? (
            <IconButton icon="create-outline" label="Edit booking" color={colors.white} bg="rgba(255,255,255,0.12)" onPress={() => router.push({ pathname: '/booking/form', params: { id: String(b.id) } })} />
          ) : null
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 110, gap: space.lg }} style={{ marginTop: -70 }}>
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <BookingBadge status={b.status} />
            <PaymentBadge status={b.paymentStatus} />
          </View>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">{b.customerName}</Txt>
              <Txt variant="caption">
                {formatDate(b.bookingDate)} · {formatTime(b.timeIn)} – {formatTime(b.timeOut)}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt style={styles.total}>{formatINR(b.totalAmount)}</Txt>
              <Txt variant="caption">total</Txt>
            </View>
          </View>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${paidRatio * 100}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="caption">Paid {formatINR(b.amountPaid)}</Txt>
            <Txt variant="caption" style={overpaid ? { color: colors.amber } : undefined}>
              {overpaid ? `Overpaid ${formatINR(overpaid)} — refund it` : `Due ${formatINR(Math.max(0, b.totalAmount - b.amountPaid))}`}
            </Txt>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Customer" />
          <Row label="Customer name" value={b.customerName} />
          <Row
            label="Phone"
            value={
              <Pressable accessibilityRole="link" accessibilityLabel={`Call ${b.customerPhone}`} onPress={() => Linking.openURL(`tel:${b.customerPhone.replace(/\s/g, '')}`)} hitSlop={8}>
                <Txt variant="label" style={{ color: colors.turf }}>
                  {b.customerPhone}
                </Txt>
              </Pressable>
            }
          />
          {b.customerEmail ? <Row label="Email" value={b.customerEmail} /> : null}
          <Row label="Booked via" value={humanize(b.source)} last />
        </Card>

        <Card>
          <SectionHeader title="Booking" />
          <Row label="Booking date" value={formatDate(b.bookingDate)} />
          <Row label="Time in" value={formatTime(b.timeIn)} />
          <Row label="Time out" value={formatTime(b.timeOut)} />
          <Row label="Total hours" value={String(b.totalHours)} />
          <Row label="Price (per hour)" value={formatINR(b.pricePerHour)} />
          <Row label="Turf booking amount" value={formatINR(b.turfAmount)} />
          <Row label="Maximum guests" value={String(b.maxGuests)} />
          <Row label="Price per guest" value={formatINR(b.pricePerGuest)} />
          <Row label="Additional guests" value={String(b.additionalGuests)} />
          <Row label="Additional guest amount" value={formatINR(b.additionalGuestAmount)} />
          <Row label="Total amount" value={formatINR(b.totalAmount)} />
          <Row label="Booked date & time" value={formatDateTime(b.bookedAt)} last={!b.notes} />
          {b.notes ? <Row label="Notes" value={b.notes} last /> : null}
        </Card>

        <Card>
          <SectionHeader title="Payment" />
          <Row label="Payment status" value={<PaymentBadge status={b.paymentStatus} />} />
          <Row label="Total amount paid" value={formatINR(b.amountPaid)} />
          <Row label="Payment type" value={humanize(b.paymentType)} />
          <Row label="Transaction ID" value={b.transactionId ?? '—'} />
          <Row label="Payment date & time" value={formatDateTime(b.paymentDate)} last={!b.invoice} />
          {b.invoice && (
            <Row
              label="Invoice"
              last
              value={
                <Pressable accessibilityRole="link" onPress={() => router.push(`/invoice/${b.invoice!.id}`)} style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt variant="label" style={{ color: colors.turf }}>
                    {b.invoice.invoiceCode}
                  </Txt>
                  <InvoiceBadge status={b.invoice.status} />
                </Pressable>
              }
            />
          )}
        </Card>

        <Card style={{ gap: space.lg }}>
          <View>
            <Txt variant="heading">Documents</Txt>
            <Txt variant="caption">Sent automatically on booking and when fully paid (if there&apos;s an email).</Txt>
          </View>
          <DocumentActions type="booking" bookingId={b.id} title="Booking confirmation" customerEmail={b.customerEmail} />
          {b.invoice && (
            <DocumentActions
              type="invoice"
              bookingId={b.id}
              title={`Invoice ${b.invoice.invoiceCode}`}
              subtitle={<InvoiceBadge status={b.invoice.status} />}
              customerEmail={b.customerEmail}
            />
          )}
        </Card>

        <Card>
          <SectionHeader title="Payment history" />
          {b.payments && b.payments.length > 0 ? (
            b.payments.map((p, i) => (
              <View key={p.id} style={[styles.payment, i > 0 && styles.paymentBorder]}>
                <View style={[styles.payIcon, p.kind === 'REFUND' && { backgroundColor: colors.violetSoft }]}>
                  <Ionicons name={p.kind === 'REFUND' ? 'arrow-undo' : 'arrow-down'} size={16} color={p.kind === 'REFUND' ? colors.violet : colors.turf} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="label">
                    {p.kind === 'REFUND' ? '−' : ''}
                    {formatINR(p.amount)} · {humanize(p.paymentType)}
                  </Txt>
                  <Txt variant="caption" numberOfLines={1}>
                    {formatDateTime(p.paidAt)}
                    {p.transactionId ? ` · ${p.transactionId}` : ''}
                  </Txt>
                </View>
                <KindBadge kind={p.kind} />
              </View>
            ))
          ) : (
            <Txt variant="caption">No payments yet.</Txt>
          )}
        </Card>

        <View style={{ gap: space.sm }}>
          {canCancel && <Button title="Cancel booking" kind="secondary" icon="close-circle-outline" loading={cancel.isPending} onPress={onCancel} />}
          <Button title="Delete booking" kind="danger" icon="trash-outline" loading={remove.isPending} onPress={onDelete} />
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + space.md }]}>
        <IconButton icon="call" label="Call customer" color={colors.turf} bg={colors.turf50} onPress={() => Linking.openURL(`tel:${b.customerPhone.replace(/\s/g, '')}`)} />
        {canPay && (
          <Button
            title={b.status === 'CANCELLED' ? 'Record refund' : 'Record payment'}
            icon="wallet"
            onPress={() => setSheet(true)}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {sheet && <PaymentSheet key={`${b.status}-${b.amountPaid}`} booking={b} visible={sheet} onClose={() => setSheet(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  total: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, color: colors.ink },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.turf, borderRadius: 4 },
  payment: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  paymentBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  payIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.turf50, alignItems: 'center', justifyContent: 'center' },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  sheetSummary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: colors.line },
});
