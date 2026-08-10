// Cadastro de compra parcelada. Ao salvar, as N parcelas já nascem como
// lançamentos previstos — é o que faz o app enxergar os próximos meses.

import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as db from '../db';
import { PAYMENT_METHODS } from '../theme';
import { useTheme } from '../theme-context';
import { addMonths, monthLabel, monthOf, today } from '../utils/date';
import { formatMoney, splitInstallments } from '../utils/money';
import { CategoryField, ChipRow, DateField, Field, MoneyField, PickerField, StepperField, SwitchRow, TextField } from './fields';
import { Button, Sheet } from './ui';

const EMPTY = {
  description: '',
  totalCents: 0,
  count: 10,
  firstDate: today(),
  paidUntil: 0,
  categoryId: null,
  accountId: null,
  paymentMethod: 'credito',
  includeInBalance: true,
  note: '',
};

export default function InstallmentForm({ visible, onClose, onSaved, installment }) {
  const { colors } = useTheme();
  const [form, setForm] = useState(EMPTY);
  const accounts = useMemo(() => (visible ? db.getAccounts() : []), [visible]);
  const editing = Boolean(installment);

  useEffect(() => {
    if (!visible) return;
    if (installment) {
      setForm({
        description: installment.description,
        totalCents: installment.total_cents,
        count: installment.count,
        firstDate: installment.first_date,
        paidUntil: installment.paid_parcels ?? 0,
        categoryId: installment.category_id,
        accountId: installment.account_id,
        paymentMethod: installment.payment_method,
        includeInBalance: installment.off_budget !== 1,
        note: installment.note ?? '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [visible, installment]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const parcelValue = form.count > 0 ? splitInstallments(form.totalCents, form.count)[form.count - 1] : 0;
  const lastMonth = addMonths(monthOf(form.firstDate), form.count - 1);
  const remaining = form.totalCents - splitInstallments(form.totalCents, form.count)
    .slice(0, form.paidUntil)
    .reduce((a, b) => a + b, 0);

  function handleSave() {
    if (!form.description.trim()) {
      Alert.alert('Falta o nome', 'Diga o que foi comprado (ex.: Notebook).');
      return;
    }
    if (form.totalCents <= 0) {
      Alert.alert('Falta o valor', 'Informe o valor total da compra.');
      return;
    }

    if (editing) {
      db.updateInstallmentInfo({
        id: installment.id,
        description: form.description.trim(),
        categoryId: form.categoryId,
        accountId: form.accountId,
        paymentMethod: form.paymentMethod,
        offBudget: form.includeInBalance ? 0 : 1,
        note: form.note.trim(),
      });
    } else {
      db.createInstallment({
        description: form.description.trim(),
        totalCents: form.totalCents,
        count: form.count,
        firstDate: form.firstDate,
        categoryId: form.categoryId,
        accountId: form.accountId,
        paymentMethod: form.paymentMethod,
        paidUntil: form.paidUntil,
        offBudget: form.includeInBalance ? 0 : 1,
        note: form.note.trim(),
      });
    }
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar parcelamento', 'Todas as parcelas (pagas e a pagar) serão removidas. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          db.deleteInstallment(installment.id);
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
      title={editing ? 'Editar parcelamento' : 'Nova compra parcelada'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {editing ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="O que você comprou">
        <TextField
          value={form.description}
          onChangeText={(t) => set({ description: t })}
          placeholder="Ex.: Notebook"
          maxLength={40}
        />
      </Field>

      <Field label="Valor total">
        <MoneyField
          key={installment?.id ?? 'new-inst'}
          cents={form.totalCents}
          onChange={(c) => set({ totalCents: c })}
          color={colors.expense}
        />
      </Field>

      {editing ? null : (
        <>
          <Field label="Em quantas vezes">
            <StepperField value={form.count} onChange={(v) => set({ count: v })} min={2} max={72} suffix="parcelas" />
          </Field>

          <Field label="Data da primeira parcela">
            <DateField value={form.firstDate} onChange={(d) => set({ firstDate: d })} />
          </Field>

          <Field
            label="Parcelas já pagas"
            hint="Se a compra é antiga, informe quantas você já pagou — o resto entra como previsto."
          >
            <StepperField value={form.paidUntil} onChange={(v) => set({ paidUntil: v })} min={0} max={form.count} suffix="pagas" />
          </Field>
        </>
      )}

      <Field label="Categoria">
        <CategoryField kind="expense" value={form.categoryId} onChange={(id) => set({ categoryId: id })} />
      </Field>

      <Field label="Conta / cartão">
        <PickerField
          label="Conta"
          placeholder="Escolher conta"
          value={form.accountId}
          onChange={(id) => set({ accountId: id })}
          allowEmpty
          options={accounts.map((a) => ({ key: a.id, label: a.name, emoji: a.emoji }))}
        />
      </Field>

      <Field label="Forma de pagamento">
        <ChipRow options={PAYMENT_METHODS} value={form.paymentMethod} onChange={(m) => set({ paymentMethod: m })} allowEmpty />
      </Field>

      <SwitchRow
        emoji="💰"
        label="Incluir no saldo mensal"
        hint="Desligue se essa compra não sai do SEU orçamento — ex.: está no cartão de outra pessoa. Ela continua sendo acompanhada aqui, mas não desconta do seu saldo."
        value={form.includeInBalance}
        onChange={(v) => set({ includeInBalance: v })}
      />

      <Field label="Observação (opcional)">
        <TextField value={form.note} onChangeText={(t) => set({ note: t })} placeholder="Ex.: no cartão do meu pai" maxLength={60} />
      </Field>

      {form.totalCents > 0 && form.count > 1 && !editing ? (
        <View
          style={{
            backgroundColor: colors.primaryLight,
            borderRadius: 14,
            padding: 14,
            marginTop: 6,
            marginBottom: 8,
            gap: 4,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
            {form.count}x de {formatMoney(parcelValue)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Falta pagar {formatMoney(remaining)} · última parcela em {monthLabel(lastMonth, { full: true })}
          </Text>
        </View>
      ) : null}

      {editing ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 }}>
          Nome, categoria e conta valem pras parcelas ainda em aberto. Pra mudar valor ou quantidade,
          apague e cadastre de novo.
        </Text>
      ) : null}
    </Sheet>
  );
}
