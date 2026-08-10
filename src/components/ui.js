// Peças visuais reaproveitadas por todas as telas. Tudo pega a cor do tema
// ativo, então trocar claro/escuro não precisa de nenhuma gambiarra por tela.

import { useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme-context';
import { formatMoney } from '../utils/money';

// ---- Cartão ----

export function Card({ children, style, onPress, padded = true }) {
  const { colors, isDark } = useTheme();
  const base = {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? 16 : 0,
    ...(isDark
      ? null
      : { shadowColor: '#101828', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.75 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ---- Textos ----

export function SectionTitle({ children, action, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 }}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Muted({ children, style, size = 13 }) {
  const { colors } = useTheme();
  return <Text style={[{ color: colors.textMuted, fontSize: size }, style]}>{children}</Text>;
}

export function Money({ cents, kind, size = 16, weight = '700', style, sign = false }) {
  const { colors } = useTheme();
  const color =
    kind === 'income' ? colors.income : kind === 'expense' ? colors.expense : kind === 'muted' ? colors.textMuted : colors.text;
  const prefix = kind === 'income' ? '+' : kind === 'expense' ? '-' : '';
  return (
    <Text style={[{ color, fontSize: size, fontWeight: weight }, style]}>
      {prefix}
      {formatMoney(Math.abs(cents ?? 0), { sign: sign && !prefix })}
    </Text>
  );
}

// ---- Botões ----

export function Button({ title, onPress, variant = 'primary', style, disabled, loading, icon }) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    soft: { bg: colors.primaryLight, fg: colors.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.expense, border: colors.expense },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={{ color: palette.fg, fontWeight: '700', fontSize: 15 }}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color, emoji }) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? tint : colors.cardAlt,
          borderColor: active ? tint : colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          color: active ? '#fff' : colors.text,
          fontWeight: active ? '700' : '600',
          fontSize: 13,
        }}
      >
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

// Alternador de duas ou três opções (Despesa/Receita, Mês/Ano...).
export function Segmented({ options, value, onChange, activeColor }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        const tint = active ? (opt.color ?? activeColor ?? colors.primary) : 'transparent';
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, { backgroundColor: tint }]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? '#fff' : colors.textMuted,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Indicadores ----

export function ProgressBar({ percent, color, height = 8, background }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: height,
        backgroundColor: background ?? colors.cardAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.max(Math.min(percent ?? 0, 100), 0)}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}

export function Badge({ label, color, tone = 'soft' }) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  return (
    <View
      style={[
        styles.badge,
        tone === 'solid'
          ? { backgroundColor: tint }
          : { backgroundColor: `${tint}22`, borderColor: `${tint}55`, borderWidth: 1 },
      ]}
    >
      <Text style={{ color: tone === 'solid' ? '#fff' : tint, fontSize: 11, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

// Bolinha com emoji, usada em quase toda lista do app.
export function IconBubble({ emoji, color, size = 42 }) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${tint}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

export function EmptyState({ emoji, title, subtitle, action, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 10, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <Button title={action} onPress={onAction} variant="soft" style={{ marginTop: 14, paddingHorizontal: 22 }} /> : null}
    </View>
  );
}

export function Divider({ style }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

// ---- Bottom sheet ----

// Modal que sobe de baixo, usado em todos os formulários e seletores.
export function Sheet({ visible, onClose, title, children, footer, height = '90%' }) {
  const { colors } = useTheme();
  const sheetStyles = useMemo(
    () => ({
      backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
      panel: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        maxHeight: height,
        paddingBottom: 8,
      },
    }),
    [colors, height]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={sheetStyles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={sheetStyles.panel}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.sheetHeader}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, flex: 1 }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.sheetFooter, { borderTopColor: colors.border }]}>{footer}</View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Cabeçalho de tela ----

export function Header({ title, subtitle, right, onBack }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 4, marginLeft: -4 }}>
          <Text style={{ fontSize: 26, color: colors.text }}>‹</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Botão redondo do cabeçalho (⚙️, 🌙, ➕...).
export function RoundButton({ emoji, onPress, color }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { backgroundColor: color ?? colors.card, borderColor: colors.border },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={{ fontSize: 17 }}>{emoji}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  button: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sheetFooter: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
