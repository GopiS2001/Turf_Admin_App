import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { Txt } from './ui';

/** Navy gradient header used across screens — the app's signature look. */
export function GradientHeader({
  title,
  subtitle,
  back,
  right,
  children,
  extraBottom = 0,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  children?: React.ReactNode;
  /** Extra space below for a card that overlaps the header. */
  extraBottom?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.navy900, colors.navy, colors.navy700]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: space.xl + extraBottom }]}
    >
      <View style={[styles.glow, { pointerEvents: 'none' }]} />
      <View style={styles.top}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {subtitle && (
            <Txt variant="overline" style={{ color: colors.accent }}>
              {subtitle}
            </Txt>
          )}
          <Txt style={styles.title} numberOfLines={1}>
            {title}
          </Txt>
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    right: -70,
    top: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.turfGlow,
    opacity: 0.22,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 34, lineHeight: 38, color: colors.white, letterSpacing: 0.6 },
});
