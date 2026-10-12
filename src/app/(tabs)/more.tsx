import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, ConfirmModal, Txt, tap, type IconName } from '@/components/ui';
import { useNewEnquiryCount } from '@/hooks/queries';
import { API_ORIGIN } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { humanize } from '@/lib/format';
import { colors, fonts, space } from '@/theme';

const menu: { icon: IconName; title: string; subtitle: string; href: Href; showsNewEnquiries?: boolean }[] = [
  { icon: 'people-outline', title: 'Customers', subtitle: 'Contact details for every customer', href: '/customers' },
  { icon: 'mail-unread-outline', title: 'Enquiries', subtitle: 'Messages from the website', href: '/enquiries', showsNewEnquiries: true },
  { icon: 'person-outline', title: 'Edit profile', subtitle: 'Your name, phone and address', href: '/account' },
  { icon: 'key-outline', title: 'Change password', subtitle: 'Keep your account secure', href: { pathname: '/account', params: { section: 'password' } } },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: newEnquiries = 0 } = useNewEnquiryCount();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setConfirmingLogout(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
      <LinearGradient colors={[colors.navy900, colors.navy, colors.navy700]} style={[styles.header, { paddingTop: insets.top + space.xl }]}>
        <View style={[styles.glow, { pointerEvents: 'none' }]} />
        <Avatar name={user.name} src={user.profileImage} size={78} dark />
        <Txt style={styles.name}>{user.name}</Txt>
        <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {user.email}
        </Txt>
        <View style={styles.role}>
          <Ionicons name="shield-checkmark" size={13} color={colors.navy} />
          <Txt style={styles.roleText}>{humanize(user.role)}</Txt>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: space.lg, marginTop: -28, gap: space.lg }}>
        <Card padded={false}>
          {menu.map((m, i) => {
            const badge = m.showsNewEnquiries && newEnquiries > 0 ? newEnquiries : 0;
            return (
              <Pressable
                key={m.title}
                accessibilityRole="button"
                accessibilityLabel={badge ? `${m.title}, ${badge} new` : m.title}
                onPress={() => {
                  tap();
                  router.push(m.href);
                }}
                style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { backgroundColor: colors.bg }]}
              >
                <View style={styles.itemIcon}>
                  <Ionicons name={m.icon} size={20} color={colors.turf} />
                  {badge > 0 && (
                    <View style={styles.badge}>
                      <Txt style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Txt>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{m.title}</Txt>
                  <Txt variant="caption" style={badge ? { color: colors.red } : undefined}>
                    {badge ? `${badge} new message${badge === 1 ? '' : 's'}` : m.subtitle}
                  </Txt>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            );
          })}
        </Card>

        <Card padded={false}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              setConfirmingLogout(true);
            }}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.redSoft }]}
          >
            <View style={[styles.itemIcon, { backgroundColor: colors.redSoft }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.red} />
            </View>
            <Txt variant="label" style={{ flex: 1, color: colors.red }}>
              Sign out
            </Txt>
          </Pressable>
        </Card>

        <Txt variant="caption" style={{ textAlign: 'center' }}>
          90s Turf Admin · connected to {API_ORIGIN}
        </Txt>
      </View>

      <ConfirmModal
        visible={confirmingLogout}
        title="Sign out?"
        message="You will need your password to sign in again."
        confirmLabel="Sign out"
        icon="log-out-outline"
        destructive
        loading={signingOut}
        onConfirm={signOut}
        onClose={() => setConfirmingLogout(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingBottom: 56, gap: 4, overflow: 'hidden' },
  glow: { position: 'absolute', left: -60, top: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.turfGlow, opacity: 0.2 },
  name: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.white, marginTop: space.md, letterSpacing: 0.5 },
  role: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: space.sm },
  roleText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.turf50, alignItems: 'center', justifyContent: 'center' },
  // Count bubble pinned to the icon's top-right corner, ringed in white so it stands off the tile.
  badge: {
    position: 'absolute',
    top: -6,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13, color: colors.white },
});
