import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { tap } from './ui';

type Kind = 'success' | 'error';
const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {});

/** Small toast at the top of the screen for action feedback. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const native = Platform.OS !== 'web';

  const show = useCallback(
    (message: string, kind: Kind = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, kind });
      tap(kind === 'success' ? 'success' : 'warning');
      Animated.spring(anim, { toValue: 1, useNativeDriver: native, friction: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: native }).start(() => setToast(null));
      }, 2800);
    },
    [anim, native],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { pointerEvents: 'none' },
            { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: toast.kind === 'success' ? colors.turf : colors.red }]}>
            <Ionicons name={toast.kind === 'success' ? 'checkmark' : 'alert'} size={14} color={colors.white} />
          </View>
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 1000,
    elevation: 10,
  },
  icon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, color: colors.white, fontFamily: fonts.medium, fontSize: 14 },
});
