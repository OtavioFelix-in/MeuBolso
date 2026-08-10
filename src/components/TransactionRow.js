// Linha de lançamento usada no extrato, no dashboard e no calendário.
// Quando está previsto (paid = 0) aparece o botão de confirmar pagamento.

import { Pressable, Text, View } from 'react-native';
import { categoryLabel } from '../db/transactions';
import { useTheme } from '../theme-context';
import { formatMoney } from '../utils/money';
import { IconBubble } from './ui';

export default function TransactionRow({ tx, onPress, onTogglePaid, showDate }) {
  const { colors } = useTheme();
  const category = categoryLabel(tx);
  const isIncome = tx.kind === 'income';
  const pending = tx.paid === 0;

  const details = [
    showDate ? `${tx.date.slice(8)}/${tx.date.slice(5, 7)}` : null,
    tx.installment_no ? `parcela ${tx.installment_no}/${tx.installment_total}` : null,
    tx.recurrence_id ? 'conta fixa' : null,
    tx.account_name,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <IconBubble emoji={category.emoji} color={category.color} />

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
          {tx.description || category.full}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {tx.description ? `${category.full}${details.length ? ' · ' : ''}` : ''}
          {details.join(' · ')}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: pending ? colors.textMuted : isIncome ? colors.income : colors.text,
          }}
        >
          {isIncome ? '+' : '-'}
          {formatMoney(tx.amount_cents)}
        </Text>
        {pending ? (
          <Pressable
            onPress={onTogglePaid}
            hitSlop={8}
            style={{
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: colors.primaryLight,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
              {isIncome ? 'recebi ✓' : 'paguei ✓'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
