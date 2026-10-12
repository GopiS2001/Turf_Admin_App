import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '@/components/header';
import { useToast } from '@/components/toast';
import { Button, Card, Input, Txt } from '@/components/ui';
import { useChangePassword, useUpdateProfile } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space } from '@/theme';

const PHONE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
const PASSWORD_HINT = '8+ characters with an uppercase letter, a lowercase letter and a number';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [state, setState] = useState(user?.state ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  async function saveProfile() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter your full name';
    if (phone.trim() && !PHONE.test(phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
    setProfileErrors(e);
    if (Object.keys(e).length) return;
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        address: address.trim() || undefined,
      });
      await refreshUser();
      toast('Profile saved');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function savePassword() {
    const e: Record<string, string> = {};
    if (!current) e.current = 'Enter your current password';
    if (!PASSWORD.test(next)) e.next = PASSWORD_HINT;
    if (next !== confirmPw) e.confirm = 'Passwords do not match';
    setPwErrors(e);
    if (Object.keys(e).length) return;
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next, confirmPassword: confirmPw });
      setCurrent('');
      setNext('');
      setConfirmPw('');
      toast('Password changed');
    } catch (err) {
      setPwErrors({ current: errorMessage(err) });
    }
  }

  const scrollToPassword = (ev: LayoutChangeEvent) => {
    if (section === 'password') {
      const y = ev.nativeEvent.layout.y;
      setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), 250);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title="Account" subtitle={user?.email} back />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xxl }}>
          <Card style={{ gap: space.lg }}>
            <Txt variant="heading">Personal details</Txt>
            <Input label="Full name" value={name} onChangeText={setName} error={profileErrors.name} icon="person-outline" />
            <Input label="Phone" value={phone} onChangeText={setPhone} error={profileErrors.phone} keyboardType="phone-pad" icon="call-outline" />
            <Input label="Address" value={address} onChangeText={setAddress} icon="home-outline" />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Input label="City" value={city} onChangeText={setCity} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="State" value={state} onChangeText={setState} />
              </View>
            </View>
            <Button title="Save details" icon="checkmark" loading={updateProfile.isPending} onPress={saveProfile} />
          </Card>

          <View onLayout={scrollToPassword}>
            <Card style={{ gap: space.lg }}>
              <Txt variant="heading">Change password</Txt>
              <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" error={pwErrors.current} icon="lock-closed-outline" />
              <Input label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" error={pwErrors.next} hint={PASSWORD_HINT} icon="key-outline" />
              <Input label="Confirm new password" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry autoComplete="new-password" error={pwErrors.confirm} icon="key-outline" />
              <Button title="Update password" icon="shield-checkmark-outline" loading={changePassword.isPending} onPress={savePassword} />
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
