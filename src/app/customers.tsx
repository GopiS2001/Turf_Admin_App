import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import { GradientHeader } from '@/components/header';
import { AccountBadge, Avatar, EmptyState, ErrorState, IconButton, Input, Skeleton, Txt } from '@/components/ui';
import { useCustomers } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { errorMessage } from '@/lib/api';
import { colors, radius, shadow, space } from '@/theme';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 350);
  const list = useCustomers(q || undefined);
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.meta.total;

  return (
    <View style={{ flex: 1 }}>
      <GradientHeader title="Customers" subtitle={total != null ? `${total} on record` : 'People'} back>
        <View style={{ marginTop: space.lg }}>
          <Input icon="search" value={search} onChangeText={setSearch} placeholder="Search name, email or phone" autoCorrect={false} />
        </View>
      </GradientHeader>
      <FlatList
        data={items}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => list.refetch()} tintColor={colors.turf} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        renderItem={({ item: u }) => (
          <View style={styles.row}>
            <Avatar name={u.name} src={u.profileImage} size={46} />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="label" numberOfLines={1}>
                {u.name}
              </Txt>
              <Txt variant="caption" numberOfLines={1}>
                {u.email}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                {u.city ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="location-outline" size={12} color={colors.muted} />
                    <Txt variant="caption" style={{ fontSize: 12 }}>
                      {u.city}
                    </Txt>
                  </View>
                ) : null}
                <AccountBadge status={u.status} />
              </View>
            </View>
            {u.phone ? (
              <IconButton icon="call" label={`Call ${u.name}`} color={colors.turf} bg={colors.turf50} onPress={() => Linking.openURL(`tel:${u.phone!.replace(/\s/g, '')}`)} />
            ) : null}
            <IconButton icon="mail" label={`Email ${u.name}`} color={colors.navy} bg={colors.bg} onPress={() => Linking.openURL(`mailto:${u.email}`)} />
          </View>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: space.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={84} style={{ borderRadius: radius.lg }} />
              ))}
            </View>
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState icon="people-outline" title="No customers" message="Add customers from the web dashboard." />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.turf} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow,
  },
});
