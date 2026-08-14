// Campos de formulário. Todos seguem o mesmo desenho: rótulo pequeno em cima,
// caixa arredondada embaixo, e os que precisam escolher algo abrem um Sheet.

import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { formatDate, fromIsoDate, toIsoDate } from '../utils/date';
import { centsToDigits, digitsToCents, formatMoney } from '../utils/money';
import { Chip, IconBubble, Sheet } from './ui';

export function Field({ label, children, hint, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 7 }}>
          {label}
        </Text>
      ) : null}
      {children}
      {hint ? (
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

function useBoxStyle() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 11,
      fontSize: 15,
      color: colors.text,
    }),
    [colors]
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoFocus,
  maxLength,
  returnKeyType = 'done',
  onSubmitEditing,
}) {
  const { colors } = useTheme();
  const box = useBoxStyle();
  return (
    <TextInput
      style={[box, multiline && { minHeight: 84, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      keyboardType={keyboardType}
      autoFocus={autoFocus}
      maxLength={maxLength}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
    />
  );
}

// Campo de valor estilo caixa de mercado: só dígitos, entrando pela direita.
export function MoneyField({ cents, onChange, autoFocus, color, big = true, returnKeyType, onSubmitEditing }) {
  const { colors } = useTheme();
  const [digits, setDigits] = useState(() => centsToDigits(cents));
  const tint = color ?? colors.text;

  // Os formulários carregam os dados num efeito, depois do primeiro render:
  // sem isso o campo continuaria zerado ao abrir um lançamento pra editar.
  useEffect(() => {
    setDigits(centsToDigits(cents));
  }, [cents]);

  function handle(text) {
    const clean = text.replace(/\D/g, '').slice(0, 12);
    setDigits(clean);
    onChange(digitsToCents(clean));
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: big ? 10 : 6,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: big ? 22 : 16, fontWeight: '700', color: colors.textMuted, marginRight: 6 }}>
        R$
      </Text>
      <TextInput
        style={{
          flex: 1,
          fontSize: big ? 30 : 18,
          fontWeight: '800',
          color: tint,
          padding: 0,
          paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        }}
        value={formatMoney(digitsToCents(digits), { symbol: false })}
        onChangeText={handle}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        selectTextOnFocus={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

export function DateField({ value, onChange, placeholder = 'Escolher data' }) {
  const { colors } = useTheme();
  const box = useBoxStyle();
  const [show, setShow] = useState(false);

  return (
    <>
      <Pressable onPress={() => setShow(true)} style={[box, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={{ fontSize: 15, color: value ? colors.text : colors.textMuted, flex: 1 }}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Text style={{ fontSize: 15 }}>📅</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ? fromIsoDate(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            setShow(Platform.OS === 'ios');
            if (event.type !== 'dismissed' && selected) onChange(toIsoDate(selected));
          }}
        />
      ) : null}
    </>
  );
}

// Seletor genérico: mostra o item atual e abre um Sheet com a lista.
export function PickerField({ label, value, options, onChange, placeholder = 'Selecionar', allowEmpty }) {
  const { colors } = useTheme();
  const box = useBoxStyle();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[box, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={{ fontSize: 15, color: selected ? colors.text : colors.textMuted, flex: 1 }}>
          {selected ? `${selected.emoji ? `${selected.emoji} ` : ''}${selected.label}` : placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>▾</Text>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder} height="70%">
        {allowEmpty ? (
          <OptionRow
            emoji="🚫"
            label="Nenhum"
            active={!value}
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        ) : null}
        {options.map((opt) => (
          <OptionRow
            key={opt.key}
            emoji={opt.emoji}
            label={opt.label}
            hint={opt.hint}
            color={opt.color}
            active={opt.key === value}
            onPress={() => {
              onChange(opt.key);
              setOpen(false);
            }}
          />
        ))}
      </Sheet>
    </>
  );
}

export function OptionRow({ emoji, label, hint, active, onPress, color, right }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: active ? colors.primaryLight : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      {emoji ? <IconBubble emoji={emoji} color={color ?? colors.primary} size={36} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {right ?? (active ? <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text> : null)}
    </Pressable>
  );
}

// Seletor de categoria: lista as categorias-mãe e abre as subcategorias
// em acordeão, sem trocar de tela.
export function CategoryField({ kind, value, onChange }) {
  const { colors } = useTheme();
  const box = useBoxStyle();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const tree = useMemo(() => (open ? db.getCategoryTree(kind) : []), [open, kind]);
  const current = useMemo(() => (value ? db.getCategory(value) : null), [value]);
  const parent = useMemo(
    () => (current?.parent_id ? db.getCategory(current.parent_id) : null),
    [current]
  );

  const display = current
    ? `${parent?.emoji ?? current.emoji} ${parent ? `${parent.name} · ` : ''}${current.name}`
    : null;

  function pick(id) {
    onChange(id);
    setOpen(false);
    setExpanded(null);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[box, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text numberOfLines={1} style={{ fontSize: 15, color: display ? colors.text : colors.textMuted, flex: 1 }}>
          {display ?? 'Escolher categoria'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>▾</Text>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Categoria" height="82%">
        {tree.map((cat) => {
          const isOpen = expanded === cat.id;
          return (
            <View key={cat.id} style={{ marginBottom: 8 }}>
              <Pressable
                onPress={() => (cat.subs.length > 0 ? setExpanded(isOpen ? null : cat.id) : pick(cat.id))}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    marginBottom: 0,
                    backgroundColor: value === cat.id ? colors.primaryLight : colors.card,
                    borderColor: value === cat.id ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconBubble emoji={cat.emoji} color={cat.color} size={36} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>{cat.name}</Text>
                {cat.subs.length > 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {isOpen ? '▲' : `${cat.subs.length} ▾`}
                  </Text>
                ) : null}
              </Pressable>

              {isOpen ? (
                <View style={styles.subWrap}>
                  <Chip label="Toda a categoria" active={value === cat.id} onPress={() => pick(cat.id)} color={cat.color} />
                  {cat.subs.map((sub) => (
                    <Chip
                      key={sub.id}
                      label={sub.name}
                      active={value === sub.id}
                      onPress={() => pick(sub.id)}
                      color={cat.color}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </Sheet>
    </>
  );
}

// Linha de chips horizontal (formas de pagamento, contas, filtros...).
export function ChipRow({ options, value, onChange, allowEmpty }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {allowEmpty ? (
        <Chip label="Todas" active={!value} onPress={() => onChange(null)} />
      ) : null}
      {options.map((opt) => (
        <Chip
          key={opt.key}
          label={opt.label}
          emoji={opt.emoji}
          color={opt.color}
          active={opt.key === value}
          onPress={() => onChange(opt.key === value && allowEmpty ? null : opt.key)}
        />
      ))}
    </ScrollView>
  );
}

export function SwitchRow({ label, hint, value, onChange, emoji }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
          {emoji ? `${emoji}  ` : ''}
          {label}
        </Text>
        {hint ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 }}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

// Campo numérico com − e + (nº de parcelas, dia do vencimento).
export function StepperField({ value, onChange, min = 1, max = 99, suffix }) {
  const { colors } = useTheme();
  const box = useBoxStyle();
  const clamp = (n) => Math.max(min, Math.min(max, n));

  return (
    <View style={[box, { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }]}>
      <Pressable onPress={() => onChange(clamp(value - 1))} hitSlop={8} style={styles.stepperButton}>
        <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '800' }}>−</Text>
      </Pressable>
      <TextInput
        style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, padding: 0 }}
        value={String(value)}
        onChangeText={(t) => onChange(clamp(parseInt(t.replace(/\D/g, ''), 10) || min))}
        keyboardType="number-pad"
      />
      {suffix ? <Text style={{ color: colors.textMuted, fontSize: 13, marginRight: 8 }}>{suffix}</Text> : null}
      <Pressable onPress={() => onChange(clamp(value + 1))} hitSlop={8} style={styles.stepperButton}>
        <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '800' }}>+</Text>
      </Pressable>
    </View>
  );
}

// Escolha de emoji e cor, usada em metas, categorias, contas e bens.
export function EmojiColorField({ emoji, color, onEmoji, onColor, emojis, colorOptions }) {
  const { colors } = useTheme();
  const box = useBoxStyle();
  return (
    <View style={{ gap: 10 }}>
      {emojis.length > 0 ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          style={[box, { width: 66, textAlign: 'center', fontSize: 22 }]}
          value={emoji}
          onChangeText={(t) => onEmoji(Array.from(t).slice(-1)[0] ?? '')}
          maxLength={4}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {emojis.map((e) => (
            <Pressable
              key={e}
              onPress={() => onEmoji(e)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: emoji === e ? colors.primaryLight : colors.cardAlt,
              }}
            >
              <Text style={{ fontSize: 19 }}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {colorOptions.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: c,
              borderWidth: color === c ? 3 : 0,
              borderColor: colors.text,
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  subWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    paddingLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  stepperButton: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
