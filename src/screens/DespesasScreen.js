// Painel de despesas, organizado por mês. Abas:
//   Todas     → tudo que saiu no mês (lista por dia + gráfico de categorias).
//   Fixas     → contas fixas de mesmo valor (mensalidades) + parcelas.
//   Variáveis → contas que mudam de valor todo mês (água, energia...).
// O botão "Registrar despesa" fica em destaque no topo.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { dueLabel, formatDateLong, monthLabel, today } from '../utils/date';
import { formatMoney } from '../utils/money';
import { DonutChart, DonutLegend } from '../components/charts';
import { ChipRow } from '../components/fields';
import MonthSwitcher from '../components/MonthSwitcher';
import SalarySheet from '../components/SalarySheet';
import TipCard from '../components/TipCard';
import TransactionRow from '../components/TransactionRow';
import { Button, Card, Divider, EmptyState, Header, IconBubble, Money, Muted, SectionTitle, Segmented } from '../components/ui';

const TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'fixed', label: 'Fixas' },
  { key: 'variable', label: 'Variáveis' },
];

export default function DespesasScreen() {
  const { colors } = useTheme();
  const { month, version, refresh, openTransaction, navigate } = useApp();
  const [tab, setTab] = useState('all');
  const [categoryId, setCategoryId] = useState(null);
  const [data, setData] = useState(null);
  const [openingSalary, setOpeningSalary] = useState(false);

  useEffect(() => {
    const recs = db.getRecurrencesForMonth(month, 'expense').filter((r) => r.in_month);
    setData({
      open: db.isMonthOpen(month),
      summary: db.getMonthSummary(month),
      breakdown: db.getCategoryBreakdown(month, 'expense'),
      days: db.getTransactionsByDay({ month, kind: 'expense', categoryId }),
      categories: db.getCategoryTree('expense'),
      fixed: recs.filter((r) => !r.variable),
      variable: recs.filter((r) => r.variable),
      installments: db.getInstallments({ onlyOpen: true }),
    });
  }, [month, version, categoryId]);

  if (!data) return null;
  const { open, summary, breakdown, days, categories, fixed, variable, installments } = data;
  const donutData = breakdown.map((c) => ({ name: c.name, value: c.total_cents, color: c.color, emoji: c.emoji }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Despesas" subtitle={monthLabel(month, { full: true })} />

      <View style={{ marginTop: 14, gap: 10 }}>
        <MonthSwitcher />
      </View>

      {/* Botão de registrar em destaque */}
      <Button title="Registrar despesa" icon="＋" onPress={() => openTransaction(null, 'expense')} style={{ marginTop: 12, paddingVertical: 15, backgroundColor: colors.expense, borderColor: colors.expense }} />

      {!open ? (
        <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 20 }}>🔒</Text>
          <View style={{ flex: 1 }}><Muted size={12}>Mês não aberto — as contas fixas entram depois de abrir.</Muted></View>
          <Button title="Abrir" variant="soft" onPress={() => setOpeningSalary(true)} style={{ paddingHorizontal: 14 }} />
        </Card>
      ) : null}

      <SalarySheet
        visible={openingSalary}
        title={`Abrir ${monthLabel(month)}`}
        subtitle="Quanto você recebeu de salário neste mês? Dá pra ajustar depois na aba Meses."
        initial={db.getSalary().cents}
        confirmLabel="Abrir mês"
        onClose={() => setOpeningSalary(false)}
        onConfirm={(cents) => { db.openMonth(month); db.setMonthSalary(month, cents); refresh(); }}
      />

      {/* Resumo */}
      <Card style={{ marginTop: 12, flexDirection: 'row' }}>
        <SummaryCell label="Receitas" value={summary.income} color={colors.income} />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <SummaryCell label="Despesas" value={summary.expense} color={colors.expense} />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <SummaryCell label="Saldo restante" value={summary.leftover} color={summary.leftover >= 0 ? colors.income : colors.expense} />
      </Card>

      <View style={{ marginTop: 14 }}>
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </View>

      <TipCard
        tipKey="expenses-tabs"
        emoji="💡"
        title="Fixas x Variáveis"
        text="Fixas têm sempre o mesmo valor (Netflix, aluguel). Variáveis mudam todo mês (água, energia) — ao pagar, você ajusta o valor real."
        style={{ marginTop: 14 }}
      />

      {tab === 'all' ? (
        <AllTab
          breakdown={breakdown}
          donutData={donutData}
          summary={summary}
          days={days}
          categories={categories}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          openTransaction={openTransaction}
          refresh={refresh}
        />
      ) : null}

      {tab === 'fixed' ? (
        <FixedTab items={fixed} installments={installments} month={month} refresh={refresh} navigate={navigate} />
      ) : null}

      {tab === 'variable' ? (
        <VariableTab items={variable} month={month} refresh={refresh} navigate={navigate} openTransaction={openTransaction} />
      ) : null}
    </ScrollView>
  );
}

function AllTab({ breakdown, donutData, summary, days, categories, categoryId, setCategoryId, openTransaction, refresh }) {
  const { colors } = useTheme();
  return (
    <>
      {breakdown.length > 0 ? (
        <>
          <SectionTitle>Por categoria</SectionTitle>
          <Card>
            <DonutChart data={donutData} centerLabel="gastos do mês" centerValue={formatMoney(summary.expense)} />
            <View style={{ height: 14 }} />
            <DonutLegend data={donutData} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Lançamentos</SectionTitle>
      <View style={{ marginBottom: 4 }}>
        <ChipRow
          options={categories.map((c) => ({ key: c.id, label: c.name, emoji: c.emoji, color: c.color }))}
          value={categoryId}
          onChange={setCategoryId}
          allowEmpty
        />
      </View>

      {days.length === 0 ? (
        <Card style={{ marginTop: 10 }}>
          <EmptyState emoji="🧾" title="Nenhuma despesa" subtitle="Toque em Registrar despesa pra lançar seu primeiro gasto do mês." />
        </Card>
      ) : (
        days.map((day) => (
          <View key={day.date} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.textMuted }}>{formatDateLong(day.date)}</Text>
              <Muted size={12}>-{formatMoney(day.totalOut)}</Muted>
            </View>
            <Card>
              {day.items.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 ? <Divider /> : null}
                  <TransactionRow tx={tx} onPress={() => openTransaction(tx)} onTogglePaid={() => { db.setTransactionPaid(tx.id, true); refresh(); }} />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </>
  );
}

function FixedTab({ items, installments, month, refresh, navigate }) {
  const { colors } = useTheme();
  const total = items.reduce((s, r) => s + r.month_amount_cents, 0);
  const instTotal = installments.reduce((s, i) => s + Math.round(i.total_cents / i.count), 0);

  return (
    <>
      <Card style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Muted size={12}>Contas fixas do mês</Muted>
          <Money cents={total} size={20} />
        </View>
        <Button title="Gerenciar" variant="ghost" onPress={() => navigate('bills')} />
      </Card>

      <SectionTitle>Mensalidades e assinaturas</SectionTitle>
      {items.length === 0 ? (
        <Card><EmptyState emoji="🧾" title="Nenhuma conta fixa" subtitle="Cadastre pelo + (marque Recorrente) ou em Contas fixas." action="Ver contas fixas" onAction={() => navigate('bills')} /></Card>
      ) : (
        <Card>
          {items.map((rec, i) => (
            <View key={rec.id}>
              {i > 0 ? <Divider /> : null}
              <RecRow rec={rec} month={month} refresh={refresh} />
            </View>
          ))}
        </Card>
      )}

      <SectionTitle action="ver todas" onAction={() => navigate('installments')}>Parcelas</SectionTitle>
      {installments.length === 0 ? (
        <Card><EmptyState emoji="💳" title="Nenhuma parcela em aberto" subtitle="Compras parceladas aparecem aqui." action="Cadastrar" onAction={() => navigate('installments')} /></Card>
      ) : (
        <Card>
          {installments.map((it, i) => (
            <View key={it.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => navigate('installments')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
                <IconBubble emoji={it.parent_emoji ?? it.category_emoji ?? '💳'} color={it.parent_color ?? it.category_color ?? colors.expense} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{it.description}</Text>
                  <Muted size={12}>parcela {it.paid_parcels + 1}/{it.count} · {formatMoney(Math.round(it.total_cents / it.count))}</Muted>
                </View>
                {it.off_budget === 1 ? <Muted size={11}>fora do saldo</Muted> : null}
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function VariableTab({ items, month, refresh, navigate, openTransaction }) {
  const { colors } = useTheme();
  const total = items.reduce((s, r) => s + r.month_amount_cents, 0);

  return (
    <>
      <Card style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Muted size={12}>Contas variáveis (estimativa)</Muted>
          <Money cents={total} size={20} />
        </View>
        <Button title="Gerenciar" variant="ghost" onPress={() => navigate('bills')} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Muted size={12}>Água, energia, gás... o valor muda todo mês. Ao pagar, ajuste o valor real do mês.</Muted>
      </Card>

      <SectionTitle>Contas variáveis do mês</SectionTitle>
      {items.length === 0 ? (
        <Card><EmptyState emoji="💡" title="Nenhuma conta variável" subtitle="Cadastre pelo + (Recorrente › o valor muda todo mês)." action="Ver contas fixas" onAction={() => navigate('bills')} /></Card>
      ) : (
        <Card>
          {items.map((rec, i) => (
            <View key={rec.id}>
              {i > 0 ? <Divider /> : null}
              <RecRow rec={rec} month={month} refresh={refresh} variable openTransaction={openTransaction} />
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function RecRow({ rec, month, refresh, variable, openTransaction }) {
  const { colors } = useTheme();
  const late = !rec.is_paid && rec.due_date < today();

  function markPaid() {
    if (rec.transaction) db.setTransactionPaid(rec.transaction.id, true);
    else db.saveTransaction({ kind: 'expense', amountCents: rec.month_amount_cents, date: rec.due_date, categoryId: rec.category_id, accountId: rec.account_id, description: rec.name, paid: 1, recurrenceId: rec.id });
    refresh();
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
      <Pressable
        onPress={() => (variable && rec.transaction ? openTransaction?.(rec.transaction) : null)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
      >
        <IconBubble emoji={rec.parent_emoji ?? rec.category_emoji ?? '🧾'} color={rec.is_paid ? colors.income : late ? colors.expense : (rec.parent_color ?? rec.category_color ?? colors.warning)} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{rec.name}</Text>
          <Text style={{ fontSize: 12, color: late ? colors.expense : colors.textMuted, marginTop: 2 }}>
            dia {rec.due_day} · {rec.is_paid ? 'pago ✓' : dueLabel(rec.due_date)}{variable ? ' · valor estimado' : ''}
          </Text>
        </View>
      </Pressable>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: rec.is_paid ? colors.textMuted : colors.text }}>{formatMoney(rec.month_amount_cents)}</Text>
        {!rec.is_paid ? (
          <Pressable onPress={markPaid} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.primaryLight }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>paguei ✓</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SummaryCell({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color, marginTop: 3 }} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(value)}</Text>
    </View>
  );
}
