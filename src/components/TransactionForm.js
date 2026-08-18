// O "+" central: cria despesa/receita ÚNICA ou RECORRENTE, tudo aqui.
//   - Única  -> vira um lançamento (transactions).
//   - Recorrente -> vira uma conta fixa (recurrences) que entra automática nos
//     meses abertos. Escolhe período (mensal/anual) e se o valor muda todo mês.
// A forma de pagamento direciona o gasto: crédito -> cartão; resto -> conta.

import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { PAYMENT_METHODS, fontForWeight } from '../theme';
import { useTheme } from '../theme-context';
import { currentMonth, today } from '../utils/date';
import { deleteReceipt, pickReceipt } from '../utils/receipts';
import { CategoryField, ChipRow, DateField, Field, MoneyField, PickerField, StepperField, SwitchRow, TextField } from './fields';
import { Button, Muted, Sheet } from './ui';

const defaultDateFor = (month) => (month === currentMonth() ? today() : `${month}-01`);

const PERIODS = [
  { key: 'monthly', label: 'Mensal' },
  { key: 'annual', label: 'Anual' },
];

const EMPTY = (kind, date) => ({
  kind,
  amountCents: 0,
  date,
  categoryId: null,
  accountId: null,
  cardId: null,
  paymentMethod: null,
  description: '',
  receiptUri: null,
  paid: true,
  // recorrência
  recurring: false,
  period: 'monthly',
  dueDay: 10,
  variable: false,
});

export default function TransactionForm({ visible, onClose, onSaved, transaction, defaultKind = 'expense', presetCategoryId = null }) {
  const { colors } = useTheme();
  const { month } = useApp();
  const [form, setForm] = useState(() => EMPTY(defaultKind, today()));

  const accounts = useMemo(() => (visible ? db.getAccounts() : []), [visible]);
  const cards = useMemo(() => (visible ? db.getCards() : []), [visible]);

  useEffect(() => {
    if (!visible) return;
    if (transaction) {
      setForm({
        ...EMPTY(transaction.kind, transaction.date),
        amountCents: transaction.amount_cents,
        categoryId: transaction.category_id,
        accountId: transaction.account_id,
        cardId: transaction.card_id,
        paymentMethod: transaction.payment_method,
        description: transaction.description ?? '',
        receiptUri: transaction.receipt_uri,
        paid: transaction.paid === 1,
      });
    } else {
      const lastAccount = db.getSetting('last_account');
      setForm({
        ...EMPTY(defaultKind, defaultDateFor(month)),
        categoryId: presetCategoryId ?? null,
        accountId: lastAccount ? Number(lastAccount) : accounts[0]?.id ?? null,
      });
    }
  }, [visible, transaction, defaultKind, presetCategoryId, month]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isIncome = form.kind === 'income';
  const tint = isIncome ? colors.income : colors.expense;
  const isCredit = form.paymentMethod === 'credito';
  const locked = Boolean(transaction?.installment_id);

  function handleSave() {
    if (form.amountCents <= 0) {
      Alert.alert('Falta o valor', 'Digite um valor maior que zero.');
      return;
    }

    if (form.recurring && !transaction) {
      // Cria uma conta fixa (recorrência) e joga nos meses abertos.
      db.saveRecurrence({
        kind: form.kind,
        name: form.description.trim() || (isIncome ? 'Receita fixa' : 'Conta fixa'),
        amountCents: form.amountCents,
        dueDay: form.dueDay,
        categoryId: form.categoryId,
        accountId: isCredit ? null : form.accountId,
        paymentMethod: form.paymentMethod,
        cardId: isCredit ? form.cardId : null,
        variable: form.variable,
        active: true,
        period: form.period,
        startMonth: month,
      });
      db.materializeOpenMonths();
      if (form.accountId) db.setSetting('last_account', form.accountId);
      onSaved?.();
      onClose();
      return;
    }

    db.saveTransaction({
      id: transaction?.id,
      kind: form.kind,
      amountCents: form.amountCents,
      date: form.date,
      categoryId: form.categoryId,
      accountId: isCredit ? null : form.accountId,
      cardId: isCredit ? form.cardId : null,
      paymentMethod: form.paymentMethod,
      description: form.description.trim(),
      receiptUri: form.receiptUri,
      paid: form.paid ? 1 : 0,
      recurrenceId: transaction?.recurrence_id ?? null,
      installmentId: transaction?.installment_id ?? null,
      installmentNo: transaction?.installment_no ?? null,
      installmentTotal: transaction?.installment_total ?? null,
    });
    if (form.accountId) db.setSetting('last_account', form.accountId);
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar lançamento', 'Isso não pode ser desfeito. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          if (transaction.receipt_uri) deleteReceipt(transaction.receipt_uri);
          db.deleteTransaction(transaction.id);
          onSaved?.();
          onClose();
        },
      },
    ]);
  }

  function handleReceipt() {
    Alert.alert('Comprovante', 'De onde vem a imagem?', [
      { text: 'Câmera', onPress: async () => set({ receiptUri: (await pickReceipt(true)) ?? form.receiptUri }) },
      { text: 'Galeria', onPress: async () => set({ receiptUri: (await pickReceipt(false)) ?? form.receiptUri }) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  const title = transaction
    ? 'Editar lançamento'
    : form.recurring
      ? isIncome ? 'Nova receita fixa' : 'Nova conta fixa'
      : isIncome ? 'Nova receita' : 'Nova despesa';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {transaction ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      {!transaction ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <Button
              title="Despesa"
              variant={!isIncome ? 'primary' : 'ghost'}
              style={{ flex: 1, backgroundColor: !isIncome ? colors.expense : undefined, borderColor: !isIncome ? colors.expense : colors.border }}
              onPress={() => set({ kind: 'expense', categoryId: null })}
            />
            <Button
              title="Receita"
              variant={isIncome ? 'primary' : 'ghost'}
              style={{ flex: 1, backgroundColor: isIncome ? colors.income : undefined, borderColor: isIncome ? colors.income : colors.border }}
              onPress={() => set({ kind: 'income', categoryId: null })}
            />
          </View>

          {/* Única x Recorrente — o coração da diferenciação */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TypeCard
              title="Única"
              subtitle="só neste mês"
              icon="1×"
              active={!form.recurring}
              onPress={() => set({ recurring: false })}
            />
            <TypeCard
              title="Recorrente"
              subtitle="repete todo mês"
              icon="🔁"
              active={form.recurring}
              onPress={() => set({ recurring: true })}
            />
          </View>
        </>
      ) : null}

      <Field label={form.variable && form.recurring ? 'Valor médio' : 'Valor'}>
        <MoneyField key={`${form.kind}-${transaction?.id ?? 'new'}`} cents={form.amountCents} onChange={(c) => set({ amountCents: c })} color={tint} autoFocus={!transaction} />
      </Field>

      {form.recurring && !transaction ? (
        <>
          <Field label="Período">
            <ChipRow options={PERIODS} value={form.period} onChange={(p) => set({ period: p })} />
          </Field>
          <Field label={isIncome ? 'Dia do recebimento' : 'Dia do vencimento'} hint="Entra automático nos meses que você abrir.">
            <StepperField value={form.dueDay} onChange={(v) => set({ dueDay: v })} min={1} max={31} suffix="do mês" />
          </Field>
          <SwitchRow
            emoji="📊"
            label="O valor muda todo mês"
            hint="Marque para água, energia... (vira conta variável). O valor acima fica como estimativa."
            value={form.variable}
            onChange={(v) => set({ variable: v })}
          />
        </>
      ) : (
        <Field label="Data">
          <DateField value={form.date} onChange={(d) => set({ date: d })} />
        </Field>
      )}

      <Field label="Categoria">
        <CategoryField kind={form.kind} value={form.categoryId} onChange={(id) => set({ categoryId: id })} />
      </Field>

      <Field label="Forma de pagamento">
        <ChipRow
          options={PAYMENT_METHODS}
          value={form.paymentMethod}
          onChange={(m) => set({ paymentMethod: m, cardId: m === 'credito' ? form.cardId : null })}
          allowEmpty
        />
      </Field>

      {isCredit ? (
        <Field label="Cartão" hint={cards.length === 0 ? 'Cadastre um cartão em Carteira › Cartões.' : undefined}>
          <PickerField
            label="Cartão"
            placeholder={cards.length === 0 ? 'Nenhum cartão cadastrado' : 'Escolher cartão'}
            value={form.cardId}
            onChange={(id) => set({ cardId: id })}
            options={cards.map((c) => ({ key: c.id, label: c.name, emoji: '💳' }))}
          />
        </Field>
      ) : (
        <Field label="Conta">
          <PickerField
            label="Conta"
            placeholder="Escolher conta"
            value={form.accountId}
            onChange={(id) => set({ accountId: id })}
            allowEmpty
            options={accounts.map((a) => ({ key: a.id, label: a.name, emoji: a.emoji }))}
          />
        </Field>
      )}

      <Field label={form.recurring ? 'Nome' : 'Descrição'} hint={form.recurring ? 'Ex.: Internet, Netflix, Faculdade' : undefined}>
        <TextField
          value={form.description}
          onChangeText={(t) => set({ description: t })}
          placeholder={form.recurring ? 'Ex.: Internet' : isIncome ? 'Ex.: salário de março' : 'Ex.: mercado do mês'}
          maxLength={80}
        />
      </Field>

      {!form.recurring ? (
        <SwitchRow
          emoji={isIncome ? '💰' : '✅'}
          label={isIncome ? 'Já recebi' : 'Já paguei'}
          hint="Desmarque para deixar como previsto — aparece nos vencimentos."
          value={form.paid}
          onChange={(v) => set({ paid: v })}
        />
      ) : null}

      {form.recurring ? (
        <Muted size={12} style={{ marginBottom: 8 }}>
          Vai aparecer também em Despesas › {form.variable ? 'Variáveis' : 'Fixas'} e no módulo Contas fixas.
        </Muted>
      ) : null}

      {!form.recurring && !transaction ? (
        <Field label="Comprovante (opcional)">
          {form.receiptUri ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Image source={{ uri: form.receiptUri }} style={{ width: 66, height: 66, borderRadius: 12, backgroundColor: colors.cardAlt }} />
              <Pressable onPress={handleReceipt}><Text style={{ color: colors.primary, fontFamily: fontForWeight('700') }}>Trocar</Text></Pressable>
              <Pressable onPress={() => set({ receiptUri: null })}><Text style={{ color: colors.expense, fontFamily: fontForWeight('700') }}>Remover</Text></Pressable>
            </View>
          ) : (
            <Button title="Anexar imagem" icon="📎" variant="ghost" onPress={handleReceipt} />
          )}
        </Field>
      ) : null}

      {locked ? (
        <Muted size={12} style={{ lineHeight: 18, marginBottom: 8 }}>
          Este lançamento é uma parcela. Editar aqui muda só esta parcela — pra mexer na compra
          inteira, vá em Parcelamentos.
        </Muted>
      ) : null}
    </Sheet>
  );
}

function TypeCard({ title, subtitle, icon, active, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primaryLight : colors.card,
        padding: 12,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ fontSize: 14, fontFamily: fontForWeight('700'), color: active ? colors.primary : colors.text, marginTop: 4 }}>{title}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{subtitle}</Text>
    </Pressable>
  );
}
