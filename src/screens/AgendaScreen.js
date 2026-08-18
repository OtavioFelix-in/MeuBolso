// Agenda financeira: só eventos futuros (viagem, aniversário, Natal, festa...).
// Cada evento tem um valor planejado; ao finalizar, você informa o gasto real e
// o app mostra se gastou menos, igual ou acima do planejado.
// Contas fixas e parcelas NÃO ficam aqui — cada uma tem sua própria tela.

import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { formatDate, fromIsoDate, today } from '../utils/date';
import { formatMoney } from '../utils/money';
import EventForm from '../components/EventForm';
import { MoneyField } from '../components/fields';
import { Badge, Button, Card, Divider, EmptyState, Header, IconBubble, Muted, ProgressBar, SectionTitle, Sheet } from '../components/ui';
import { fontForWeight } from '../theme';

const OUTCOME = {
  under: { label: 'Gastou menos que o planejado 🎉', color: 'income' },
  exact: { label: 'Gastou exatamente o planejado 🎯', color: 'primary' },
  over: { label: 'Gastou acima do planejado 😬', color: 'expense' },
  neutral: { label: 'Evento finalizado', color: 'textMuted' },
};

export default function AgendaScreen() {
  const { colors } = useTheme();
  const { version, refresh, back } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [finishing, setFinishing] = useState(null);

  const events = useMemo(() => db.getEvents(), [version]);
  const upcoming = events.filter((e) => !e.done);
  const done = events.filter((e) => e.done);
  const plannedTotal = upcoming.reduce((s, e) => s + e.planned_cents, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Agenda" subtitle="Eventos e gastos planejados" onBack={back} />

      <Card style={{ marginTop: 14 }}>
        <Muted>Planejado nos próximos eventos</Muted>
        <Text style={{ fontSize: 26, fontFamily: fontForWeight('800'), color: colors.text, marginTop: 2 }}>{formatMoney(plannedTotal)}</Text>
        <Muted size={12}>{upcoming.length} {upcoming.length === 1 ? 'evento à frente' : 'eventos à frente'}</Muted>
      </Card>

      <SectionTitle action="+ novo" onAction={() => { setEditing(null); setFormOpen(true); }}>
        Próximos eventos
      </SectionTitle>

      {upcoming.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📅"
            title="Nenhum evento planejado"
            subtitle="Viagem, aniversário, Natal, festa... registre e defina quanto pretende gastar."
            action="Criar evento"
            onAction={() => { setEditing(null); setFormOpen(true); }}
          />
        </Card>
      ) : (
        upcoming.map((ev) => (
          <EventCard key={ev.id} ev={ev} onEdit={() => { setEditing(ev); setFormOpen(true); }} onFinish={() => setFinishing(ev)} />
        ))
      )}

      {done.length > 0 ? (
        <>
          <SectionTitle>Finalizados</SectionTitle>
          {done.map((ev) => (
            <EventCard key={ev.id} ev={ev} onEdit={() => { setEditing(ev); setFormOpen(true); }} onFinish={() => setFinishing(ev)} />
          ))}
        </>
      ) : null}

      <EventForm visible={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} event={editing} />
      <FinishSheet event={finishing} onClose={() => setFinishing(null)} onSaved={refresh} />
    </ScrollView>
  );
}

function EventCard({ ev, onEdit, onFinish }) {
  const { colors } = useTheme();
  const daysAway = Math.round((fromIsoDate(ev.date) - fromIsoDate(today())) / 86400000);
  const when = ev.done ? 'finalizado' : daysAway === 0 ? 'é hoje!' : daysAway > 0 ? `em ${daysAway} dias` : `${-daysAway} dias atrás`;
  const outcome = ev.outcome ? OUTCOME[ev.outcome] : null;

  return (
    <Card style={{ marginBottom: 12 }} onPress={onEdit}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBubble emoji={ev.emoji} color={ev.done ? colors.textMuted : colors.primary} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontFamily: fontForWeight('700'), color: colors.text }}>{ev.name}</Text>
          <Muted size={12}>{formatDate(ev.date)} · {when}</Muted>
        </View>
        {!ev.done ? <Badge label="planejar" color={colors.warning} /> : null}
      </View>

      {ev.description ? <Muted size={13} style={{ marginTop: 10 }}>{ev.description}</Muted> : null}

      <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Muted size={11}>Planejado</Muted>
          <Text style={{ fontSize: 15, fontFamily: fontForWeight('800'), color: colors.text }}>{formatMoney(ev.planned_cents)}</Text>
        </View>
        {ev.done ? (
          <View style={{ flex: 1 }}>
            <Muted size={11}>Gasto real</Muted>
            <Text style={{ fontSize: 15, fontFamily: fontForWeight('800'), color: colors.text }}>{formatMoney(ev.spent_cents)}</Text>
          </View>
        ) : null}
      </View>

      {outcome ? (
        <View style={{ marginTop: 10 }}>
          <Badge label={outcome.label} color={colors[outcome.color]} />
          {ev.diff_cents !== 0 ? (
            <Muted size={12} style={{ marginTop: 6 }}>
              {ev.diff_cents < 0 ? 'Economizou ' : 'Passou '}{formatMoney(Math.abs(ev.diff_cents))} do planejado.
            </Muted>
          ) : null}
        </View>
      ) : (
        <Button title="Finalizar evento" variant="soft" style={{ marginTop: 14 }} onPress={onFinish} />
      )}
    </Card>
  );
}

function FinishSheet({ event, onClose, onSaved }) {
  const { colors } = useTheme();
  const [spent, setSpent] = useState(0);

  const preview = event ? spent - event.planned_cents : 0;
  const outcomeKey = !event ? null : event.planned_cents === 0 ? 'neutral' : preview < 0 ? 'under' : preview === 0 ? 'exact' : 'over';

  return (
    <Sheet
      visible={Boolean(event)}
      onClose={onClose}
      title={`Finalizar: ${event?.name ?? ''}`}
      height="62%"
      footer={
        <Button
          title="Finalizar"
          onPress={() => {
            db.setEventDone(event.id, true, spent);
            onSaved?.();
            onClose();
          }}
        />
      }
    >
      <Muted style={{ marginBottom: 10 }}>Quanto você gastou de verdade neste evento?</Muted>
      <MoneyField key={event?.id ?? 'finish'} cents={spent} onChange={setSpent} autoFocus color={colors.expense} />

      {event ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>Planejado</Muted>
            <Text style={{ color: colors.text, fontFamily: fontForWeight('700') }}>{formatMoney(event.planned_cents)}</Text>
          </View>
          {outcomeKey ? <Badge label={OUTCOME[outcomeKey].label} color={colors[OUTCOME[outcomeKey].color]} /> : null}
        </View>
      ) : null}
    </Sheet>
  );
}
