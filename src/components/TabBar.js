// Barra inferior feita à mão (sem biblioteca de navegação) + botão flutuante
// de novo lançamento, que é a ação mais usada do app.

import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme-context';

export const TABS = [
  { key: 'home', emoji: '🏠', label: 'Início' },
  { key: 'expenses', emoji: '💸', label: 'Despesas' },
  { key: 'meses', emoji: '📆', label: 'Meses' },
  { key: 'wallet', emoji: '💼', label: 'Carteira' },
  { key: 'reports', emoji: '💡', label: 'Insights' },
];

export default function TabBar({ active, onChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)} hitSlop={4}>
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Text style={{ fontSize: 17, opacity: isActive ? 1 : 0.55 }}>{tab.emoji}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Fab({ onPress, emoji = '＋' }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: 20,
          bottom: 18,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text style={{ fontSize: 30, color: colors.onPrimary, fontWeight: '300', marginTop: -3 }}>{emoji}</Text>
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 7,
      paddingBottom: 9,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    iconWrap: {
      paddingHorizontal: 15,
      paddingVertical: 3,
      borderRadius: 14,
    },
    iconWrapActive: {
      backgroundColor: colors.primaryLight,
    },
    label: {
      fontSize: 10.5,
      color: colors.textMuted,
    },
    labelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
}
