// Aba "Resumo" de Relatórios: perguntas respondidas com números, comparativo
// com o mês passado, histórico de 6 meses e gastos por categoria (com detalhe).

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../../app-context';
import * as db from '../../db';
import { useTheme } from '../../theme-context';
import { addMonths, monthLabel } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { CompareBars, MonthBars } from '../../components/charts';
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  IconBubble,
  Muted,
  ProgressBar,
  SectionTitle,
  Sheet,
} from '../../components/ui';

export default function AnswersView() {
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
