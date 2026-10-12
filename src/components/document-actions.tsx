import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { fetchDocumentLinks, useSendDocument, type DocumentType } from '@/hooks/queries';
import { API_ORIGIN, errorMessage } from '@/lib/api';
import { colors, fonts, radius, space } from '@/theme';
import { useToast } from './toast';
import { Button, Input, Sheet, Txt, tap, type IconName } from './ui';

const LABEL: Record<DocumentType, string> = { invoice: 'Invoice', booking: 'Booking confirmation' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Action({
  icon,
  label,
  color,
  bg,
  busy,
  onPress,
}: {
  icon: IconName;
  label: string;
  color: string;
  bg: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, { backgroundColor: bg, opacity: pressed || busy ? 0.7 : 1 }]}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={18} color={color} />}
      <Txt style={[styles.actionText, { color }]}>{label}</Txt>
    </Pressable>
  );
}

/** Open / Email / WhatsApp for one PDF (booking confirmation or invoice). */
export function DocumentActions({
  type,
  bookingId,
  title,
  subtitle,
  customerEmail,
}: {
  type: DocumentType;
  bookingId: number;
  title?: string;
  subtitle?: React.ReactNode;
  customerEmail?: string | null;
}) {
  const toast = useToast();
  const send = useSendDocument();
  const [opening, setOpening] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [email, setEmail] = useState(customerEmail ?? '');
  const [emailError, setEmailError] = useState<string>();
  const busy = send.isPending ? send.variables?.channel : null;

  async function openPdf() {
    setOpening(true);
    try {
      const { pdfUrl } = await fetchDocumentLinks(type, bookingId);
      // Use this device's route to the API (the shared link may use another address).
      const path = pdfUrl.slice(pdfUrl.indexOf('/api/'));
      await Linking.openURL(`${API_ORIGIN}${path}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setOpening(false);
    }
  }

  async function whatsapp() {
    try {
      const r = await send.mutateAsync({ type, bookingId, channel: 'whatsapp' });
      if (r.sent) toast(`${LABEL[type]} sent on WhatsApp`);
      else if (r.whatsappUrl) await Linking.openURL(r.whatsappUrl);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function sendEmail() {
    if (!EMAIL.test(email.trim())) return setEmailError('Enter a valid email address');
    setEmailError(undefined);
    try {
      const r = await send.mutateAsync({ type, bookingId, channel: 'email', to: email.trim() });
      setSheet(false);
      toast(r.previewUrl ? 'Sent to the test inbox (email not set up yet)' : `${LABEL[type]} emailed to ${r.to}`);
    } catch (err) {
      setEmailError(errorMessage(err));
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {title && (
        <View style={{ gap: 2 }}>
          <Txt variant="label">{title}</Txt>
          {subtitle}
        </View>
      )}
      <View style={styles.row}>
        <Action icon="document-text-outline" label="Open PDF" color={colors.navy} bg={colors.bg} busy={opening} onPress={openPdf} />
        <Action icon="mail-outline" label="Email" color={colors.navy} bg={colors.bg} onPress={() => setSheet(true)} />
        <Action icon="logo-whatsapp" label="WhatsApp" color="#128C4A" bg="#E7F8EE" busy={busy === 'whatsapp'} onPress={whatsapp} />
      </View>

      {sheet && (
        <Sheet visible={sheet} onClose={() => setSheet(false)} title={`Email ${LABEL[type].toLowerCase()}`}>
          <Txt variant="caption">The PDF is attached and a download link is included.</Txt>
          <Input
            label="Send to"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
            placeholder="customer@example.com"
            error={emailError}
          />
          <Button title="Send email" icon="send" loading={busy === 'email'} onPress={sendEmail} />
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  action: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.sm,
  },
  actionText: { fontFamily: fonts.semibold, fontSize: 12 },
});
