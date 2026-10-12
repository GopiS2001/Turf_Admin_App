import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Txt } from '@/components/ui';
import { API_ORIGIN, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts, radius, space } from '@/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { login, notice } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient colors={[colors.navy900, colors.navy, colors.navy700]} style={{ flex: 1 }}>
      <View style={[styles.glowA, { pointerEvents: 'none' }]} />
      <View style={[styles.glowB, { pointerEvents: 'none' }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <View style={styles.logoRing} />
              <View style={styles.logoStar} />
            </View>
            <Txt style={styles.wordmark}>
              90<Txt style={[styles.wordmark, { color: colors.accent }]}>s</Txt> TURF
            </Txt>
            <Txt variant="overline" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 4 }}>
              Admin
            </Txt>
          </View>

          <Txt style={styles.headline}>
            Run the turf{'\n'}
            <Txt style={[styles.headline, { color: colors.accent }]}>from your pocket.</Txt>
          </Txt>

          <View style={styles.card}>
            <Txt variant="title" style={{ fontSize: 22 }}>
              Sign in
            </Txt>
            <Txt variant="caption" style={{ marginTop: 2, marginBottom: space.lg }}>
              Admin accounts only.
            </Txt>

            {notice && !errors.form && (
              <View style={styles.notice} accessibilityRole="alert">
                <Txt variant="caption" style={{ color: colors.navy }}>
                  {notice}
                </Txt>
              </View>
            )}

            {errors.form && (
              <View style={styles.formError} accessibilityRole="alert">
                <Txt variant="caption" style={{ color: colors.red }}>
                  {errors.form}
                </Txt>
              </View>
            )}

            <View style={{ gap: space.lg }}>
              <Input
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={errors.email}
                placeholder="admin@90sturf.in"
              />
              <Input
                ref={passwordRef}
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                error={errors.password}
                placeholder="••••••••"
              />
              <Button title="Sign in" icon="arrow-forward" loading={busy} onPress={submit} style={{ marginTop: space.sm }} />
            </View>
          </View>

          <Txt variant="caption" style={styles.server}>
            Server: {API_ORIGIN}
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: space.xl, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  glowA: { position: 'absolute', top: -80, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: colors.turfGlow, opacity: 0.25 },
  glowB: { position: 'absolute', bottom: 60, left: -120, width: 260, height: 260, borderRadius: 130, backgroundColor: colors.accent, opacity: 0.08 },
  brand: { alignItems: 'center', gap: 4, marginBottom: space.xxl },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.turf, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  logoRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: colors.white },
  logoStar: { width: 14, height: 14, borderRadius: 3, backgroundColor: colors.accent, transform: [{ rotate: '45deg' }] },
  wordmark: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: colors.white, letterSpacing: 1.5 },
  headline: { fontFamily: fonts.display, fontSize: 46, lineHeight: 46, color: colors.white, letterSpacing: 0.5, marginBottom: space.xl },
  card: { backgroundColor: colors.bg, borderRadius: radius.xl + 4, padding: space.xl },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  formError: { backgroundColor: colors.redSoft, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  server: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: space.xl },
});
