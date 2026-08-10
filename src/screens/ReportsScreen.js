// Relatórios: as perguntas respondidas com números, o dashboard de hábitos e
// os indicadores do perfil financeiro.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { addMonths, lastMonths, monthLabel, monthShort } from '../utils/date';
import { formatMoney, formatPercent } from '../utils/money';
import { CompareBars, LineChart, MonthBars, Sparkline } from '../components/charts';
import MonthSwitcher from '../components/MonthSwitcher';
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  Header,
  IconBubble,
  Muted,
  ProgressBar,
  SectionTitle,
  Segmented,
  Sheet,
} from '../components/ui';

const VIEWS = [
  { key: 'answers', label: 'Resumo' },
  { key: 'habits', label: 'Hábitos' },
  { key: 'profile', label: 'Perfil' },
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [view, setView] = useState('answers');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Relatórios" subtitle="Seus números, sem achismo" />
      <View style={{ marginTop: 14, gap: 10 }}>
        <Segmented options={VIEWS} value={view} onChange={setView} />
        {view !== 'profile' ? <MonthSwitcher /> : null}
      </View>

      {view === 'answers' ? <AnswersView /> : null}
      {view === 'habits' ? <HabitsView /> : null}
      {view === 'profile' ? <ProfileView /> : null}
    </ScrollView>
  );
}

// ---- Perguntas respondidas ----

function AnswersView() {
  const { colors } = useTheme();
  const { month, version } = useApp();
  const [detail, setDetail] = useState(null);

  const { answers, breakdown, series, summary, previous } = useMemo(
    () => ({
      answers: db.getSmartAnswers(month),
      breakdown: db.getCategoryBreakdown(month, 'expense'),
      series: db.getMonthlySeries(month, 6),
      summary: db.getMonthSummary(month),
      previous: db.getMonthSummary(addMonths(month, -1)),
    }),
    [month, version]
  );

  if (summary.entries === 0) {
    return (
      <Card style={{ marginTop: 16 }}>
        <EmptyState
          emoji="📊"
          title={`Nada lançado em ${monthLabel(month, { full: true })}`}
          subtitle="Os relatórios ficam bons com pelo menos um mês de lançamentos. Registre seus gastos e volte aqui."
        />
      </Card>
    );
  }

  const expenseDelta = summary.expense - previous.expense;
  const incomeDelta = summary.income - previous.income;

  return (
    <>
      <SectionTitle>Perguntas que o app responde</SectionTitle>
      {answers.map((answer) => (
        <Card key={answer.key} style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
            {answer.emoji} {answer.question}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, gap: 10 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.text }}>{answer.answer}</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: answer.positive === false ? colors.expense : answer.positive ? colors.income : colors.text,
              }}
            >
              {formatMoney(answer.value)}
            </Text>
          </View>
          {answer.detail ? (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 5, lineHeight: 17 }}>{answer.detail}</Text>
          ) : null}
        </Card>
      ))}

      <SectionTitle>Comparando com o mês passado</SectionTitle>
      <Card>
        <Comparison
          label="Receitas"
          current={summary.income}
          delta={incomeDelta}
          goodWhenUp
        />
        <Divider style={{ marginVertical: 12 }} />
        <Comparison label="Despesas" current={summary.expense} delta={expenseDelta} />
        <Divider style={{ marginVertical: 12 }} />
        <Comparison label="Guardado" current={summary.saved} delta={summary.saved - previous.saved} goodWhenUp />
      </Card>

      <SectionTitle>Seis meses de histórico</SectionTitle>
      <Card>
        <MonthBars series={series} />
        <Divider style={{ marginVertical: 14 }} />
        {series.map((item) => (
          <View key={item.month} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ width: 60, fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
              {monthLabel(item.month)}
            </Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.income }}>+{formatMoney(item.income)}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.expense }}>-{formatMoney(item.expense)}</Text>
            <Text
              style={{
                width: 92,
                textAlign: 'right',
                fontSize: 13,
                fontWeight: '700',
                color: item.balance >= 0 ? colors.text : colors.expense,
              }}
            >
              {formatMoney(item.balance)}
            </Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Gastos por categoria</SectionTitle>
      <Card>
        {breakdown.length === 0 ? (
          <Muted>Nenhuma despesa neste mês.</Muted>
        ) : (
          breakdown.map((cat, i) => (
            <View key={cat.category_id ?? i}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => setDetail(cat)}
                style={({ pressed }) => [{ paddingVertical: 11 }, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconBubble emoji={cat.emoji} color={cat.color} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{cat.name}</Text>
                    <Muted size={12}>
                      {cat.entries} {cat.entries === 1 ? 'lançamento' : 'lançamentos'} · {cat.percent.toFixed(0)}% do mês
                    </Muted>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                    {formatMoney(cat.total_cents)}
                  </Text>
                </View>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar percent={cat.percent} color={cat.color} height={6} />
                </View>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Sheet visible={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name ?? ''} height="72%">
        {detail ? <CategoryDetail category={detail} month={month} /> : null}
      </Sheet>
    </>
  );
}

function CategoryDetail({ category, month }) {
  const { colors } = useTheme();
  const subs = useMemo(() => db.getSubcategoryBreakdown(month, category.category_id), [category, month]);
  const series = useMemo(() => db.getCategorySeries(category.category_id, month, 6), [category, month]);
  const average = Math.round(series.reduce((s, r) => s + r.total, 0) / series.length);

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <Muted>Gasto em {monthLabel(month, { full: true })}</Muted>
        <Text style={{ fontSize: 26, fontWeight: '800', color: category.color, marginTop: 2 }}>
          {formatMoney(category.total_cents)}
        </Text>
        <Muted size={12} style={{ marginTop: 4 }}>
          média dos últimos 6 meses: {formatMoney(average)}
        </Muted>
      </Card>

      <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 10 }}>Evolução</Text>
      <Card style={{ marginBottom: 14 }}>
        <CompareBars
          rows={series.map((s) => ({ label: monthLabel(s.month), value: s.total, highlight: s.month === month }))}
          color={category.color}
        />
      </Card>

      <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 10 }}>Por subcategoria</Text>
      <Card>
        {subs.length === 0 ? (
          <Muted>Sem lançamentos neste mês.</Muted>
        ) : (
          subs.map((sub, i) => (
            <View key={i} style={{ flexDirection: 'row', paddingVertical: 8 }}>
              <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{sub.name}</Text>
              <Muted size={12} style={{ marginRight: 10 }}>
                {sub.entries}x
              </Muted>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                {formatMoney(sub.total_cents)}
              </Text>
            </View>
          ))
        )}
      </Card>
    </>
  );
}

function Comparison({ label, current, delta, goodWhenUp = false }) {
  const { colors } = useTheme();
  const up = delta > 0;
  const good = goodWhenUp ? up : !up;
  const neutral = delta === 0;
  const color = neutral ? colors.textMuted : good ? colors.income : colors.expense;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Muted size={12}>{formatMoney(current)} neste mês</Muted>
      </View>
      <Badge
        label={neutral ? 'sem mudança' : `${up ? '▲' : '▼'} ${formatMoney(Math.abs(delta))}`}
        color={color}
      />
    </View>
  );
}

// ---- Dashboard de hábitos ----

function HabitsView() {
  const { colors } = useTheme();
  const { month, version } = useApp();
  const [expanded, setExpanded] = useState(null);

  const months = lastMonths(month, 6);
  const rows = useMemo(() => {
    const categories = db.getCategoryTree('expense');
    return categories
      .map((cat) => {
        const series = db.getCategorySeries(cat.id, month, 6);
        const current = series[series.length - 1].total;
        const previous = series[series.length - 2]?.total ?? 0;
        const total = series.reduce((s, r) => s + r.total, 0);
        return { cat, series, current, previous, total, average: Math.round(total / series.length) };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.current - a.current || b.total - a.total);
  }, [month, version]);

  if (rows.length === 0) {
    return (
      <Card style={{ marginTop: 16 }}>
        <EmptyState
          emoji="🔍"
          title="Sem hábitos pra mostrar ainda"
          subtitle="Depois de alguns meses de lançamentos dá pra ver com clareza pra onde seu dinheiro costuma ir."
        />
      </Card>
    );
  }

  return (
    <>
      <Card style={{ marginTop: 14 }}>
        <Muted>
          Quanto você gasta em cada área, mês a mês. Toque numa categoria pra ver a comparação completa
          dos últimos {months.length} meses.
        </Muted>
      </Card>

      <SectionTitle>Seus hábitos de gasto</SectionTitle>
      <Card>
        {rows.map((row, i) => {
          const delta = row.current - row.previous;
          const isOpen = expanded === row.cat.id;
          return (
            <View key={row.cat.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => setExpanded(isOpen ? null : row.cat.id)}
                style={({ pressed }) => [{ paddingVertical: 12 }, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconBubble emoji={row.cat.emoji} color={row.cat.color} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{row.cat.name}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        marginTop: 2,
                        color: delta === 0 ? colors.textMuted : delta > 0 ? colors.expense : colors.income,
                      }}
                    >
                      {delta === 0
                        ? `média de ${formatMoney(row.average)}`
                        : `${delta > 0 ? '▲' : '▼'} ${formatMoney(Math.abs(delta))} vs. mês passado`}
                    </Text>
                  </View>
                  <Sparkline values={row.series.map((s) => s.total)} color={row.cat.color} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, width: 92, textAlign: 'right' }}>
                    {formatMoney(row.current)}
                  </Text>
                </View>

                {isOpen ? (
                  <View style={{ marginTop: 14 }}>
                    <CompareBars
                      rows={row.series.map((s) => ({
                        label: monthLabel(s.month),
                        value: s.total,
                        highlight: s.month === month,
                      }))}
                      color={row.cat.color}
                    />
                    <Muted size={12} style={{ marginTop: 10 }}>
                      Total no período: {formatMoney(row.total)} · média mensal de {formatMoney(row.average)}
                    </Muted>
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </Card>
    </>
  );
}

// ---- Perfil financeiro ----

function ProfileView() {
  const { colors } = useTheme();
  const { month, version } = useApp();

  const { profile, worthSeries } = useMemo(
    () => ({ profile: db.getFinancialProfile(month, 6), worthSeries: db.getNetWorthSeries(month, 6) }),
    [month, version]
  );

  const { worth } = profile;
  const emergencyPercent = Math.min((profile.emergencyMonths / 6) * 100, 100);

  return (
    <>
      <Card style={{ marginTop: 14 }}>
        <Muted>Patrimônio total</Muted>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 2 }}>
          {formatMoney(worth.total)}
        </Text>
        <View style={{ marginTop: 14 }}>
          <LineChart series={worthSeries} height={150} />
        </View>
      </Card>

      <SectionTitle>Reserva de emergência</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
              {profile.emergencyMonths.toFixed(1)} meses
            </Text>
            <Muted size={12}>de despesa média cobertos pelo seu dinheiro líquido</Muted>
          </View>
          <Badge
            label={profile.emergencyMonths >= 6 ? 'blindado 🛡️' : profile.emergencyMonths >= 3 ? 'no caminho' : 'começando'}
            color={profile.emergencyMonths >= 6 ? colors.income : profile.emergencyMonths >= 3 ? colors.warning : colors.expense}
          />
        </View>
        <ProgressBar
          percent={emergencyPercent}
          color={profile.emergencyMonths >= 6 ? colors.income : colors.warning}
          height={10}
        />
        <Muted size={12} style={{ marginTop: 8 }}>
          A referência clássica é ter de 3 a 6 meses de despesas guardados.
        </Muted>
      </Card>

      <SectionTitle>Seus indicadores</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Indicator label="Receita média" value={formatMoney(profile.avgIncome)} emoji="📥" color={colors.income} />
        <Indicator label="Despesa média" value={formatMoney(profile.avgExpense)} emoji="📤" color={colors.expense} />
        <Indicator
          label="Fluxo de caixa"
          value={formatMoney(profile.cashFlow)}
          emoji="🌊"
          color={profile.cashFlow >= 0 ? colors.income : colors.expense}
        />
        <Indicator label="Guardado por mês" value={formatMoney(profile.avgSaved)} emoji="🐷" color={colors.primary} />
        <Indicator
          label="Taxa de poupança"
          value={formatPercent(profile.savingRate)}
          emoji="📊"
          color={profile.savingRate >= 20 ? colors.income : profile.savingRate >= 0 ? colors.warning : colors.expense}
        />
        <Indicator label="% investido" value={formatPercent(profile.investedRate)} emoji="📈" color={colors.invest} />
      </View>

      <SectionTitle>Composição do patrimônio</SectionTitle>
      <Card>
        <Composition label="Saldo em conta" value={worth.available} total={worth.total} color={colors.primary} />
        <Composition label="Guardado em metas" value={worth.goals} total={worth.total} color={colors.warning} />
        <Composition label="Investimentos" value={worth.investments} total={worth.total} color={colors.invest} />
        <Composition label="Bens" value={worth.assets} total={worth.total} color={colors.income} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Muted size={12}>
          Números calculados com {profile.monthsAnalyzed}{' '}
          {profile.monthsAnalyzed === 1 ? 'mês' : 'meses'} de lançamentos até {monthShort(month)}.
        </Muted>
      </Card>
    </>
  );
}

function Indicator({ label, value, emoji, color }) {
  const { colors } = useTheme();
  return (
    <Card style={{ width: '47.5%', flexGrow: 1 }}>
      <Text style={{ fontSize: 15 }}>{emoji}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color, marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

function Composition({ label, value, total, color }) {
  const { colors } = useTheme();
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' }}>{label}</Text>
        <Muted size={12} style={{ marginRight: 8 }}>
          {percent.toFixed(0)}%
        </Muted>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{formatMoney(value)}</Text>
      </View>
      <ProgressBar percent={percent} color={color} height={7} />
    </View>
  );
}
