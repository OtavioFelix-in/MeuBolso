// Cadastro de cartão de crédito: nome, limite, cor e (opcional) dias de
// fechamento/vencimento. Encerrar remove da lista sem apagar o histórico.

import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import * as db from '../db';
import { CHART_COLORS } from '../theme';
import { useTheme } from '../theme-context';
import { EmojiColorField, Field, MoneyField, StepperField, TextField } from './fields';
import { Button, Sheet } from './ui';

const EMPTY = { name: '', limitCents: 0, color: '#7C5CFC', closingDay: 1, dueDay: 10 };

export default function CardForm({ visible, onClose, onSaved, card }) {
  const { colors } = useTheme();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!visible) return;
    setForm(
      card
        ? {
            name: card.name,
            limitCents: card.limit_cents,
            color: card.color,
            closingDay: card.closing_day ?? 1,
            dueDay: card.due_day ?? 10,
          }
        : EMPTY
    );
  }, [visible, card]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome pro cartão (ex.: Nubank).');
      return;
    }
    db.saveCard({
      id: card?.id,
      name: form.name.trim(),
      limitCents: form.limitCents,
      color: form.color,
      closingDay: form.closingDay,
      dueDay: form.dueDay,
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Encerrar cartão', 'Ele sai da lista. As despesas já lançadas continuam salvas. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: () => { db.deleteCard(card.id); onSaved?.(); onClose(); } },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={card ? 'Editar cartão' : 'Novo cartão'}
      height="80%"
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {card ? <Button title="Encerrar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome do cartão">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Nubank" maxLength={30} />
      </Field>

      <Field label="Limite">
        <MoneyField key={card?.id ?? 'new-card'} cents={form.limitCents} onChange={(c) => set({ limitCents: c })} color={form.color} />
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Fecha dia" style={{ flex: 1 }}>
          <StepperField value={form.closingDay} onChange={(v) => set({ closingDay: v })} min={1} max={31} />
        </Field>
        <Field label="Vence dia" style={{ flex: 1 }}>
          <StepperField value={form.dueDay} onChange={(v) => set({ dueDay: v })} min={1} max={31} />
        </Field>
      </View>

      <Field label="Cor">
        <EmojiColorField
          emoji="💳"
          color={form.color}
          onEmoji={() => {}}
          onColor={(c) => set({ color: c })}
          emojis={[]}
          colorOptions={CHART_COLORS}
        />
      </Field>
    </Sheet>
  );
}
