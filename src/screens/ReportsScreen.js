// Relatórios: as perguntas respondidas com números, o dashboard de hábitos e
// os indicadores do perfil financeiro. As três abas vivem em src/screens/reports/.

import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { Card, Header, Segmented } from '../components/ui';
import MonthSwitcher from '../components/MonthSwitcher';
import AnswersView from './reports/AnswersView';
import HabitsView from './reports/HabitsView';
import ProfileView from './reports/ProfileView';
import { fontForWeight } from '../theme';

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
      <Header title="Insights" subtitle="Seus números, sem achismo" />
      <InsightsSection />
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

// ---- Insights (topo da tela) ----

const INSIGHT_COLOR = { alerta: 'expense', positivo: 'income', neutro: 'textMuted' };

function InsightsSection() {
  const { colors } = useTheme();
  const { month, version } = useApp();
  const insights = useMemo(() => db.buildInsights(month), [month, version]);

  if (insights.length === 0) return null;

  return (
    <View style={{ marginTop: 16, gap: 10 }}>
      {insights.map((item) => (
        <Card key={item.id} style={{ borderLeftWidth: 3, borderLeftColor: colors[INSIGHT_COLOR[item.type]] }}>
          <Text style={{ fontSize: 13, fontFamily: fontForWeight('700'), color: colors.text }}>
            {item.emoji} {item.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 }}>{item.text}</Text>
        </Card>
      ))}
    </View>
  );
}
