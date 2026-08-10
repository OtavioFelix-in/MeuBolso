// Formulários de metas, investimentos e bens + o sheet de "quanto e quando"
// usado para aportes e depósitos.

import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as db from '../db';
import { ASSET_TYPES, CHART_COLORS, INVESTMENT_TYPES } from '../theme';
import { useTheme } from '../theme-context';
import { today } from '../utils/date';
import { formatMoney } from '../utils/money';
import { DateField, EmojiColorField, Field, MoneyField, PickerField, TextField } from './fields';
import { Button, Sheet } from './ui';

const GOAL_EMOJIS = ['🎯', '🚗', '🏠', '💻', '✈️', '🛟', '💍', '🎓', '📱', '🏖️', '🏍️', '🎁'];

// ---- Metas ----

export function GoalForm({ visible, onClose, onSaved, goal }) {
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: '', emoji: '🎯', color: CHART_COLORS[0], targetCents: 0, deadline: null });

  useEffect(() => {
    if (!visible) return;
    setForm(
      goal
        ? {
            name: goal.name,
            emoji: goal.emoji,
            color: goal.color,
            targetCents: goal.target_cents,
            deadline: goal.deadline,
          }
        : { name: '', emoji: '🎯', color: CHART_COLORS[0], targetCents: 0, deadline: null }
    );
  }, [visible, goal]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome pra meta (ex.: Comprar carro).');
      return;
    }
    db.saveGoal({
      id: goal?.id,
      name: form.name.trim(),
      emoji: form.emoji || '🎯',
      color: form.color,
      targetCents: form.targetCents,
      deadline: form.deadline,
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar meta', 'A meta e os depósitos dela serão removidos. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          db.deleteGoal(goal.id);
          onSaved?.();
          onClose();
        },
      },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={goal ? 'Editar meta' : 'Nova meta'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {goal ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome da meta">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Reserva de emergência" maxLength={40} />
      </Field>

      <Field label="Ícone e cor">
        <EmojiColorField
          emoji={form.emoji}
          color={form.color}
          onEmoji={(e) => set({ emoji: e })}
          onColor={(c) => set({ color: c })}
          emojis={GOAL_EMOJIS}
          colorOptions={CHART_COLORS}
        />
      </Field>

      <Field label="Quanto você quer juntar">
        <MoneyField key={goal?.id ?? 'new-goal'} cents={form.targetCents} onChange={(c) => set({ targetCents: c })} color={form.color} />
      </Field>

      <Field label="Prazo (opcional)" hint="Com prazo, o app calcula quanto guardar por mês pra chegar lá.">
        <DateField value={form.deadline} onChange={(d) => set({ deadline: d })} placeholder="Sem prazo definido" />
      </Field>

      {form.deadline ? (
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 8 }} onPress={() => set({ deadline: null })}>
          Remover prazo
        </Text>
      ) : null}
    </Sheet>
  );
}

// ---- Investimentos ----

export function InvestmentForm({ visible, onClose, onSaved, investment }) {
  const [form, setForm] = useState({ name: '', type: 'cdb', color: CHART_COLORS[1], currentCents: 0, targetCents: 0, note: '' });

  useEffect(() => {
    if (!visible) return;
    setForm(
      investment
        ? {
            name: investment.name,
            type: investment.type,
            color: investment.color,
            currentCents: investment.current_cents,
            targetCents: investment.target_cents,
            note: investment.note ?? '',
          }
        : { name: '', type: 'cdb', color: CHART_COLORS[1], currentCents: 0, targetCents: 0, note: '' }
    );
  }, [visible, investment]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome (ex.: CDB do banco, Tesouro Selic 2029).');
      return;
    }
    db.saveInvestment({
      id: investment?.id,
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      currentCents: form.currentCents,
      targetCents: form.targetCents,
      note: form.note.trim(),
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar investimento', 'O histórico de aportes também será removido. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          db.deleteInvestment(investment.id);
          onSaved?.();
          onClose();
        },
      },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={investment ? 'Editar investimento' : 'Novo investimento'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {investment ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Tesouro Selic 2029" maxLength={40} />
      </Field>

      <Field label="Tipo">
        <PickerField
          label="Tipo de investimento"
          value={form.type}
          onChange={(type) => {
            const info = INVESTMENT_TYPES.find((t) => t.key === type);
            set({ type, color: info?.color ?? form.color });
          }}
          options={INVESTMENT_TYPES.map((t) => ({ key: t.key, label: t.label, emoji: t.emoji }))}
        />
      </Field>

      <Field label="Valor atual" hint="Atualize sempre que olhar o extrato da corretora — é daqui que sai a rentabilidade.">
        <MoneyField key={investment?.id ?? 'new-inv'} cents={form.currentCents} onChange={(c) => set({ currentCents: c })} color={form.color} />
      </Field>

      <Field label="Meta pra este investimento (opcional)">
        <MoneyField key={`target-${investment?.id ?? 'new'}`} cents={form.targetCents} onChange={(c) => set({ targetCents: c })} big={false} />
      </Field>

      <Field label="Cor no gráfico">
        <EmojiColorField
          emoji={INVESTMENT_TYPES.find((t) => t.key === form.type)?.emoji ?? '📦'}
          color={form.color}
          onEmoji={() => {}}
          onColor={(c) => set({ color: c })}
          emojis={[]}
          colorOptions={CHART_COLORS}
        />
      </Field>

      <Field label="Observações">
        <TextField value={form.note} onChangeText={(t) => set({ note: t })} placeholder="Vencimento, taxa, corretora..." multiline />
      </Field>
    </Sheet>
  );
}

// ---- Bens ----

export function AssetForm({ visible, onClose, onSaved, asset }) {
  const [form, setForm] = useState({ name: '', type: 'outro', emoji: '📦', valueCents: 0, purchaseCents: 0, acquiredAt: null, note: '' });

  useEffect(() => {
    if (!visible) return;
    setForm(
      asset
        ? {
            name: asset.name,
            type: asset.type,
            emoji: asset.emoji,
            valueCents: asset.value_cents,
            purchaseCents: asset.purchase_cents ?? 0,
            acquiredAt: asset.acquired_at,
            note: asset.note ?? '',
          }
        : { name: '', type: 'outro', emoji: '📦', valueCents: 0, purchaseCents: 0, acquiredAt: today(), note: '' }
    );
  }, [visible, asset]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Diga qual é o bem (ex.: Notebook, Carro).');
      return;
    }
    db.saveAsset({
      id: asset?.id,
      name: form.name.trim(),
      type: form.type,
      emoji: form.emoji || '📦',
      valueCents: form.valueCents,
      purchaseCents: form.purchaseCents,
      acquiredAt: form.acquiredAt,
      note: form.note.trim(),
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar bem', 'Ele sai do seu patrimônio. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          db.deleteAsset(asset.id);
          onSaved?.();
          onClose();
        },
      },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={asset ? 'Editar bem' : 'Novo bem'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {asset ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Notebook" maxLength={40} />
      </Field>

      <Field label="Tipo">
        <PickerField
          label="Tipo de bem"
          value={form.type}
          onChange={(type) => {
            const info = ASSET_TYPES.find((t) => t.key === type);
            set({ type, emoji: info?.emoji ?? form.emoji });
          }}
          options={ASSET_TYPES.map((t) => ({ key: t.key, label: t.label, emoji: t.emoji }))}
        />
      </Field>

      <Field label="Valor de compra">
        <MoneyField key={`buy-${asset?.id ?? 'new'}`} cents={form.purchaseCents} onChange={(c) => set({ purchaseCents: c })} big={false} />
      </Field>

      <Field label="Quanto vale hoje">
        <MoneyField key={asset?.id ?? 'new-asset'} cents={form.valueCents} onChange={(c) => set({ valueCents: c })} />
      </Field>

      <Field label="Quando adquiriu (opcional)">
        <DateField value={form.acquiredAt} onChange={(d) => set({ acquiredAt: d })} />
      </Field>

      <Field label="Observações">
        <TextField value={form.note} onChangeText={(t) => set({ note: t })} placeholder="Placa, ano, estado de conservação..." multiline />
      </Field>
    </Sheet>
  );
}

// ---- Sheet genérico de valor + data (aportes, depósitos, resgates) ----

export function AmountSheet({ visible, onClose, onConfirm, title, label, color, hint, confirmLabel = 'Confirmar', accounts = null }) {
  const { colors } = useTheme();
  const [cents, setCents] = useState(0);
  const [date, setDate] = useState(today());
  const [accountId, setAccountId] = useState(null);

  useEffect(() => {
    if (visible) {
      setCents(0);
      setDate(today());
      setAccountId(accounts && accounts.length > 0 ? accounts[0].id : null);
    }
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      height="60%"
      footer={
        <Button
          title={confirmLabel}
          onPress={() => {
            if (cents <= 0) {
              Alert.alert('Falta o valor', 'Digite um valor maior que zero.');
              return;
            }
            onConfirm(cents, date, accountId);
            onClose();
          }}
        />
      }
    >
      <Field label={label}>
        <MoneyField key={visible ? 'open' : 'closed'} cents={cents} onChange={setCents} color={color ?? colors.primary} autoFocus />
      </Field>
      <Field label="Data">
        <DateField value={date} onChange={setDate} />
      </Field>
      {accounts && accounts.length > 0 ? (
        <Field label="Sai da conta" hint="O valor é debitado do saldo desta conta.">
          <PickerField
            label="Conta"
            placeholder="Escolher conta"
            value={accountId}
            onChange={setAccountId}
            allowEmpty
            options={accounts.map((a) => ({ key: a.id, label: a.name, emoji: a.emoji }))}
          />
        </Field>
      ) : null}
      {hint ? <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{hint}</Text> : null}
      {cents > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>
          Valor: {formatMoney(cents)}
        </Text>
      ) : null}
    </Sheet>
  );
}
