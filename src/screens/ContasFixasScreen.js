// Tela exclusiva das contas fixas (recorrentes): internet, energia, água,
// streaming, academia... Aparecem automaticamente todo mês. Nada de parcelas ou
// eventos aqui — só o que se repete.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { dueDateFor, dueLabel, formatDate, monthLabel, today } from '../utils/date';
import { formatMoney } from '../utils/money';
import MonthSwitcher from '../components/MonthSwitcher';
import RecurrenceForm from '../components/RecurrenceForm';
import { Card, Divider, EmptyState, Header, IconBubble, Muted, ProgressBar, SectionTitle, Sheet } from '../components/ui';
import { fontForWeight } from '../theme';

export default function ContasFixasScreen() {
  const { colors } = useTheme();
  const { month, version, refresh, back } = useApp();
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState('expense');
  const [history, setHistory] = useState(null);

  const items = useMemo(() => db.getRecurrencesForMonth(month), [month, version]);

  const bills = items.filter((r) => r.kind === 'expense' && r.in_month);
  const incomes = items.filter((r) => r.kind === 'income' && r.in_month);
  const inactive = items.filter((r) => !r.in_month);

  const totalBills = bills.reduce((sum, r) => sum + r.month_amount_cents, 0);
  const paidBills = bills.filter((r) => r.is_paid).reduce((sum, r) => sum + r.month_amount_cents, 0);

  function openNew(kind) {
    setFormKind(kind);
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Contas fixas" subtitle="O que se repete todo mês" onBack={back} />
      <View style={{ marginTop: 14 }}>
        <MonthSwitcher />
      </View>

      <Card style={{ marginTop: 14 }}>
        <Muted>Contas fixas de {monthLabel(month, { full: true })}</Muted>
        <Text style={{ fontSize: 26, fontFamily: fontForWeight('800'), color: colors.text, marginTop: 2 }}>{formatMoney(totalBills)}</Text>
        <View style={{ marginTop: 10, gap: 6 }}>
          <ProgressBar percent={totalBills > 0 ? (paidBills / totalBills) * 100 : 0} color={colors.income} />
          <Muted size={12}>{formatMoney(paidBills)} já pagos · faltam {formatMoney(totalBills - paidBills)}</Muted>
        </View>
      </Card>

      <SectionTitle action="+ nova" onAction={() => openNew('expense')}>A pagar todo mês</SectionTitle>
      <Card>
        {bills.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="Nenhuma conta fixa"
            subtitle="Internet, energia, água, Netflix, academia... cadastre e o app lembra antes de vencer."
            action="Cadastrar conta"
            onAction={() => openNew('expense')}
          />
        ) : (
          bills.map((rec, i) => (
            <View key={rec.id}>
              {i > 0 ? <Divider /> : null}
              <BillRow rec={rec} onEdit={() => { setEditing(rec); setFormOpen(true); }} onHistory={() => setHistory(rec)} onPaid={refresh} />
            </View>
          ))
        )}
      </Card>

      <SectionTitle action="+ nova" onAction={() => openNew('income')}>A receber todo mês</SectionTitle>
      <Card>
        {incomes.length === 0 ? (
          <EmptyState
            emoji="💰"
            title="Nenhuma receita recorrente"
            subtitle="Aluguel recebido, mesada... (o salário fica nos Ajustes)."
            action="Cadastrar receita"
            onAction={() => openNew('income')}
          />
        ) : (
          incomes.map((rec, i) => (
            <View key={rec.id}>
              {i > 0 ? <Divider /> : null}
              <BillRow rec={rec} onEdit={() => { setEditing(rec); setFormOpen(true); }} onHistory={() => setHistory(rec)} onPaid={refresh} />
            </View>
          ))
        )}
      </Card>

      {inactive.length > 0 ? (
        <>
          <SectionTitle>Pausadas ou encerradas</SectionTitle>
          <Card>
            {inactive.map((rec, i) => (
              <View key={rec.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => { setEditing(rec); setFormOpen(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, opacity: 0.6 }}
                >
                  <IconBubble emoji={rec.parent_emoji ?? rec.category_emoji ?? '⏸️'} color={colors.textMuted} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{rec.name}</Text>
                  <Muted size={12}>{rec.active ? 'encerrada' : 'pausada'}</Muted>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <RecurrenceForm
        visible={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={refresh}
        recurrence={editing}
        defaultKind={formKind}
      />
      <HistorySheet recurrence={history} onClose={() => setHistory(null)} />
    </ScrollView>
  );
}

function BillRow({ rec, onEdit, onHistory, onPaid }) {
  const { colors } = useTheme();
  const { month, refresh } = useApp();
  const late = !rec.is_paid && rec.due_date < today();

  function markPaid() {
    if (rec.transaction) {
      db.setTransactionPaid(rec.transaction.id, true);
    } else {
      db.saveTransaction({
        kind: rec.kind,
        amountCents: rec.month_amount_cents,
        date: dueDateFor(month, rec.due_day),
        categoryId: rec.category_id,
        accountId: rec.account_id,
        paymentMethod: rec.payment_method,
        description: rec.name,
        paid: 1,
        recurrenceId: rec.id,
      });
    }
    onPaid?.();
    refresh();
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
      <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <IconBubble
          emoji={rec.parent_emoji ?? rec.category_emoji ?? (rec.kind === 'income' ? '💰' : '🧾')}
          color={rec.is_paid ? colors.income : late ? colors.expense : (rec.parent_color ?? rec.category_color ?? colors.warning)}
        />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: fontForWeight('600'), color: colors.text }}>{rec.name}</Text>
          <Text style={{ fontSize: 12, color: late ? colors.expense : colors.textMuted, marginTop: 2 }}>
            dia {rec.due_day} · {rec.is_paid ? (rec.kind === 'income' ? 'recebido ✓' : 'pago ✓') : dueLabel(rec.due_date)}
            {rec.variable ? ' · valor variável' : ''}
          </Text>
        </View>
      </Pressable>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 15, fontFamily: fontForWeight('700'), color: rec.is_paid ? colors.textMuted : colors.text }}>
          {formatMoney(rec.month_amount_cents)}
        </Text>
        {rec.is_paid ? (
          <Pressable onPress={onHistory} hitSlop={8}>
            <Text style={{ fontSize: 11, color: colors.primary, fontFamily: fontForWeight('700') }}>histórico</Text>
          </Pressable>
        ) : (
          <Pressable onPress={markPaid} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.primaryLight }}>
            <Text style={{ fontSize: 11, fontFamily: fontForWeight('700'), color: colors.primary }}>
              {rec.kind === 'income' ? 'recebi ✓' : 'paguei ✓'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function HistorySheet({ recurrence, onClose }) {
  const { colors } = useTheme();
  const history = useMemo(() => (recurrence ? db.getRecurrenceHistory(recurrence.id) : []), [recurrence]);
  const paid = history.filter((h) => h.paid === 1);
  const average = paid.length > 0 ? Math.round(paid.reduce((s, h) => s + h.amount_cents, 0) / paid.length) : 0;

  return (
    <Sheet visible={Boolean(recurrence)} onClose={onClose} title={recurrence?.name ?? ''} height="70%">
      {paid.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <Muted>Média paga por mês</Muted>
          <Text style={{ fontSize: 22, fontFamily: fontForWeight('800'), color: colors.text, marginTop: 2 }}>{formatMoney(average)}</Text>
          <Muted size={12}>em {paid.length} {paid.length === 1 ? 'mês' : 'meses'} de histórico</Muted>
        </Card>
      ) : null}

      {history.length === 0 ? (
        <EmptyState emoji="🕘" title="Sem histórico ainda" subtitle="Assim que marcar o primeiro pagamento ele aparece aqui." />
      ) : (
        history.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontFamily: fontForWeight('600') }}>{formatDate(item.date)}</Text>
              <Muted size={12}>{item.paid ? 'confirmado' : 'previsto'}</Muted>
            </View>
            <Text style={{ color: item.paid ? colors.text : colors.textMuted, fontFamily: fontForWeight('700') }}>{formatMoney(item.amount_cents)}</Text>
          </View>
        ))
      )}
    </Sheet>
  );
}
