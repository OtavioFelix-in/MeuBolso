// Barra inferior feita à mão (sem biblioteca de navegação) + botão flutuante
// de novo lançamento, que é a ação mais usada do app.

import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTapAnim } from '../hooks/useTapAnim';
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
      {TABS.map((tab) => (
        <Tab key={tab.key} tab={tab} isActive={tab.key === active} onPress={() => onChange(tab.key)} colors={colors} styles={styles} />
      ))}
    </View>
  );
}

function Tab({ tab, isActive, onPress, colors, styles }) {
  const { scale, onPressIn, onPressOut } = useTapAnim(0.88);
  return (
    <Pressable style={styles.tab} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={4}>
      <Animated.View style={[styles.iconWrap, isActive && styles.iconWrapActive, { transform: [{ scale }] }]}>
        <Feather name={tab.icon} size={19} color={isActive ? colors.primary : colors.textMuted} />
      </Animated.View>
      <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export function Fab({ onPress, icon = 'plus' }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.88);
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ position: 'absolute', right: 20, bottom: 18 }}>
      <Animated.View
        style={{
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
          transform: [{ scale }],
        }}
      >
        <Feather name={icon} size={26} color={colors.onPrimary} />
      </Animated.View>
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
