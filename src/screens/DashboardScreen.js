// Início: o "centro de comando". Resumo do mês, receitas (com o salário fixo),
// atalhos pras áreas e os gráficos principais. Cada função de verdade mora na
// sua própria tela — aqui é só a visão geral e a porta de entrada.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { BRAND_GRADIENT, BRAND_GRADIENT_ANGLE, FONT_FAMILY, RADIUS, fontForWeight } from '../theme';
import { useTheme } from '../theme-context';
import { dueLabel, monthLabel, today } from '../utils/date';
import { formatMoney } from '../utils/money';
import { DonutChart, DonutLegend, LineChart, MonthBars } from '../components/charts';
import MonthSwitcher from '../components/MonthSwitcher';
import SalarySheet from '../components/SalarySheet';
import TipCard from '../components/TipCard';
import TransactionRow from '../components/TransactionRow';
import { Avatar, Badge, Button, Card, Divider, EmptyState, Header, IconBubble, Money, Muted, ProgressBar, RoundButton, SectionTitle } from '../components/ui';
import { ProfileSheet } from '../components/SettingsSheets';

export default function DashboardScreen({ onOpenSettings }) {
  const { colors } = useTheme();
  const { month, version, refresh, openTransaction, navigate, hidden, toggleHidden } = useApp();
  const [data, setData] = useState(null);
  const [openingSalary, setOpeningSalary] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userName = db.getFirstName();

  // Saudação personalizada com o nome do onboarding ("Boa tarde, João").
  const greeting = useMemo(() => {
    const name = db.getFirstName();
    const h = new Date().getHours();
    const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    return name ? `${period}, ${name}` : 'Meu Bolso';
  }, [version]);

  useEffect(() => {
    setData({
      open: db.isMonthOpen(month),
      projection: db.getMonthProjection(month),
      summary: db.getMonthSummary(month),
      worth: db.getNetWorth(),
      breakdown: db.getCategoryBreakdown(month, 'expense'),
      series: db.getMonthlySeries(month, 6),
      worthSeries: db.getNetWorthSeries(month, 6),
      upcoming: db.getUpcoming(`${month}-31`).slice(0, 4),
      incomes: db.getTransactions({ month, kind: 'income' }),
      investments: db.getInvestmentsTotal(),
    });
  }, [month, version]);

  function handleOpenMonth() {
    setOpeningSalary(true);
  }

  function handleCloseMonth() {
    const warn = db.monthHasKeptData(month);
    Alert.alert(
      `Fechar ${monthLabel(month)}?`,
      warn
        ? 'As contas fixas e o salário ainda não pagos serão removidos deste mês. O que você já pagou e os lançamentos manuais continuam salvos.'
        : 'O mês volta a aparecer só como previsão.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fechar mês', style: 'destructive', onPress: () => { db.closeMonth(month); refresh(); } },
      ]
    );
  }

  const mask = useMemo(() => (text) => (hidden ? '••••••' : text), [hidden]);

  if (!data) return null;

  const { open, projection, summary, worth, breakdown, series, worthSeries, upcoming, incomes, investments } = data;
  const donutData = breakdown.map((c) => ({ name: c.name, value: c.total_cents, color: c.color, emoji: c.emoji }));

  const headerRight = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <RoundButton icon={hidden ? 'eye-off' : 'eye'} onPress={toggleHidden} />
      <RoundButton icon="settings" onPress={onOpenSettings} />
    </View>
  );

  // Mês ainda não aberto: mostra só a PREVISÃO e o botão de abrir.
  if (!open) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Meu Bolso"
          subtitle={`Previsão de ${monthLabel(month, { full: true })}`}
          left={<Avatar name={userName} onPress={() => setProfileOpen(true)} />}
          right={headerRight}
        />
        <View style={{ marginTop: 14 }}>
          <MonthSwitcher />
        </View>

        <Card style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={{ fontSize: 18, fontFamily: fontForWeight('800'), color: colors.text, marginTop: 8, textAlign: 'center' }}>
            {monthLabel(month, { full: true })} ainda não foi aberto
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
            Abra o mês pra lançar as contas fixas e o salário nele. Enquanto isso, aqui está a previsão:
          </Text>

          <View style={{ alignSelf: 'stretch', marginTop: 16, gap: 8 }}>
            <ProjRow label="💼 Salário / receitas fixas" value={mask(formatMoney(projection.salary_cents))} color={colors.income} />
            <ProjRow label="🧾 Contas fixas previstas" value={`- ${mask(formatMoney(projection.bills_cents))}`} color={colors.expense} />
            {projection.installments_cents > 0 ? (
              <ProjRow label="💳 Parcelas do mês" value={`- ${mask(formatMoney(projection.installments_cents))}`} color={colors.expense} />
            ) : null}
            <Divider style={{ marginVertical: 4 }} />
            <ProjRow
              label="Resultado previsto"
              value={mask(formatMoney(projection.leftover))}
              color={projection.leftover >= 0 ? colors.income : colors.expense}
              strong
            />
          </View>

          <Button title={`Abrir ${monthLabel(month)}`} icon="🔓" onPress={handleOpenMonth} style={{ alignSelf: 'stretch', marginTop: 18 }} />
          <Button title="Ver todos os meses" variant="ghost" onPress={() => navigate('meses')} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </Card>

        <SalarySheet
          visible={openingSalary}
          title={`Abrir ${monthLabel(month)}`}
          subtitle="Quanto você recebeu de salário neste mês? Dá pra ajustar depois na aba Meses."
          initial={db.getSalary().cents}
          confirmLabel="Abrir mês"
          onClose={() => setOpeningSalary(false)}
          onConfirm={(cents) => { db.openMonth(month); db.setMonthSalary(month, cents); refresh(); }}
        />

        <ProfileSheet
          visible={profileOpen}
          initial={db.getUserName()}
          onClose={() => setProfileOpen(false)}
          onSaved={refresh}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title={greeting}
        subtitle={`Resumo de ${monthLabel(month, { full: true })}`}
        left={<Avatar name={userName} onPress={() => setProfileOpen(true)} />}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundButton icon={hidden ? 'eye-off' : 'eye'} onPress={toggleHidden} />
            <RoundButton icon="settings" onPress={onOpenSettings} />
          </View>
        }
      />

      <ProfileSheet
        visible={profileOpen}
        initial={db.getUserName()}
        onClose={() => setProfileOpen(false)}
        onSaved={refresh}
      />

      <View style={{ marginTop: 14 }}>
        <MonthSwitcher />
      </View>

      <TipCard
        tipKey="home"
        emoji="👋"
        title="Bem-vindo ao seu painel"
        text="Toque no botão + pra registrar um gasto ou receita. Este cartão verde mostra quanto sobrou (ou faltou) no mês."
        style={{ marginTop: 12 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.income }} />
          <Muted size={12}>mês aberto</Muted>
        </View>
        <Pressable onPress={handleCloseMonth} hitSlop={8}>
          <Text style={{ fontSize: 12, fontFamily: fontForWeight('700'), color: colors.textMuted }}>🔒 fechar mês</Text>
        </Pressable>
      </View>

      {/* Resultado do mês selecionado (muda conforme você navega entre os meses).
          Gradiente de marca — o único lugar que usa ele com essa força, de propósito. */}
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={BRAND_GRADIENT_ANGLE.start}
        end={BRAND_GRADIENT_ANGLE.end}
        style={{ marginTop: 14, borderRadius: RADIUS.lg, padding: 16 }}
      >
        <Text style={{ color: '#fff', opacity: 0.85, fontSize: 13, fontFamily: FONT_FAMILY.semibold }}>
          {summary.leftover >= 0 ? 'Sobrou em' : 'Faltou em'} {monthLabel(month)}
        </Text>
        <Text style={{ color: '#fff', fontSize: 34, fontFamily: FONT_FAMILY.monoBold, marginTop: 4 }}>
          {mask(formatMoney(summary.leftover))}
        </Text>
        <Text style={{ color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 6, lineHeight: 17, fontFamily: FONT_FAMILY.regular }}>
          Só deste mês — receitas menos despesas e o que você guardou.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <HeroStat label="Entrou no mês" value={mask(formatMoney(summary.income))} />
          <HeroStat label="Saiu no mês" value={mask(formatMoney(summary.expense))} />
          <HeroStat label="Guardei" value={mask(formatMoney(summary.saved))} />
        </View>

        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
          <Text style={{ color: '#fff', opacity: 0.85, fontSize: 12, fontFamily: FONT_FAMILY.regular }}>
            💰 Saldo total acumulado (todos os meses):{' '}
            <Text style={{ fontFamily: FONT_FAMILY.bold }}>{mask(formatMoney(worth.available))}</Text>
          </Text>
        </View>
      </LinearGradient>

      {/* Agenda: único atalho que fica aqui, porque não tem outro caminho até ela
          (Contas fixas e Parcelas já ficam em Despesas › Fixas; Carteira e Meses
          já são abas da barra inferior — repetir aqui só duplicava). */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        <ShortcutCard emoji="📅" label="Agenda" hint="eventos planejados" onPress={() => navigate('agenda')} tint={colors.income} />
      </View>

      {/* Receitas do mês */}
      <SectionTitle action="+ receita" onAction={() => openTransaction(null, 'income')}>
        Receitas do mês
      </SectionTitle>
      <Card>
        {incomes.length === 0 ? (
          <EmptyState
            emoji="📥"
            title="Nenhuma receita neste mês"
            subtitle="Configure seu salário na Carteira pra ele entrar automático, ou toque em + receita."
            action="Ir pra Carteira"
            onAction={() => navigate('wallet')}
          />
        ) : (
          incomes.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 ? <Divider /> : null}
              <TransactionRow
                tx={tx}
                onPress={() => openTransaction(tx)}
                onTogglePaid={() => {
                  db.setTransactionPaid(tx.id, true);
                  refresh();
                }}
              />
            </View>
          ))
        )}
      </Card>

      {/* Próximos vencimentos */}
      {upcoming.length > 0 ? (
        <>
          <SectionTitle action="contas fixas" onAction={() => navigate('bills')}>
            Próximos vencimentos
          </SectionTitle>
          <Card>
            {upcoming.map((tx, i) => {
              const late = tx.date < today();
              return (
                <View key={tx.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => openTransaction(tx)}
                    style={({ pressed }) => [
                      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <IconBubble emoji={tx.category_emoji ?? '🔔'} color={late ? colors.expense : colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: fontForWeight('600'), color: colors.text }}>
                        {tx.description || tx.category_name || 'Lançamento'}
                      </Text>
                      <Text style={{ fontSize: 12, color: late ? colors.expense : colors.textMuted, marginTop: 2 }}>
                        {dueLabel(tx.date)}
                      </Text>
                    </View>
                    <Money cents={tx.amount_cents} kind={tx.kind === 'income' ? 'income' : null} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {/* Para onde o dinheiro foi */}
      <SectionTitle action={breakdown.length ? 'despesas' : undefined} onAction={() => navigate('expenses')}>
        Para onde o dinheiro foi
      </SectionTitle>
      <Card>
        {breakdown.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="Nenhuma despesa neste mês"
            subtitle="Toque no + para registrar o primeiro gasto."
            action="Lançar despesa"
            onAction={() => openTransaction(null, 'expense')}
          />
        ) : (
          <>
            <DonutChart data={donutData} centerLabel="total de gastos" centerValue={mask(formatMoney(summary.expense))} />
            <View style={{ height: 14 }} />
            <DonutLegend data={donutData} onPress={() => navigate('expenses')} />
          </>
        )}
      </Card>

      {/* Receitas x despesas */}
      <SectionTitle>Receitas x despesas</SectionTitle>
      <Card>
        <MonthBars series={series} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'center' }}>
          <LegendDot color={colors.income} label="receitas" />
          <LegendDot color={colors.expense} label="despesas" />
        </View>
      </Card>

      {/* Evolução do patrimônio */}
      <SectionTitle action="carteira" onAction={() => navigate('wallet')}>
        Evolução do patrimônio
      </SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Muted>hoje</Muted>
            <Text style={{ fontSize: 22, fontFamily: fontForWeight('800'), color: colors.text }}>{mask(formatMoney(worth.total))}</Text>
          </View>
          {worthSeries.length > 1 ? <Trend series={worthSeries} /> : null}
        </View>
        <LineChart series={worthSeries} />
      </Card>
    </ScrollView>
  );
}

function ProjRow({ label, value, color, strong }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: strong ? 15 : 13, color: colors.text, fontFamily: fontForWeight(strong ? '800' : '500') }}>{label}</Text>
      <Text style={{ fontSize: strong ? 17 : 14, fontFamily: fontForWeight('800'), color: color ?? colors.text }}>{value}</Text>
    </View>
  );
}

function HeroStat({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: RADIUS.md, padding: 10 }}>
      <Text style={{ color: '#fff', opacity: 0.85, fontSize: 11, fontFamily: FONT_FAMILY.semibold }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONT_FAMILY.monoBold, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function ShortcutCard({ emoji, label, hint, onPress, tint }) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBubble emoji={emoji} color={tint ?? colors.primary} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: fontForWeight('700'), color: colors.text }}>{label}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
            {hint}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function LegendDot({ color, label }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

function Trend({ series }) {
  const { colors } = useTheme();
  const first = series[0].total;
  const last = series[series.length - 1].total;
  const delta = last - first;
  const percent = first !== 0 ? (delta / Math.abs(first)) * 100 : 0;
  const up = delta >= 0;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ color: up ? colors.income : colors.expense, fontFamily: fontForWeight('800'), fontSize: 15 }}>
        {up ? '▲' : '▼'} {Math.abs(percent).toFixed(0)}%
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>em {series.length} meses</Text>
    </View>
  );
}
