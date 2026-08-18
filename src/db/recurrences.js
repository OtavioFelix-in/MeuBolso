// Contas fixas e receitas recorrentes (internet, Netflix, faculdade, salário...).
//
// A recorrência é só o "molde": todo mês ela vira um lançamento previsto de
// verdade (paid = 0) na tabela transactions. Quem cria esses lançamentos é
// materializeMonth(), chamado quando a pessoa abre um mês. Assim o histórico de
// pagamentos, o calendário e os relatórios não precisam saber que aquilo veio de
// uma recorrência — é um lançamento como qualquer outro.

import { dueDateFor } from '../utils/date';
import { db, nowIso, save, softDelete } from './core';
import { saveTransaction } from './transactions';

export function getRecurrences({ kind = null, activeOnly = false } = {}) {
  const where = ['r.deleted = 0'];
  const params = [];
  if (kind) {
    where.push('r.kind = ?');
    params.push(kind);
  }
  if (activeOnly) where.push('r.active = 1');

  return db.getAllSync(
    `SELECT r.*,
       c.name AS category_name, c.emoji AS category_emoji, c.color AS category_color,
       p.name AS parent_name, p.emoji AS parent_emoji, p.color AS parent_color,
       a.name AS account_name
     FROM recurrences r
     LEFT JOIN categories c ON c.id = r.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     LEFT JOIN accounts a ON a.id = r.account_id
     WHERE ${where.join(' AND ')}
     ORDER BY r.due_day, r.name`,
    params
  );
}

// Cada recorrência com a situação dela no mês pedido (lançamento gerado, pago?).
export function getRecurrencesForMonth(month, kind = null) {
  const list = getRecurrences({ kind });
  return list.map((rec) => {
    const tx = db.getFirstSync(
      `SELECT * FROM transactions
       WHERE deleted = 0 AND recurrence_id = ? AND substr(date, 1, 7) = ?`,
      [rec.id, month]
    );
    return {
      ...rec,
      transaction: tx ?? null,
      due_date: tx?.date ?? dueDateFor(month, rec.due_day),
      month_amount_cents: tx?.amount_cents ?? rec.amount_cents,
      is_paid: tx ? tx.paid === 1 : false,
      in_month: isActiveInMonth(rec, month),
    };
  });
}

function isActiveInMonth(rec, month) {
  if (!rec.active) return false;
  if (rec.start_month && rec.start_month > month) return false;
  if (rec.end_month && rec.end_month < month) return false;
  return true;
}

export function saveRecurrence({
  id,
  kind,
  name,
  amountCents,
  dueDay,
  categoryId,
  accountId,
  paymentMethod,
  remindDays = 3,
  variable = false,
  active = true,
  startMonth = null,
  endMonth = null,
  period = 'monthly',
  cardId = null,
}) {
  return save('recurrences', id, {
    kind,
    name,
    amount_cents: amountCents,
    due_day: dueDay,
    category_id: categoryId ?? null,
    account_id: accountId ?? null,
    payment_method: paymentMethod ?? null,
    remind_days: remindDays,
    variable: variable ? 1 : 0,
    active: active ? 1 : 0,
    start_month: startMonth,
    end_month: endMonth,
    period,
    card_id: cardId ?? null,
  });
}

// Apagar a conta fixa some com os lançamentos previstos que ainda não foram
// pagos; o que já foi pago vira histórico solto e continua nos relatórios.
export function deleteRecurrence(id) {
  softDelete('recurrences', id);
  db.runSync(
    'UPDATE transactions SET deleted = 1, updated_at = ? WHERE recurrence_id = ? AND paid = 0',
    [nowIso(), id]
  );
}

export function setRecurrenceActive(id, active) {
  db.runSync('UPDATE recurrences SET active = ?, updated_at = ? WHERE id = ?', [
    active ? 1 : 0,
    nowIso(),
    id,
  ]);
  if (!active) {
    db.runSync(
      'UPDATE transactions SET deleted = 1, updated_at = ? WHERE recurrence_id = ? AND paid = 0',
      [nowIso(), id]
    );
  }
}

// Gera os lançamentos previstos do mês pras recorrências ativas, sem abrir
// transação própria — pra poder ser chamada de dentro de outra transação
// (ex.: openMonth, que precisa marcar o mês aberto e materializar como uma
// coisa só). É idempotente: rodar de novo no mesmo mês não duplica nada.
export function materializeMonthTx(month) {
  const recs = db.getAllSync(
    `SELECT * FROM recurrences
     WHERE deleted = 0 AND active = 1
       AND (start_month IS NULL OR start_month <= ?)
       AND (end_month IS NULL OR end_month >= ?)`,
    [month, month]
  );

  const created = [];
  for (const rec of recs) {
    // Recorrência anual só cai no mesmo mês do ano em que começou.
    if (rec.period === 'annual') {
      const annualMonth = (rec.start_month ?? month).slice(5, 7);
      if (month.slice(5, 7) !== annualMonth) continue;
    }

    const exists = db.getFirstSync(
      `SELECT id FROM transactions
       WHERE deleted = 0 AND recurrence_id = ? AND substr(date, 1, 7) = ?`,
      [rec.id, month]
    );
    if (exists) continue;

    created.push(
      saveTransaction({
        kind: rec.kind,
        amountCents: rec.amount_cents,
        date: dueDateFor(month, rec.due_day),
        categoryId: rec.category_id,
        accountId: rec.account_id,
        paymentMethod: rec.payment_method,
        cardId: rec.card_id,
        description: rec.name,
        paid: 0,
        recurrenceId: rec.id,
      })
    );
  }
  return created;
}

// Mesma coisa, mas abrindo a própria transação — pra quem chama de fora
// (materializeOpenMonths, telas) sem já estar dentro de uma.
export function materializeMonth(month) {
  let created;
  db.withTransactionSync(() => {
    created = materializeMonthTx(month);
  });
  return created;
}

// Histórico de pagamentos de uma conta fixa.
export function getRecurrenceHistory(recurrenceId) {
  return db.getAllSync(
    `SELECT * FROM transactions
     WHERE deleted = 0 AND recurrence_id = ?
     ORDER BY date DESC`,
    [recurrenceId]
  );
}
