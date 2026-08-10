// Formulário de evento da Agenda (viagem, aniversário, Natal, cinema...).
// Valor planejado no cadastro; ao finalizar, informa o quanto gastou de verdade.

import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { today } from '../utils/date';
import { formatMoney } from '../utils/money';
import { DateField, Field, MoneyField, TextField } from './fields';
import { Button, Sheet } from './ui';

const EVENT_EMOJIS = ['🗓️', '✈️', '🎂', '🎄', '🎬', '🎉', '🏖️', '🍽️', '🎁', '⚽', '🎢', '💐'];

const EMPTY = { name: '', emoji: '🗓️', date: today(), description: '', plannedCents: 0 };

export default function EventForm({ visible, onClose, onSaved, event }) {
  const { colors } = useTheme();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!visible) return;
    setForm(
      event
        ? {
            name: event.name,
            emoji: event.emoji,
            date: event.date,
            description: event.description ?? '',
            plannedCents: event.planned_cents,
          }
        : EMPTY
    );
  }, [visible, event]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome pro evento (ex.: Viagem pra praia).');
      return;
    }
    db.saveEvent({
      id: event?.id,
      name: form.name.trim(),
      emoji: form.emoji || '🗓️',
      date: form.date,
      description: form.description.trim(),
      plannedCents: form.plannedCents,
      spentCents: event?.spent_cents ?? 0,
      done: event?.done ?? 0,
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar evento', 'Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { db.deleteEvent(event.id); onSaved?.(); onClose(); } },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={event ? 'Editar evento' : 'Novo evento'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {event ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Aniversário da mãe" maxLength={40} />
      </Field>

      <Field label="Ícone">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EVENT_EMOJIS.map((e) => (
            <Text
              key={e}
              onPress={() => set({ emoji: e })}
              style={{
                fontSize: 22,
                padding: 6,
                borderRadius: 10,
                backgroundColor: form.emoji === e ? colors.primaryLight : colors.cardAlt,
              }}
            >
              {e}
            </Text>
          ))}
        </View>
      </Field>

      <Field label="Data">
        <DateField value={form.date} onChange={(d) => set({ date: d })} />
      </Field>

      <Field label="Valor planejado">
        <MoneyField key={event?.id ?? 'new-event'} cents={form.plannedCents} onChange={(c) => set({ plannedCents: c })} color={colors.warning} />
      </Field>

      <Field label="Descrição (opcional)">
        <TextField value={form.description} onChangeText={(t) => set({ description: t })} placeholder="O que está planejando?" multiline />
      </Field>

      {form.plannedCents > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Meta de gasto: {formatMoney(form.plannedCents)}. Ao finalizar o evento você diz quanto gastou de verdade.
        </Text>
      ) : null}
    </Sheet>
  );
}
