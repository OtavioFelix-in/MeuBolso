// Agenda financeira: eventos futuros (viagem, aniversário, Natal...).
// Cada evento tem um valor PLANEJADO e, quando termina, o quanto foi REALMENTE
// gasto — aí o app diz se gastou menos, igual ou acima do planejado.
//
// Eventos são independentes de lançamentos: servem pra planejar. Se quiser, o
// gasto real vira despesa normal, mas isso é decisão do usuário na hora.

import { db, save, softDelete } from './core';

export function getEvents({ includeDone = true } = {}) {
  const rows = db.getAllSync(
    `SELECT * FROM events WHERE deleted = 0 ${includeDone ? '' : 'AND done = 0'}
     ORDER BY done ASC, date ASC, id ASC`
  );
  return rows.map(withEventStatus);
}

export function getEventsInMonth(month) {
  return db
    .getAllSync(
      `SELECT * FROM events WHERE deleted = 0 AND substr(date, 1, 7) = ? ORDER BY date, id`,
      [month]
    )
    .map(withEventStatus);
}

function withEventStatus(ev) {
  const diff = ev.spent_cents - ev.planned_cents;
  let outcome = null; // só faz sentido depois de finalizar
  if (ev.done) {
    if (ev.planned_cents === 0) outcome = 'neutral';
    else if (diff < 0) outcome = 'under';
    else if (diff === 0) outcome = 'exact';
    else outcome = 'over';
  }
  return { ...ev, diff_cents: diff, outcome };
}

export function saveEvent({ id, name, emoji, date, description, plannedCents, spentCents, done }) {
  return save('events', id, {
    name,
    emoji: emoji || '🗓️',
    date,
    description: description ?? null,
    planned_cents: plannedCents ?? 0,
    spent_cents: spentCents ?? 0,
    done: done ? 1 : 0,
  });
}

export function setEventDone(id, done, spentCents) {
  save('events', id, {
    done: done ? 1 : 0,
    ...(spentCents != null ? { spent_cents: spentCents } : {}),
  });
}

export function deleteEvent(id) {
  softDelete('events', id);
}

export function getEventsSummary() {
  const upcoming = db.getFirstSync(
    `SELECT COUNT(*) AS n, COALESCE(SUM(planned_cents), 0) AS planned
     FROM events WHERE deleted = 0 AND done = 0`
  );
  return { count: upcoming.n, planned_cents: upcoming.planned };
}
