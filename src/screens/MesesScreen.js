// Aba "Meses": o controle central dos meses. Linha do tempo com todos os meses;
// abrir (informando o salário daquele mês), fechar e editar o salário — tudo à
// mão, sem ficar escondido em outra tela.

import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { monthLabel } from '../utils/date';
import { formatMoney } from '../utils/money';
import MonthSwitcher from '../components/MonthSwitcher';
import SalarySheet from '../components/SalarySheet';
import { Badge, Button, Card, EmptyState, Header, Muted, SectionTitle } from '../components/ui';

export default function MesesScreen() {
  const { colors } = useTheme();
  const { version, refresh, setMonth, navigate } = useApp();
  const { width } = useWindowDimensions();
  const [tick, setTick] = useState(0);
  const [opening, setOpening] = useState(null);
  const [editingSalary, setEditingSalary] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const cardWidth = width - 40; // 20 de padding de cada lado da tela

  const { timeline, salary } = useMemo(
    () => ({ timeline: db.getMonthsTimeline({ before: showPast ? 6 : 0, after: 9 }), salary: db.getSalary() }),
    [version, tick, showPast]
  );

  const reload = () => { setTick((t) => t + 1); refresh(); };

  function confirmClose(month) {
    const warn = db.monthHasKeptData(month);
    Alert.alert(
      `Fechar ${monthLabel(month)}?`,
      warn
        ? 'As contas fixas e o salário ainda não pagos serão removidos. O que já foi pago e os lançamentos manuais continuam salvos.'
        : 'O mês volta a aparecer só como previsão.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fechar mês', style: 'destructive', onPress: () => { db.closeMonth(month); reload(); } },
      ]
    );
  }

  function goToMonth(month) {
    setMonth(month);
    navigate('home');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Meses" subtitle="Abrir, fechar e o salário de cada mês" />

      <Card style={{ marginTop: 14 }}>
        <Muted size={13}>
          Cada mês só entra "pra valer" quando você o abre — aí as contas fixas e o salário são lançados
          nele. Ao abrir, você confirma quanto recebeu naquele mês.
        </Muted>
      </Card>

      <SectionTitle
        action={showPast ? 'ocultar anteriores' : 'ver anteriores'}
        onAction={() => {
          const next = !showPast;
          setShowPast(next);
          // Ao mostrar meses anteriores, o mês atual deixa de ser o primeiro
          // card (getMonthsTimeline põe 6 meses antes dele) — pula direto pra
          // ele em vez de deixar o carrossel exibindo o passado.
          const targetIndex = next ? 6 : 0;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: targetIndex * (cardWidth + 12), animated: false });
            setActiveIndex(targetIndex);
          });
        }}
      >
        Linha do tempo
      </SectionTitle>
      <Muted size={12} style={{ marginBottom: 10 }}>
        Deslize pro lado pra ver os outros meses.
      </Muted>

      <FlatList
        ref={listRef}
        data={timeline}
        keyExtractor={(m) => m.month}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12 }}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12)));
        }}
        renderItem={({ item: m }) => (
          <Card style={{ width: cardWidth }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{monthLabel(m.month, { full: true })}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {m.isCurrent ? <Badge label="mês atual" color={colors.primary} /> : null}
                  <Badge label={m.open ? 'aberto' : 'previsto'} color={m.open ? colors.income : colors.textMuted} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.open ? 'resultado' : 'previsto'}</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: m.leftover >= 0 ? colors.income : colors.expense }}>{formatMoney(m.leftover)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Mini label="Salário" value={m.salary_cents} color={colors.income} />
              <Mini label="Contas fixas" value={m.bills_cents} color={colors.expense} />
              {m.installments_cents > 0 ? <Mini label="Parcelas" value={m.installments_cents} color={colors.textMuted} /> : null}
            </View>

            {m.open ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button title="Ir pro mês" variant="soft" style={{ flex: 1 }} onPress={() => goToMonth(m.month)} />
                <Button title="Salário" variant="ghost" onPress={() => setEditingSalary({ month: m.month, cents: m.salary_cents })} />
                <Button title="Fechar" variant="ghost" onPress={() => confirmClose(m.month)} />
              </View>
            ) : (
              <Button title={`Abrir ${monthLabel(m.month)}`} icon="🔓" variant="soft" onPress={() => setOpening({ month: m.month, cents: salary.cents })} style={{ marginTop: 14 }} />
            )}
          </Card>
        )}
      />

      {/* Bolinhas indicando a posição no carrossel */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {timeline.map((m, i) => (
          <View
            key={m.month}
            style={{
              width: i === activeIndex ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIndex ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>

      {/* Abrir mês informando o salário */}
      <SalarySheet
        title={opening ? `Abrir ${monthLabel(opening.month)}` : ''}
        subtitle="Quanto você recebeu de salário neste mês?"
        visible={Boolean(opening)}
        initial={opening?.cents ?? 0}
        confirmLabel="Abrir mês"
        onClose={() => setOpening(null)}
        onConfirm={(cents) => {
          db.openMonth(opening.month);
          db.setMonthSalary(opening.month, cents);
          reload();
        }}
      />

      {/* Editar salário de um mês aberto */}
      <SalarySheet
        title={editingSalary ? `Salário de ${monthLabel(editingSalary.month)}` : ''}
        subtitle="Vale só para este mês."
        visible={Boolean(editingSalary)}
        initial={editingSalary?.cents ?? 0}
        confirmLabel="Salvar"
        onClose={() => setEditingSalary(null)}
        onConfirm={(cents) => { db.setMonthSalary(editingSalary.month, cents); reload(); }}
      />
    </ScrollView>
  );
}

function Mini({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color ?? colors.text, marginTop: 1 }} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(value)}</Text>
    </View>
  );
}
