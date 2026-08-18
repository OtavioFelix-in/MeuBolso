// Aba "Hábitos" de Relatórios: quanto se gasta em cada categoria, mês a mês,
// com comparação dos últimos 6 meses ao expandir uma categoria.

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../../app-context';
import * as db from '../../db';
import { useTheme } from '../../theme-context';
import { lastMonths, monthLabel } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { CompareBars, Sparkline } from '../../components/charts';
import { Card, Divider, EmptyState, IconBubble, Muted, SectionTitle } from '../../components/ui';
import { fontForWeight } from '../../theme';

export default function HabitsView() {
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
                    <Text style={{ fontSize: 15, fontFamily: fontForWeight('600'), color: colors.text }}>{row.cat.name}</Text>
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
                  <Text style={{ fontSize: 15, fontFamily: fontForWeight('700'), color: colors.text, width: 92, textAlign: 'right' }}>
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
