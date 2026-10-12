import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatINR, formatINRShort } from '@/lib/format';
import type { RevenuePoint } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { Txt, tap } from './ui';

const CHART_H = 150;

/**
 * Single-series column chart (payments per month). Bars ≤ 24px with rounded tops,
 * the latest month labelled; tap a bar to read its exact value.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [selected, setSelected] = useState(data.length - 1);
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const ticks = [max, max / 2, 0];
  const point = data[selected] ?? data[data.length - 1];

  return (
    <View>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Txt variant="caption">{point?.label}</Txt>
        <Txt style={styles.readoutValue}>{formatINR(point?.revenue)}</Txt>
        <Txt variant="caption">{point?.bookings ?? 0} bookings</Txt>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <View style={[styles.axis, { height: CHART_H }]}>
          {ticks.map((t, i) => (
            <Txt key={i} variant="caption" style={styles.tick}>
              {formatINRShort(t)}
            </Txt>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.plot, { height: CHART_H }]}>
            {[0, 0.5, 1].map((f) => (
              <View key={f} style={[styles.grid, { bottom: f * CHART_H }]} />
            ))}
            {data.map((d, i) => {
              const h = Math.max(d.revenue > 0 ? 4 : 0, (d.revenue / max) * CHART_H);
              const active = i === selected;
              return (
                <Pressable
                  key={d.month}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.label}: ${formatINR(d.revenue)}`}
                  onPress={() => {
                    tap();
                    setSelected(i);
                  }}
                  style={styles.slot}
                >
                  {i === data.length - 1 && d.revenue > 0 && (
                    <Txt style={[styles.barLabel, { bottom: h + 4 }]}>{formatINRShort(d.revenue)}</Txt>
                  )}
                  <View style={[styles.bar, { height: h, backgroundColor: active ? colors.turf : '#7CC3A6' }]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.labels}>
            {data.map((d, i) => (
              <Txt key={d.month} variant="caption" style={[styles.month, i === selected && { color: colors.ink, fontFamily: fonts.semibold }]}>
                {d.label.split(' ')[0]}
              </Txt>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { gap: 1 },
  readoutValue: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink, fontVariant: ['tabular-nums'] },
  axis: { width: 44, justifyContent: 'space-between', paddingRight: 6 },
  tick: { fontSize: 11, textAlign: 'right', marginVertical: -6 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 22, maxWidth: 24, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 },
  barLabel: { position: 'absolute', fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
  labels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  month: { flex: 1, textAlign: 'center', fontSize: 11 },
});
