// Cartões de crédito: cadastro, limite e uso. O "uso" de um cartão é a soma das
// despesas (deste mês) marcadas com forma de pagamento crédito naquele cartão.
// Versão simples: sem fatura fechada automática ainda — mostra quanto já rolou.

import { currentMonth } from '../utils/date';
import { db, save, softDelete } from './core';

export function getCards({ includeArchived = false } = {}) {
  return db.getAllSync(
    `SELECT * FROM cards WHERE deleted = 0 ${includeArchived ? '' : 'AND archived = 0'}
     ORDER BY archived, position, id`
  );
}

// Cartões com o quanto já foi gasto no mês (crédito) e o limite disponível.
export function getCardsWithUsage(month = currentMonth()) {
  const cards = getCards();
  return cards.map((card) => {
    const used = db.getFirstSync(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS n
       FROM transactions
       WHERE deleted = 0 AND kind = 'expense' AND card_id = ? AND substr(date, 1, 7) = ?`,
      [card.id, month]
    );
    // Total ainda em aberto no cartão (todas as parcelas/compras não pagas).
    const openTotal = db.getFirstSync(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM transactions
       WHERE deleted = 0 AND kind = 'expense' AND card_id = ? AND paid = 0`,
      [card.id]
    ).total;
    return {
      ...card,
      used_cents: used.total,
      used_count: used.n,
      open_cents: openTotal,
      available_cents: Math.max(card.limit_cents - openTotal, 0),
      usage_percent: card.limit_cents > 0 ? Math.min((openTotal / card.limit_cents) * 100, 100) : 0,
    };
  });
}

export function saveCard({ id, name, limitCents, color, closingDay, dueDay }) {
  return save('cards', id, {
    name,
    limit_cents: limitCents,
    color,
    closing_day: closingDay ?? null,
    due_day: dueDay ?? null,
  });
}

export function setCardArchived(id, archived) {
  save('cards', id, { archived: archived ? 1 : 0 });
}

// Encerrar/remover: some da lista; as despesas ficam salvas, mas sem cartão.
export function deleteCard(id) {
  softDelete('cards', id);
}

// Onde a pessoa está concentrando os gastos no mês: conta corrente × cartão.
export function getSpendingSplit(month = currentMonth()) {
  const row = db.getFirstSync(
    `SELECT
       COALESCE(SUM(CASE WHEN card_id IS NOT NULL THEN amount_cents ELSE 0 END), 0) AS card,
       COALESCE(SUM(CASE WHEN card_id IS NULL THEN amount_cents ELSE 0 END), 0) AS account
     FROM transactions
     WHERE deleted = 0 AND kind = 'expense' AND off_budget = 0 AND substr(date, 1, 7) = ?`,
    [month]
  );
  const total = row.card + row.account;
  return {
    card_cents: row.card,
    account_cents: row.account,
    total_cents: total,
    card_percent: total > 0 ? (row.card / total) * 100 : 0,
    account_percent: total > 0 ? (row.account / total) * 100 : 0,
  };
}
