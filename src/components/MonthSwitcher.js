// Navegador de mês: ‹ julho de 2026 ›. Tocar no nome volta pro mês atual.

import { Pressable, Text, View } from 'react-native';
import { useApp } from '../app-context';
import { useTheme } from '../theme-context';
import { addMonths, currentMonth, monthLabel } from '../utils/date';
import { fontForWeight } from '../theme';

export default function MonthSwitcher({ compact }) {
  const { colors } = useTheme();
  const { month, setMonth } = useApp();
  const isCurrent = month === currentMonth();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        paddingHorizontal: 4,
        paddingVertical: compact ? 3 : 5,
      }}
    >
      <Arrow label="‹" onPress={() => setMonth(addMonths(month, -1))} />
      <Pressable onPress={() => setMonth(currentMonth())} style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: compact ? 14 : 15, fontFamily: fontForWeight('700'), color: colors.text }}>
          {monthLabel(month, { full: true })}
        </Text>
        {!isCurrent ? (
          <Text style={{ fontSize: 10, color: colors.primary, fontFamily: fontForWeight('600') }}>voltar pro mês atual</Text>
        ) : null}
      </Pressable>
      <Arrow label="›" onPress={() => setMonth(addMonths(month, 1))} />
    </View>
  );
}

function Arrow({ label, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.5 },
      ]}
    >
      <Text style={{ fontSize: 22, color: colors.textMuted, marginTop: -3 }}>{label}</Text>
    </Pressable>
  );
}
