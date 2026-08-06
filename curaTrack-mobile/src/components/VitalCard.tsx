import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface VitalCardProps {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  accentColor: string;
  accentBg: string;
  badge?: string;
  progress?: number;
}

export function VitalCard({
  icon,
  label,
  value,
  unit,
  accentColor,
  accentBg,
  badge,
  progress,
}: VitalCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBg, { backgroundColor: accentBg }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: accentBg }]}>
            <Text style={[styles.badgeText, { color: accentColor }]}>{badge}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: theme.textSecondary }]}>{unit}</Text>}
      </View>

      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: theme.backgroundElement }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accentColor,
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {progress.toFixed(0)}% of 10,000 goal
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '500' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { fontSize: 28, fontWeight: '800' },
  unit: { fontSize: 14, fontWeight: '500' },
  progressContainer: { marginTop: 4, gap: 4 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
