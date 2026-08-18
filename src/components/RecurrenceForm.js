// Cadastro de conta fixa / receita recorrente.

import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as db from '../db';
import { PAYMENT_METHODS, fontForWeight } from '../theme';
import { useTheme } from '../theme-context';
import { currentMonth, monthOf } from '../utils/date';
import { formatMoney } from '../utils/money';
import { CategoryField, ChipRow, DateField, Field, MoneyField, StepperField, SwitchRow, TextField } from './fields';
import { Button, Sheet } from './ui';

const EMPTY = {
  kind: 'expense',
  name: '',
  amountCents: 0,
  dueDay: 10,
  categoryId: null,
  accountId: null,
  paymentMethod: null,
  remindDays: 3,
  variable: false,
  active: true,
  endMonth: null,
};

export default function RecurrenceForm({ visible, onClose, onSaved, recurrence, defaultKind = 'expense' }) {
  const { colors } = useTheme();
  const [form, setForm] = useState(EMPTY);
  const accounts = useMemo(() => (visible ? db.getAccounts() : []), [visible]);

  useEffect(() => {
    if (!visible) return;
    if (recurrence) {
      setForm({
        kind: recurrence.kind,
        name: recurrence.name,
        amountCents: recurrence.amount_cents,
        dueDay: recurrence.due_day,
        categoryId: recurrence.category_id,
        accountId: recurrence.account_id,
        paymentMethod: recurrence.payment_method,
        remindDays: recurrence.remind_days,
        variable: recurrence.variable === 1,
        active: recurrence.active === 1,
        endMonth: recurrence.end_month,
      });
    } else {
      setForm({ ...EMPTY, kind: defaultKind });
    }
  }, [visible, recurrence, defaultKind]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isIncome = form.kind === 'income';

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome pra essa conta (ex.: Internet, Netflix, Faculdade).');
      return;
    }
    db.saveRecurrence({
      id: recurrence?.id,
      kind: form.kind,
      name: form.name.trim(),
      amountCents: form.amountCents,
      dueDay: form.dueDay,
      categoryId: form.categoryId,
      accountId: form.accountId,
      paymentMethod: form.paymentMethod,
      remindDays: form.remindDays,
      variable: form.variable,
      active: form.active,
      startMonth: recurrence?.start_month ?? currentMonth(),
      endMonth: form.endMonth,
    });
    db.materializeOpenMonths();
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert(
      'Apagar conta fixa',
      'Os pagamentos já feitos continuam no histórico; só as cobranças previstas somem. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            db.deleteRecurrence(recurrence.id);
            onSaved?.();
            onClose();
          },
        },
      ]
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={recurrence ? 'Editar conta fixa' : isIncome ? 'Nova receita recorrente' : 'Nova conta fixa'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {recurrence ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      {!recurrence ? (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Button
            title="Conta a pagar"
            variant={!isIncome ? 'primary' : 'ghost'}
            style={{ flex: 1, backgroundColor: !isIncome ? colors.expense : undefined, borderColor: !isIncome ? colors.expense : colors.border }}
            onPress={() => set({ kind: 'expense', categoryId: null })}
          />
          <Button
            title="A receber"
            variant={isIncome ? 'primary' : 'ghost'}
            style={{ flex: 1, backgroundColor: isIncome ? colors.income : undefined, borderColor: isIncome ? colors.income : colors.border }}
            onPress={() => set({ kind: 'income', categoryId: null })}
          />
        </View>
      ) : null}

      <Field label="Nome">
        <TextField
          value={form.name}
          onChangeText={(t) => set({ name: t })}
          placeholder={isIncome ? 'Ex.: Salário' : 'Ex.: Internet'}
          maxLength={40}
        />
      </Field>

      <Field label={form.variable ? 'Valor médio' : 'Valor'}>
        <MoneyField
          key={recurrence?.id ?? 'new-rec'}
          cents={form.amountCents}
          onChange={(c) => set({ amountCents: c })}
          color={isIncome ? colors.income : colors.expense}
        />
      </Field>

      <Field label={isIncome ? 'Dia do recebimento' : 'Dia do vencimento'} hint="Em meses curtos o app ajusta pro último dia.">
        <StepperField value={form.dueDay} onChange={(v) => set({ dueDay: v })} min={1} max={31} suffix="do mês" />
      </Field>

      <Field label="Categoria">
        <CategoryField kind={form.kind} value={form.categoryId} onChange={(id) => set({ categoryId: id })} />
      </Field>

      <Field label="Forma de pagamento">
        <ChipRow options={PAYMENT_METHODS} value={form.paymentMethod} onChange={(m) => set({ paymentMethod: m })} allowEmpty />
      </Field>

      <Field label="Avisar quantos dias antes" style={{ marginTop: 14 }}>
        <StepperField value={form.remindDays} onChange={(v) => set({ remindDays: v })} min={0} max={15} suffix="dias antes" />
      </Field>

      <SwitchRow
        emoji="📊"
        label="O valor muda todo mês"
        hint="Marque para contas como energia e água — o valor acima vira só uma estimativa."
        value={form.variable}
        onChange={(v) => set({ variable: v })}
      />

      <SwitchRow
        emoji="🔁"
        label="Ativa"
        hint="Desative para parar de gerar cobranças sem perder o histórico."
        value={form.active}
        onChange={(v) => set({ active: v })}
      />

      <Field label="Última cobrança (opcional)" hint="Use em financiamentos e contratos com prazo pra acabar.">
        <DateField value={form.endMonth ? `${form.endMonth}-01` : null} onChange={(d) => set({ endMonth: monthOf(d) })} placeholder="Sem data pra acabar" />
      </Field>

      {form.endMonth ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
          Última cobrança em {form.endMonth}.{' '}
          <Text style={{ color: colors.primary, fontFamily: fontForWeight('700') }} onPress={() => set({ endMonth: null })}>
            Remover
          </Text>
        </Text>
      ) : null}

      {form.amountCents > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 }}>
          Isso dá {formatMoney(form.amountCents * 12)} por ano.
        </Text>
      ) : null}
    </Sheet>
  );
}
