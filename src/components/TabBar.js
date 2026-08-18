// Barra inferior feita à mão (sem biblioteca de navegação) + botão flutuante
// de novo lançamento, que é a ação mais usada do app.

import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT_FAMILY, RADIUS } from '../theme';
import { useTheme } from '../theme-context';

export const TABS = [
  { key: 'home', icon: 'home', label: 'Início' },
  { key: 'expenses', icon: 'credit-card', label: 'Despesas' },
  { key: 'meses', icon: 'calendar', label: 'Meses' },
  { key: 'wallet', icon: 'briefcase', label: 'Carteira' },
  { key: 'reports', icon: 'trending-up', label: 'Insights' },
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
              <Feather name={tab.icon} size={19} color={isActive ? colors.primary : colors.textMuted} />
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

export function Fab({ onPress, icon = 'plus' }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: 20,
          bottom: 18,
          width: 56,
          height: 56,
          borderRadius: RADIUS.xl,
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
      <Feather name={icon} size={26} color={colors.onPrimary} />
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
      gap: 3,
    },
    iconWrap: {
      paddingHorizontal: 15,
      paddingVertical: 5,
      borderRadius: RADIUS.md,
    },
    iconWrapActive: {
      backgroundColor: colors.primaryLight,
    },
    label: {
      fontSize: 10.5,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
    },
    labelActive: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
    },
  });
}
