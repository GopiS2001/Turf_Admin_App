import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap, type IconName } from '@/components/ui';
import { useNewEnquiryCount } from '@/hooks/queries';
import { colors, fonts } from '@/theme';

const tabs: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'bookings', title: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'payments', title: 'Payments', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'invoices', title: 'Invoices', icon: 'document-text-outline', iconActive: 'document-text' },
  { name: 'more', title: 'More', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { data: newEnquiries = 0 } = useNewEnquiryCount();
  // Red count on the More tab while there are NEW enquiries to look at.
  const badges: Record<string, string | undefined> = {
    more: newEnquiries > 0 ? (newEnquiries > 99 ? '99+' : String(newEnquiries)) : undefined,
  };
  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.turf,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 10 : 8),
        },
        tabBarItemStyle: { gap: 2 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.iconActive : t.icon} size={23} color={color} />,
            tabBarBadge: badges[t.name],
            tabBarBadgeStyle: {
              backgroundColor: colors.red,
              color: colors.white,
              fontFamily: fonts.semibold,
              fontSize: 10,
              lineHeight: 15,
              minWidth: 18,
              height: 18,
            },
            tabBarAccessibilityLabel: badges[t.name] ? `${t.title}, ${badges[t.name]} new enquiries` : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}
