// Aba "Perfil" de Relatórios: patrimônio, próximo passo financeiro, reserva
// de emergência, indicadores e composição do patrimônio.

import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../app-context';
import * as db from '../../db';
import { useTheme } from '../../theme-context';
import { monthShort } from '../../utils/date';
import { formatMoney, formatPercent } from '../../utils/money';
import { LineChart } from '../../components/charts';
import { Badge, Card, Muted, ProgressBar, SectionTitle } from '../../components/ui';

export default function ProfileView() {
  const { colors } = useTheme();
  const { month, version } = useApp();

  const { profile, worthSeries, fixedWeight, debt, stage } = useMemo(() => {
    const p = db.getFinancialProfile(month, 6);
    const cards = db.getCardsWithUsage(month);
    const hasExpensiveDebt = cards.some((c) => c.usage_percent > 80);
    return {
      profile: p,
      worthSeries: db.getNetWorthSeries(month, 6),
      fixedWeight: db.getSubscriptionsWeight(month),
      debt: db.getDebtCommitment(month),
      stage: db.getFinancialStage({
        cashFlow: p.cashFlow,
        emergencyMonths: p.emergencyMonths,
        investedRate: p.investedRate,
        hasExpensiveDebt,
      }),
    };
  }, [month, version]);

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

      <SectionTitle>Seu próximo passo</SectionTitle>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 26 }}>{stage.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{stage.title}</Text>
          <Muted size={12} style={{ marginTop: 2 }}>
            {stage.text}
          </Muted>
        </View>
      </Card>

      <SectionTitle>Reserva de emergência</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
              {profile.emergencyMonths.toFixed(1)} meses
            </Text>
            <Muted size={12}>de despesa essencial cobertos pelo seu dinheiro de liquidez imediata</Muted>
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
        <Indicator
          label="Custo fixo / renda"
          value={formatPercent(fixedWeight.percent)}
          emoji="🧾"
          color={fixedWeight.percent <= 50 ? colors.income : colors.expense}
        />
        <Indicator
          label="Dívida / renda"
          value={formatPercent(debt.percent)}
          emoji="💳"
          color={debt.percent <= 30 ? colors.income : colors.expense}
        />
      </View>

      <SectionTitle>Composição do patrimônio</SectionTitle>
      <Card>
        <Composition label="Saldo em conta" value={worth.available} total={worth.gross} color={colors.primary} />
        <Composition label="Guardado em metas" value={worth.goals} total={worth.gross} color={colors.warning} />
        <Composition label="Investimentos" value={worth.investments} total={worth.gross} color={colors.invest} />
        <Composition label="Bens" value={worth.assets} total={worth.gross} color={colors.income} />
        {worth.liabilities > 0 ? (
          <Composition label="Fatura e parcelas em aberto" value={-worth.liabilities} total={worth.gross} color={colors.expense} />
        ) : null}
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
  const percent = total > 0 ? (Math.abs(value) / total) * 100 : 0;
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
