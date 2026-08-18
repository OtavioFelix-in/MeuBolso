// Peças visuais reaproveitadas por todas as telas. Tudo pega a cor do tema
// ativo, então trocar claro/escuro não precisa de nenhuma gambiarra por tela.

import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTapAnim } from '../hooks/useTapAnim';
import { useTheme } from '../theme-context';
import { FONT_FAMILY, RADIUS, TABULAR_NUMS, fontForWeight } from '../theme';
import { formatMoney } from '../utils/money';

// ---- Cartão ----

export function Card({ children, style, onPress, padded = true }) {
  const { colors, isDark } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.98);
  const base = {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? 16 : 0,
    ...(isDark
      ? null
      : { shadowColor: '#101828', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[base, style, { transform: [{ scale }] }]}>{children}</Animated.View>
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
      <Text style={{ fontSize: 17, fontFamily: FONT_FAMILY.bold, color: colors.text, flex: 1 }}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontSize: 14, fontFamily: FONT_FAMILY.semibold, color: colors.primary }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Muted({ children, style, size = 13 }) {
  const { colors } = useTheme();
  return <Text style={[{ color: colors.textMuted, fontSize: size, fontFamily: FONT_FAMILY.regular }, style]}>{children}</Text>;
}

export function Money({ cents, kind, size = 16, weight = '700', style, sign = false }) {
  const { colors } = useTheme();
  const color =
    kind === 'income' ? colors.income : kind === 'expense' ? colors.expense : kind === 'muted' ? colors.textMuted : colors.text;
  const prefix = kind === 'income' ? '+' : kind === 'expense' ? '-' : '';
  const mono = Number(weight) >= 700 ? FONT_FAMILY.monoBold : FONT_FAMILY.mono;
  return (
    <Text style={[{ color, fontSize: size, fontFamily: mono }, TABULAR_NUMS, style]}>
      {prefix}
      {formatMoney(Math.abs(cents ?? 0), { sign: sign && !prefix })}
    </Text>
  );
}

// ---- Botões ----

export function Button({ title, onPress, variant = 'primary', style, disabled, loading, icon }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.95);
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    soft: { bg: colors.primaryLight, fg: colors.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.expense, border: colors.expense },
  }[variant];

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled || loading}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: palette.bg, borderColor: palette.border, transform: [{ scale }] },
          disabled && { opacity: 0.6 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <Text style={{ color: palette.fg, fontFamily: FONT_FAMILY.semibold, fontSize: 15 }}>
            {icon ? `${icon}  ` : ''}
            {title}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color, emoji }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.94);
  const tint = color ?? colors.primary;
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: active ? tint : colors.cardAlt,
            borderColor: active ? tint : colors.border,
            transform: [{ scale }],
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            color: active ? '#fff' : colors.text,
            fontFamily: active ? FONT_FAMILY.semibold : FONT_FAMILY.medium,
            fontSize: 13,
          }}
        >
          {emoji ? `${emoji} ` : ''}
          {label}
        </Text>
      </Animated.View>
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
          <SegmentButton
            key={opt.key}
            active={active}
            tint={tint}
            label={opt.label}
            textColor={colors.textMuted}
            onPress={() => onChange(opt.key)}
          />
        );
      })}
    </View>
  );
}

function SegmentButton({ active, tint, label, textColor, onPress }) {
  const { scale, onPressIn, onPressOut } = useTapAnim(0.93);
  return (
    <Pressable style={{ flex: 1 }} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.segment, { backgroundColor: tint, transform: [{ scale }] }]}>
        <Text
          numberOfLines={1}
          style={{ color: active ? '#fff' : textColor, fontFamily: FONT_FAMILY.semibold, fontSize: 13 }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
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
      <Text style={{ color: tone === 'solid' ? '#fff' : tint, fontSize: 11, fontFamily: FONT_FAMILY.semibold }}>
        {label}
      </Text>
    </View>
  );
}

// Ícone num quadrado levemente arredondado — menos "bolinha fofa", mais
// crachá/selo. `emoji` é o desenho escolhido pelo usuário (categoria, conta —
// isso é personalização, não decoração, não trocar). `icon` é pra ícone de
// UI/sistema (nome do Feather) nos lugares que a gente controla.
export function IconBubble({ emoji, icon, color, size = 42 }) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: `${tint}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? <Feather name={icon} size={size * 0.46} color={tint} /> : <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>}
    </View>
  );
}

export function EmptyState({ emoji, title, subtitle, action, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.semibold, color: colors.text, marginTop: 10, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19, fontFamily: FONT_FAMILY.regular }}>
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
// `onBack`, quando passado, troca o X por uma seta de voltar (menu > detalhe
// dentro do mesmo sheet, sem empilhar Modal em cima de Modal).
export function Sheet({ visible, onClose, onBack, title, children, footer, height = '90%' }) {
  const { colors } = useTheme();
  const sheetStyles = useMemo(
    () => ({
      backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
      panel: {
        backgroundColor: colors.background,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
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
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 2 }}>
                <Feather name="chevron-left" size={24} color={colors.text} />
              </Pressable>
            ) : null}
            <Text style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold, color: colors.text, flex: 1 }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={colors.textMuted} />
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

export function Header({ title, subtitle, right, left, onBack }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 4, marginLeft: -4 }}>
          <Text style={{ fontSize: 26, color: colors.text }}>‹</Text>
        </Pressable>
      ) : null}
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 26, fontFamily: FONT_FAMILY.bold, color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, fontFamily: FONT_FAMILY.regular }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Avatar do usuário (iniciais num círculo) — toque abre o perfil. Padrão de
// app de banco (Inter, Itaú...): avatar no canto superior esquerdo, ao lado
// do título, em vez do perfil ficar escondido só dentro de Ajustes.
export function Avatar({ name, onPress, size = 40 }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.9);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ marginRight: 10 }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <Text style={{ color: colors.onPrimary, fontSize: size * 0.42, fontFamily: FONT_FAMILY.bold }}>{initial}</Text>
      </Animated.View>
    </Pressable>
  );
}

// Botão do cabeçalho (ajustes, mostrar/esconder valores...) — ícone vetorial,
// quadrado arredondado, não círculo. `emoji` é só pra casos pontuais sem
// ícone equivalente; prefira `icon` (nome do Feather).
export function RoundButton({ icon, emoji, onPress, color }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.9);
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.roundButton,
          { backgroundColor: color ?? colors.card, borderColor: colors.border, transform: [{ scale }] },
        ]}
      >
        {icon ? <Feather name={icon} size={18} color={colors.text} /> : <Text style={{ fontSize: 17 }}>{emoji}</Text>}
      </Animated.View>
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
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
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
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
