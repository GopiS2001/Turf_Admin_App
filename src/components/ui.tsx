import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Children, forwardRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fileUrl } from '@/lib/api';
import { humanize, initials } from '@/lib/format';
import type { AccountStatus, BookingStatus, EnquiryStatus, InvoiceStatus, PaymentKind, PaymentStatus } from '@/lib/types';
import { colors, fonts, radius, shadow, space } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Light tap feedback on phones; nothing on web. */
export const tap = (style: 'light' | 'success' | 'warning' = 'light') => {
  if (Platform.OS === 'web') return;
  if (style === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else void Haptics.notificationAsync(style === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
};

/** Yes/no confirmation that works on iOS, Android and web. */
export function confirm(title: string, message: string, confirmLabel = 'Confirm', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]),
  );
}

// ───────────── Text ─────────────

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: 0.5, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.ink },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, color: colors.muted },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, color: colors.muted, textTransform: 'uppercase' },
};

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[variants[variant], style]} />;
}

// ───────────── Layout ─────────────

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: space.lg }, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="heading">{title}</Txt>
      {action}
    </View>
  );
}

export function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Txt variant="caption" style={{ fontSize: 14 }}>
        {label}
      </Txt>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Txt variant="label" style={{ textAlign: 'right', flexShrink: 1 }}>
          {value}
        </Txt>
      ) : (
        value
      )}
    </View>
  );
}

// ───────────── Buttons ─────────────

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const palette = {
    primary: { bg: colors.turf, fg: colors.white, border: colors.turf },
    accent: { bg: colors.accent, fg: colors.navy, border: colors.accent },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
    danger: { bg: colors.redSoft, fg: colors.red, border: '#FBD5D5' },
    ghost: { bg: 'transparent', fg: colors.turf, border: 'transparent' },
  }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        icon && <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} />
      )}
      <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: palette.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color = colors.ink,
  bg = colors.surface,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

// ───────────── Chips & segmented ─────────────

export function Chip({
  label,
  active,
  onPress,
  count,
  dark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  dark?: boolean;
}) {
  const bg = active ? (dark ? colors.white : colors.navy) : dark ? 'rgba(255,255,255,0.1)' : colors.surface;
  const fg = active ? colors.navy : dark ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={active}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: bg, borderColor: active || dark ? 'transparent' : colors.line }]}
    >
      <Text style={[styles.chipText, { color: active && !dark ? colors.white : fg }]}>{label}</Text>
      {count != null && (
        <View style={[styles.chipCount, { backgroundColor: active ? (dark ? colors.turf50 : 'rgba(255,255,255,0.18)') : colors.bg }]}>
          <Text style={[styles.chipCountText, { color: active ? (dark ? colors.turf : colors.white) : colors.muted }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Horizontal chip strip. With `activeIndex`, it scrolls once (on first layout) so the
 * selected chip is visible, e.g. a 6 PM default in a 6 AM–midnight time list.
 */
export function ChipRow({ children, activeIndex }: { children: React.ReactNode; activeIndex?: number }) {
  const ref = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
      {activeIndex == null
        ? children
        : Children.toArray(children).map((child, i) => (
            <View
              key={i}
              onLayout={(e) => {
                if (i !== activeIndex || scrolled.current) return;
                scrolled.current = true;
                ref.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - space.lg), animated: false });
              }}
            >
              {child}
            </View>
          ))}
    </ScrollView>
  );
}

// ───────────── Inputs ─────────────

/** Text field. Password fields (`secureTextEntry`) get an eye button to show/hide the text. */
export const Input = forwardRef<TextInput, TextInputProps & { label?: string; error?: string; icon?: IconName; hint?: string }>(
  ({ label, error, icon, hint, style, secureTextEntry, ...props }, ref) => {
    const [revealed, setRevealed] = useState(false);
    return (
      <View style={{ gap: 6 }}>
        {label && <Txt variant="label">{label}</Txt>}
        <View style={[styles.inputWrap, error ? { borderColor: colors.red } : null]}>
          {icon && <Ionicons name={icon} size={18} color={colors.faint} />}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.faint}
            style={[styles.input, style]}
            secureTextEntry={secureTextEntry && !revealed}
            {...props}
          />
          {secureTextEntry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              hitSlop={10}
              onPress={() => {
                tap();
                setRevealed((v) => !v);
              }}
              style={({ pressed }) => [styles.eye, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
        {error ? (
          <Txt variant="caption" style={{ color: colors.red }} accessibilityRole="alert">
            {error}
          </Txt>
        ) : (
          hint && <Txt variant="caption">{hint}</Txt>
        )}
      </View>
    );
  },
);
Input.displayName = 'Input';

// ───────────── Badges ─────────────

type Tone = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'violet';
const tones: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: colors.turf50, fg: colors.turf600 },
  blue: { bg: colors.skySoft, fg: colors.sky },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  red: { bg: colors.redSoft, fg: colors.red },
  gray: { bg: colors.slateSoft, fg: colors.slate },
  violet: { bg: colors.violetSoft, fg: colors.violet },
};

export function Badge({ tone, label }: { tone: Tone; label: string }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: t.fg }]} />
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export const bookingTone: Record<BookingStatus, Tone> = { UPCOMING: 'blue', ONGOING: 'amber', COMPLETED: 'green', CANCELLED: 'red' };
export const BookingBadge = ({ status }: { status: BookingStatus }) => <Badge tone={bookingTone[status]} label={humanize(status)} />;

const paymentTone: Record<PaymentStatus, Tone> = { PENDING: 'gray', ADVANCE: 'amber', PAID: 'green', REFUND: 'violet' };
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={paymentTone[status]} label={status === 'REFUND' ? 'Refunded' : humanize(status)} />
);

const invoiceTone: Record<InvoiceStatus, Tone> = { UNPAID: 'gray', PARTIAL: 'amber', PAID: 'green', REFUNDED: 'violet', CANCELLED: 'red' };
export const InvoiceBadge = ({ status }: { status: InvoiceStatus }) => <Badge tone={invoiceTone[status]} label={humanize(status)} />;

const kindTone: Record<PaymentKind, Tone> = { ADVANCE: 'amber', PAID: 'green', REFUND: 'violet' };
export const KindBadge = ({ kind }: { kind: PaymentKind }) => <Badge tone={kindTone[kind]} label={humanize(kind)} />;

export const AccountBadge = ({ status }: { status: AccountStatus }) => (
  <Badge tone={status === 'ACTIVE' ? 'green' : 'gray'} label={humanize(status)} />
);

const enquiryTone: Record<EnquiryStatus, Tone> = { NEW: 'blue', CONTACTED: 'amber', CLOSED: 'gray' };
export const EnquiryBadge = ({ status }: { status: EnquiryStatus }) => <Badge tone={enquiryTone[status]} label={humanize(status)} />;

// ───────────── Avatar ─────────────

export function Avatar({ name, src, size = 44, dark }: { name: string; src?: string | null; size?: number; dark?: boolean }) {
  const url = fileUrl(src);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dark ? 'rgba(255,255,255,0.14)' : colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontFamily: fonts.semibold, fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

// ───────────── States ─────────────

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.line, opacity: pulse }, style]} />;
}

export function EmptyState({ icon = 'file-tray-outline', title, message }: { icon?: IconName; title: string; message?: string }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={26} color={colors.turf} />
      </View>
      <Txt variant="heading">{title}</Txt>
      {message && (
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          {message}
        </Txt>
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={[styles.stateIcon, { backgroundColor: colors.redSoft }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.red} />
      </View>
      <Txt variant="caption" style={{ textAlign: 'center', color: colors.ink }}>
        {message}
      </Txt>
      {onRetry && <Button title="Try again" kind="secondary" icon="refresh" small onPress={onRetry} />}
    </View>
  );
}

// ───────────── Bottom sheet ─────────────

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Txt variant="heading" style={{ fontSize: 19 }}>
              {title}
            </Txt>
            <IconButton icon="close" label="Close" onPress={onClose} bg={colors.bg} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.lg, paddingBottom: space.sm }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────── Confirm modal ─────────────

/** Centered yes/no dialog — looks the same on iOS, Android and web. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon = 'alert-circle-outline',
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: IconName;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const close = loading ? () => {} : onClose;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.dialogWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={[styles.stateIcon, destructive && { backgroundColor: colors.redSoft }]}>
            <Ionicons name={icon} size={26} color={destructive ? colors.red : colors.turf} />
          </View>
          <Txt variant="heading" style={{ textAlign: 'center' }}>
            {title}
          </Txt>
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            {message}
          </Txt>
          <View style={styles.dialogActions}>
            <Button title={cancelLabel} kind="secondary" onPress={onClose} disabled={loading} style={{ flex: 1 }} />
            <Button title={confirmLabel} kind={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, ...shadow },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.lg, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm + 2 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14 },
  chipCount: { minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontFamily: fonts.semibold, fontSize: 11 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 12, outlineWidth: 0 },
  eye: { width: 34, height: 34, marginRight: -8, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  state: { alignItems: 'center', gap: space.md, paddingVertical: 48, paddingHorizontal: space.xl },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.turf50, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,38,0.55)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    maxHeight: '88%',
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.sm },
  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(15,23,38,0.55)' },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    ...shadow,
  },
  dialogActions: { flexDirection: 'row', gap: space.md, alignSelf: 'stretch', marginTop: space.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
});
