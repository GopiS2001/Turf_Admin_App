import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentActions } from '@/components/document-actions';
import { GradientHeader } from '@/components/header';
import { Button, Card, ErrorState, InvoiceBadge, Row, SectionHeader, Skeleton, Txt } from '@/components/ui';
import { useInvoice } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, formatINR, formatTime, humanize } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';

export default function InvoiceScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: inv, isPending, error, refetch } = useInvoice(Number(id));

  if (isPending || error) {
    return (
      <View style={{ flex: 1 }}>
        <GradientHeader title="Invoice" back />
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <View style={{ padding: space.lg, gap: space.md }}>
            <Skeleton height={260} style={{ borderRadius: radius.lg }} />
            <Skeleton height={160} style={{ borderRadius: radius.lg }} />
          </View>
        )}
      </View>
    );
  }

  const b = inv.booking;
  // Nothing is owed on a cancelled or refunded invoice.
  const closed = inv.status === 'CANCELLED' || inv.status === 'REFUNDED';
  const due = closed ? 0 : Math.max(0, inv.amount - inv.paidAmount);

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title={inv.invoiceCode} subtitle="Invoice" back extraBottom={60} />
      <ScrollView style={{ marginTop: -60 }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xxl }}>
        <Card style={{ gap: space.lg }}>
          <View style={styles.headRow}>
            <View style={styles.logo}>
              <View style={styles.logoRing} />
              <View style={styles.logoStar} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={styles.brand}>
                90<Txt style={[styles.brand, { color: colors.turf }]}>s</Txt> TURF
              </Txt>
              <Txt variant="caption">Billed {formatDateTime(inv.invoiceDate)}</Txt>
            </View>
            <InvoiceBadge status={inv.status} />
          </View>

          <View>
            <Txt variant="overline">Billed to</Txt>
            <Txt variant="heading" style={{ marginTop: 4 }}>
              {inv.customerName}
            </Txt>
            {b && <Txt variant="caption">{b.customerPhone}</Txt>}
          </View>

          {b && (
            <View style={styles.lines}>
              <View style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">Turf booking</Txt>
                  <Txt variant="caption">
                    {b.totalHours} hr × {formatINR(b.pricePerHour)}
                  </Txt>
                </View>
                <Txt variant="label">{formatINR(b.turfAmount)}</Txt>
              </View>
              {b.additionalGuests > 0 && (
                <View style={styles.line}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="label">Additional guests</Txt>
                    <Txt variant="caption">
                      {b.additionalGuests} × {formatINR(b.pricePerGuest)}
                    </Txt>
                  </View>
                  <Txt variant="label">{formatINR(b.additionalGuestAmount)}</Txt>
                </View>
              )}
            </View>
          )}

          <View style={{ gap: 6 }}>
            <View style={styles.sum}>
              <Txt variant="caption">Total</Txt>
              <Txt variant="label">{formatINR(inv.amount)}</Txt>
            </View>
            <View style={styles.sum}>
              <Txt variant="caption">Paid</Txt>
              <Txt variant="label">{formatINR(inv.paidAmount)}</Txt>
            </View>
            <View style={[styles.sum, styles.due]}>
              <Txt variant="heading">Balance due</Txt>
              <Txt style={styles.dueValue}>{formatINR(due)}</Txt>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Details" />
          <Row label="Invoice code" value={inv.invoiceCode} />
          <Row label="Customer name" value={inv.customerName} />
          <Row label="Invoice date & time" value={formatDateTime(inv.invoiceDate)} />
          <Row label="Payment amount" value={formatINR(inv.amount)} />
          <Row label="Paid date & time" value={formatDateTime(inv.paidAt)} />
          <Row label="Status" value={<InvoiceBadge status={inv.status} />} last={!b} />
          {b && <Row label="Slot" value={`${formatDate(b.bookingDate, 'd MMM')} · ${formatTime(b.timeIn)}–${formatTime(b.timeOut)}`} last />}
        </Card>

        {b?.payments && b.payments.length > 0 && (
          <Card>
            <SectionHeader title="Payments" />
            {b.payments.map((p, i) => (
              <Row
                key={p.id}
                last={i === b.payments!.length - 1}
                label={`${humanize(p.kind)} · ${humanize(p.paymentType)}`}
                value={`${p.kind === 'REFUND' ? '−' : ''}${formatINR(p.amount)}`}
              />
            ))}
          </Card>
        )}

        <Card>
          <SectionHeader title="Invoice PDF" />
          <DocumentActions type="invoice" bookingId={inv.bookingId} customerEmail={b?.customerEmail} />
        </Card>

        {b && (
          <Button
            title={`Open booking ${b.bookingCode}`}
            kind="secondary"
            icon="calendar-outline"
            onPress={() => router.push(`/booking/${b.id}`)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.turf, alignItems: 'center', justifyContent: 'center' },
  logoRing: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.white },
  logoStar: { width: 9, height: 9, borderRadius: 2, backgroundColor: colors.accent, transform: [{ rotate: '45deg' }] },
  brand: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: colors.ink, letterSpacing: 1 },
  lines: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  sum: { flexDirection: 'row', justifyContent: 'space-between' },
  due: { marginTop: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.navy },
  dueValue: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.ink },
});
