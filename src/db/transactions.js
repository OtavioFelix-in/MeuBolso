// Lançamentos: receitas e despesas. É a tabela central do app — contas fixas e
// parcelas também viram lançamentos (com recurrence_id / installment_id), então
// dashboard, calendário e relatórios leem tudo de um lugar só.
//
// `paid = 0` significa "previsto" (ainda não pago/recebido). É o que permite ver
// o que vence adiante e quanto já está comprometido nos próximos meses.

import { db, nowIso, save, softDelete } from './core';

const SELECT_TX = `
  SELECT t.*,
    c.name AS category_name, c.emoji AS category_emoji, c.color AS category_color,
    c.parent_id AS category_parent_id,
    p.name AS parent_name, p.color AS parent_color, p.emoji AS parent_emoji,
    a.name AS account_name, a.emoji AS account_emoji,
    cc.name AS card_name, cc.color AS card_color,
    r.name AS recurrence_name,
    i.description AS installment_description
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN categories p ON p.id = c.parent_id
  LEFT JOIN accounts a ON a.id = t.account_id
  LEFT JOIN cards cc ON cc.id = t.card_id
  LEFT JOIN recurrences r ON r.id = t.recurrence_id
  LEFT JOIN installments i ON i.id = t.installment_id
  WHERE t.deleted = 0
`;

// Como mostrar a categoria de um lançamento: subcategoria herda cor/emoji da mãe
// e vira "Alimentação · Mercado".
export function categoryLabel(tx) {
  if (!tx.category_id) return { name: 'Sem categoria', emoji: '❔', color: '#697586', full: 'Sem categoria' };
  const emoji = tx.parent_emoji ?? tx.category_emoji;
  const color = tx.parent_color ?? tx.category_color;
  return {
    name: tx.category_name,
    emoji,
    color,
    full: tx.parent_name ? `${tx.parent_name} · ${tx.category_name}` : tx.category_name,
  };
}

export function getTransactions({
  month = null,
  from = null,
  to = null,
  date = null,
  kind = null,
  categoryId = null,
  accountId = null,
  status = null, // 'paid' | 'pending'
  search = null,
  limit = null,
  includeOffBudget = false, // parcelas "fora do saldo" ficam escondidas por padrão
} = {}) {
  const where = [];
  const params = [];

  if (!includeOffBudget) where.push('t.off_budget = 0');

  if (month) {
    where.push('substr(t.date, 1, 7) = ?');
    params.push(month);
  }
  if (date) {
    where.push('t.date = ?');
    params.push(date);
  }
  if (from) {
    where.push('t.date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('t.date <= ?');
    params.push(to);
  }
  if (kind) {
    where.push('t.kind = ?');
    params.push(kind);
  }
  if (categoryId) {
    where.push('(t.category_id = ? OR c.parent_id = ?)');
    params.push(categoryId, categoryId);
  }
  if (accountId) {
    where.push('t.account_id = ?');
    params.push(accountId);
  }
  if (status === 'paid') where.push('t.paid = 1');
  if (status === 'pending') where.push('t.paid = 0');
  if (search) {
    where.push('(t.description LIKE ? OR c.name LIKE ? OR p.name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const sql = `${SELECT_TX} ${where.length ? `AND ${where.join(' AND ')}` : ''}
    ORDER BY t.date DESC, t.id DESC ${limit ? `LIMIT ${Number(limit)}` : ''}`;

  return db.getAllSync(sql, params);
}

export function getTransaction(id) {
  return db.getFirstSync(`${SELECT_TX} AND t.id = ?`, [id]);
}

export function saveTransaction({
  id,
  kind,
  amountCents,
  date,
  categoryId,
  accountId,
  paymentMethod,
  description,
  receiptUri,
  cardId = null,
  paid = 1,
  offBudget = 0,
  recurrenceId = null,
  installmentId = null,
  installmentNo = null,
  installmentTotal = null,
  notificationId = null,
}) {
  const fields = {
    kind,
    amount_cents: amountCents,
    date,
    category_id: categoryId ?? null,
    account_id: accountId ?? null,
    payment_method: paymentMethod ?? null,
    description: description ?? null,
    receipt_uri: receiptUri ?? null,
    card_id: cardId ?? null,
    paid: paid ? 1 : 0,
    off_budget: offBudget ? 1 : 0,
    recurrence_id: recurrenceId,
    installment_id: installmentId,
    installment_no: installmentNo,
    installment_total: installmentTotal,
    notification_id: notificationId,
  };
  if (!id) fields.created_at = nowIso();
  return save('transactions', id, fields);
}

export function setTransactionPaid(id, paid) {
  db.runSync('UPDATE transactions SET paid = ?, updated_at = ? WHERE id = ?', [
    paid ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export function deleteTransaction(id) {
  softDelete('transactions', id);
}

// ---- Agrupamentos usados nas telas ----

// Lançamentos do mês agrupados por dia, do mais recente pro mais antigo.
export function getTransactionsByDay(filters) {
  const rows = getTransactions(filters);
  const days = [];
  const index = new Map();

  for (const row of rows) {
    if (!index.has(row.date)) {
      const group = { date: row.date, items: [], totalIn: 0, totalOut: 0 };
      index.set(row.date, group);
      days.push(group);
    }
    const group = index.get(row.date);
    group.items.push(row);
    if (row.kind === 'income') group.totalIn += row.amount_cents;
    else group.totalOut += row.amount_cents;
  }
  return days;
}

// Um resumo por dia do mês, pro calendário pintar as bolinhas.
export function getMonthCalendar(month) {
  const rows = db.getAllSync(
    `SELECT date,
       SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE 0 END) AS income_cents,
       SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents,
       SUM(CASE WHEN paid = 0 THEN 1 ELSE 0 END) AS pending
     FROM transactions
     WHERE deleted = 0 AND off_budget = 0 AND substr(date, 1, 7) = ?
     GROUP BY date`,
    [month]
  );
  const map = {};
  for (const row of rows) map[row.date] = row;
  return map;
}

// Contas/parcelas que ainda não foram pagas até `limitDate` — alimenta o card
// "próximos vencimentos" e as notificações.
export function getUpcoming(limitDate, { includeOverdue = true, fromDate = null } = {}) {
  const where = ['t.paid = 0', 't.off_budget = 0', 't.date <= ?'];
  const params = [limitDate];
  if (!includeOverdue && fromDate) {
    where.push('t.date >= ?');
    params.push(fromDate);
  }
  return db.getAllSync(
    `${SELECT_TX} AND ${where.join(' AND ')} ORDER BY t.date ASC, t.id ASC`,
    params
  );
}
