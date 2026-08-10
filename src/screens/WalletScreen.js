// Carteira em 3 áreas: Conta corrente, Investimentos e Cartões de crédito.
//   Conta corrente → saldo de cada conta (aporte debita aqui automático).
//   Investimentos  → valor, rentabilidade, lucro, aportes (escolhe a conta).
//   Cartões        → cadastrar vários, limite, uso, encerrar + conta × cartão.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { INVESTMENT_TYPES } from '../theme';
import { useTheme } from '../theme-context';
import { formatDate, monthLabel } from '../utils/date';
import { formatMoney, formatPercent } from '../utils/money';
import { DonutChart, DonutLegend } from '../components/charts';
import { AccountForm } from '../components/CatalogForms';
import CardForm from '../components/CardForm';
import { AmountSheet, AssetForm, InvestmentForm } from '../components/PlanForms';
import { Badge, Button, Card, Divider, EmptyState, Header, IconBubble, Muted, ProgressBar, SectionTitle, Segmented } from '../components/ui';

const VIEWS = [
  { key: 'account', label: 'Conta' },
  { key: 'investments', label: 'Investim.' },
  { key: 'cards', label: 'Cartões' },
  { key: 'assets', label: 'Bens' },
];

export default function WalletScreen() {
  const { colors } = useTheme();
  const [view, setView] = useState('account');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Carteira" subtitle="Conta, investimentos, cartões e bens" />
      <View style={{ marginTop: 14 }}>
        <Segmented options={VIEWS} value={view} onChange={setView} />
      </View>

      {view === 'account' ? <AccountView /> : null}
      {view === 'investments' ? <InvestmentsView /> : null}
      {view === 'cards' ? <CardsView /> : null}
      {view === 'assets' ? <AssetsView /> : null}
    </ScrollView>
  );
}

// ---- Conta corrente ----

function AccountView() {
  const { colors } = useTheme();
  const { month, version, refresh } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { accounts, split, movements } = useMemo(
    () => ({
      accounts: db.getAccountsWithBalance(),
      split: db.getSpendingSplit(month),
      movements: db.getTransactions({ month, includeOffBudget: true, limit: 8 }).filter((t) => t.account_id),
    }),
    [version, month]
  );

  const total = accounts.reduce((s, a) => s + a.balance_cents, 0);

  return (
    <>
      <Card style={{ marginTop: 14 }}>
        <Muted>Saldo em conta</Muted>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, marginTop: 2 }}>{formatMoney(total)}</Text>
        <Muted size={12} style={{ marginTop: 4 }}>somando todas as suas contas</Muted>
      </Card>

      <SectionTitle action="+ nova" onAction={() => { setEditing(null); setFormOpen(true); }}>Suas contas</SectionTitle>
      {accounts.length === 0 ? (
        <Card>
          <EmptyState emoji="🏦" title="Nenhuma conta" subtitle="Cadastre sua conta corrente, carteira, poupança." action="Cadastrar conta" onAction={() => { setEditing(null); setFormOpen(true); }} />
        </Card>
      ) : (
        <Card>
          {accounts.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => { setEditing(a); setFormOpen(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <IconBubble emoji={a.emoji} color={a.color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{a.name}</Text>
                  <Muted size={12}>saldo inicial {formatMoney(a.initial_cents)}</Muted>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: a.balance_cents >= 0 ? colors.text : colors.expense }}>
                  {formatMoney(a.balance_cents)}
                </Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {/* Onde os gastos estão indo: conta x cartão */}
      <SectionTitle>Como você paga em {monthLabel(month)}</SectionTitle>
      <Card>
        {split.total_cents === 0 ? (
          <Muted>Sem gastos neste mês ainda.</Muted>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <SplitStat label="Conta corrente" value={split.account_cents} percent={split.account_percent} color={colors.primary} />
              <SplitStat label="Cartão de crédito" value={split.card_cents} percent={split.card_percent} color={colors.invest} />
            </View>
            <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ flex: Math.max(split.account_percent, 0.5), backgroundColor: colors.primary }} />
              <View style={{ flex: Math.max(split.card_percent, 0.5), backgroundColor: colors.invest }} />
            </View>
            <Muted size={12} style={{ marginTop: 10 }}>
              {split.card_percent > split.account_percent
                ? 'Você está concentrando os gastos no cartão de crédito.'
                : 'A maior parte dos seus gastos sai da conta corrente.'}
            </Muted>
          </>
        )}
      </Card>

      {movements.length > 0 ? (
        <>
          <SectionTitle>Movimentações do mês</SectionTitle>
          <Card>
            {movements.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                  <IconBubble emoji={t.kind === 'income' ? '📥' : '📤'} color={t.kind === 'income' ? colors.income : colors.expense} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{t.description || t.category_name || 'Movimentação'}</Text>
                    <Muted size={11}>{formatDate(t.date)} · {t.account_name}</Muted>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.kind === 'income' ? colors.income : colors.text }}>
                    {t.kind === 'income' ? '+' : '-'}{formatMoney(t.amount_cents)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <AccountForm visible={formOpen} account={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} />
    </>
  );
}

function SplitStat({ label, value, percent, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 3 }}>{formatMoney(value)}</Text>
      <Muted size={11}>{percent.toFixed(0)}%</Muted>
    </View>
  );
}

// ---- Investimentos ----

function InvestmentsView() {
  const { colors } = useTheme();
  const { month, version, refresh } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [moving, setMoving] = useState(null);

  const { list, totals, contributions, accounts } = useMemo(
    () => ({ list: db.getInvestments(), totals: db.getInvestmentsTotal(), contributions: db.getContributionsInMonth(month), accounts: db.getAccounts() }),
    [version, month]
  );

  const profit = totals.current - totals.invested;
  const profitPercent = totals.invested > 0 ? (profit / totals.invested) * 100 : 0;
  const donutData = list.map((i) => ({ name: i.name, value: i.current_cents, color: i.color }));

  return (
    <>
      <Card style={{ marginTop: 14 }}>
        <Muted>Carteira hoje</Muted>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.invest, marginTop: 2 }}>{formatMoney(totals.current)}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Stat label="Investido" value={formatMoney(totals.invested)} />
          <Stat label="Lucro" value={`${profit >= 0 ? '+' : '-'}${formatMoney(Math.abs(profit))}`} color={profit >= 0 ? colors.income : colors.expense} />
          <Stat label="Rentab." value={formatPercent(profitPercent, 1)} color={profit >= 0 ? colors.income : colors.expense} />
        </View>
        {contributions > 0 ? <Muted size={12} style={{ marginTop: 10 }}>Aportou {formatMoney(contributions)} em {monthLabel(month, { full: true })}. 👏</Muted> : null}
      </Card>

      {list.length > 0 ? (
        <>
          <SectionTitle>Distribuição</SectionTitle>
          <Card>
            <DonutChart data={donutData} centerLabel="investido" centerValue={formatMoney(totals.current)} />
            <View style={{ height: 14 }} />
            <DonutLegend data={donutData} max={8} />
          </Card>
        </>
      ) : null}

      <SectionTitle action="+ novo" onAction={() => { setEditing(null); setFormOpen(true); }}>Seus investimentos</SectionTitle>
      {list.length === 0 ? (
        <Card>
          <EmptyState emoji="📈" title="Nenhum investimento" subtitle="Cadastre CDB, Tesouro, ações, ETFs e cripto." action="Cadastrar" onAction={() => { setEditing(null); setFormOpen(true); }} />
        </Card>
      ) : (
        list.map((inv) => {
          const type = INVESTMENT_TYPES.find((t) => t.key === inv.type);
          return (
            <Card key={inv.id} style={{ marginBottom: 12 }}>
              <Pressable onPress={() => { setEditing(inv); setFormOpen(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconBubble emoji={type?.emoji ?? '📦'} color={inv.color} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{inv.name}</Text>
                  <Muted size={12}>{type?.label ?? 'Investimento'} · {inv.share_percent.toFixed(0)}% da carteira</Muted>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{formatMoney(inv.current_cents)}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: inv.profit_cents >= 0 ? colors.income : colors.expense }}>
                    {inv.profit_cents >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(inv.profit_percent), 1)}
                  </Text>
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button title="Aportar" variant="soft" style={{ flex: 1 }} onPress={() => setMoving({ inv, kind: 'aporte' })} />
                <Button title="Resgatar" variant="ghost" onPress={() => setMoving({ inv, kind: 'resgate' })} />
              </View>
            </Card>
          );
        })
      )}

      <InvestmentForm visible={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} investment={editing} />
      <AmountSheet
        visible={Boolean(moving)}
        onClose={() => setMoving(null)}
        title={moving?.kind === 'resgate' ? `Resgatar de ${moving?.inv.name}` : `Aportar em ${moving?.inv.name ?? ''}`}
        label="Quanto"
        color={moving?.inv.color}
        confirmLabel={moving?.kind === 'resgate' ? 'Resgatar' : 'Aportar'}
        accounts={accounts}
        onConfirm={(cents, date, accountId) => { db.addInvestmentMove({ investmentId: moving.inv.id, kind: moving.kind, amountCents: cents, date, accountId }); refresh(); }}
      />
    </>
  );
}

// ---- Cartões ----

function CardsView() {
  const { colors } = useTheme();
  const { month, version, refresh } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { cards, split } = useMemo(
    () => ({ cards: db.getCardsWithUsage(month), split: db.getSpendingSplit(month) }),
    [version, month]
  );

  const totalOpen = cards.reduce((s, c) => s + c.open_cents, 0);

  return (
    <>
      <Card style={{ marginTop: 14 }}>
        <Muted>Em aberto nos cartões</Muted>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.invest, marginTop: 2 }}>{formatMoney(totalOpen)}</Text>
        <Muted size={12} style={{ marginTop: 4 }}>somando o que ainda não foi pago</Muted>
      </Card>

      <SectionTitle action="+ novo" onAction={() => { setEditing(null); setFormOpen(true); }}>Seus cartões</SectionTitle>
      {cards.length === 0 ? (
        <Card>
          <EmptyState emoji="💳" title="Nenhum cartão" subtitle="Cadastre seus cartões de crédito, com limite, pra acompanhar o uso." action="Cadastrar cartão" onAction={() => { setEditing(null); setFormOpen(true); }} />
        </Card>
      ) : (
        cards.map((c) => (
          <Card key={c.id} style={{ marginBottom: 12 }} onPress={() => { setEditing(c); setFormOpen(true); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBubble emoji="💳" color={c.color} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{c.name}</Text>
                <Muted size={12}>limite {formatMoney(c.limit_cents)}{c.due_day ? ` · vence dia ${c.due_day}` : ''}</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{formatMoney(c.available_cents)}</Text>
                <Muted size={11}>disponível</Muted>
              </View>
            </View>
            {c.limit_cents > 0 ? (
              <View style={{ marginTop: 12, gap: 6 }}>
                <ProgressBar percent={c.usage_percent} color={c.usage_percent > 80 ? colors.expense : c.color} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Muted size={12}>usado {formatMoney(c.open_cents)}</Muted>
                  <Muted size={12}>{c.usage_percent.toFixed(0)}% do limite</Muted>
                </View>
              </View>
            ) : null}
            {c.used_cents > 0 ? <Muted size={11} style={{ marginTop: 8 }}>{formatMoney(c.used_cents)} gastos neste mês</Muted> : null}
          </Card>
        ))
      )}

      {split.total_cents > 0 ? (
        <Card style={{ marginTop: 4 }}>
          <Muted size={13}>
            Em {monthLabel(month)} você concentrou{' '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>{split.card_percent.toFixed(0)}%</Text> dos gastos no cartão e{' '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>{split.account_percent.toFixed(0)}%</Text> na conta corrente.
          </Muted>
        </Card>
      ) : null}

      <CardForm visible={formOpen} card={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} />
    </>
  );
}

// ---- Bens ----

function AssetsView() {
  const { colors } = useTheme();
  const { version, refresh } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { assets, worth } = useMemo(() => ({ assets: db.getAssets(), worth: db.getNetWorth() }), [version]);

  return (
    <>
      <Card style={{ marginTop: 14 }}>
        <Muted>Patrimônio total</Muted>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 2 }}>{formatMoney(worth.total)}</Text>
        <Muted size={12} style={{ marginTop: 4 }}>saldo + investimentos + bens</Muted>
      </Card>

      <SectionTitle action="+ novo" onAction={() => { setEditing(null); setFormOpen(true); }}>Seus bens</SectionTitle>
      {assets.length === 0 ? (
        <Card>
          <EmptyState emoji="🏠" title="Nenhum bem cadastrado" subtitle="Casa, carro, moto, notebook... com valor de compra e valor atual." action="Cadastrar bem" onAction={() => { setEditing(null); setFormOpen(true); }} />
        </Card>
      ) : (
        assets.map((asset) => {
          const diff = asset.value_cents - (asset.purchase_cents ?? 0);
          const hasPurchase = (asset.purchase_cents ?? 0) > 0;
          return (
            <Card key={asset.id} style={{ marginBottom: 12 }} onPress={() => { setEditing(asset); setFormOpen(true); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconBubble emoji={asset.emoji} color={colors.income} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{asset.name}</Text>
                  {asset.acquired_at ? <Muted size={12}>desde {formatDate(asset.acquired_at)}</Muted> : null}
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{formatMoney(asset.value_cents)}</Text>
              </View>
              {hasPurchase ? (
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <Info label="Compra" value={formatMoney(asset.purchase_cents)} />
                  <Info label="Atual" value={formatMoney(asset.value_cents)} />
                  <Info label={diff >= 0 ? 'Valorizou' : 'Desvalorizou'} value={`${diff >= 0 ? '+' : '-'}${formatMoney(Math.abs(diff))}`} color={diff >= 0 ? colors.income : colors.expense} />
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <AssetForm visible={formOpen} asset={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} />
    </>
  );
}

function Stat({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '800', color: color ?? colors.text, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function Info({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: color ?? colors.text, marginTop: 1 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}
