// Compras parceladas. Ao cadastrar, já nascem as N parcelas como lançamentos
// previstos (uma por mês) — é isso que faz o app saber quanto do dinheiro dos
// próximos meses já está comprometido.

import { addMonths, dueDateFor, monthOf } from '../utils/date';
import { splitInstallments } from '../utils/money';
import { db, nowIso, save, softDelete } from './core';
import { saveTransaction } from './transactions';

export function getInstallments({ onlyOpen = false } = {}) {
  const rows = db.getAllSync(`
    SELECT i.*,
      c.name AS category_name, c.emoji AS category_emoji, c.color AS category_color,
      p.name AS parent_name, p.emoji AS parent_emoji, p.color AS parent_color,
      a.name AS account_name,
      (SELECT COUNT(*) FROM transactions t WHERE t.installment_id = i.id AND t.deleted = 0) AS parcels,
      (SELECT COUNT(*) FROM transactions t WHERE t.installment_id = i.id AND t.deleted = 0 AND t.paid = 1) AS paid_parcels,
      (SELECT COALESCE(SUM(t.amount_cents), 0) FROM transactions t WHERE t.installment_id = i.id AND t.deleted = 0 AND t.paid = 0) AS remaining_cents,
      (SELECT MIN(t.date) FROM transactions t WHERE t.installment_id = i.id AND t.deleted = 0 AND t.paid = 0) AS next_date,
      (SELECT MAX(t.date) FROM transactions t WHERE t.installment_id = i.id AND t.deleted = 0) AS last_date
    FROM installments i
    LEFT JOIN categories c ON c.id = i.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    LEFT JOIN accounts a ON a.id = i.account_id
    WHERE i.deleted = 0
    ORDER BY (remaining_cents = 0), next_date, i.id
  `);
  return onlyOpen ? rows.filter((r) => r.remaining_cents > 0) : rows;
}

export function getInstallmentParcels(installmentId) {
  return db.getAllSync(
    `SELECT * FROM transactions
     WHERE deleted = 0 AND installment_id = ?
     ORDER BY installment_no`,
    [installmentId]
  );
}

// Cria a compra e as parcelas de uma vez. As que caem antes de hoje já entram
// como pagas — quem cadastra uma compra "na parcela 3/10" espera exatamente isso.
export function createInstallment({
  description,
  totalCents,
  count,
  firstDate,
  categoryId,
  accountId,
  paymentMethod,
  paidUntil = 0,
  offBudget = 0,
  note = null,
  cardId = null,
}) {
  const id = save('installments', null, {
    description,
    total_cents: totalCents,
    count,
    first_date: firstDate,
    category_id: categoryId ?? null,
    account_id: accountId ?? null,
    payment_method: paymentMethod ?? null,
    off_budget: offBudget ? 1 : 0,
    note,
  });

  const amounts = splitInstallments(totalCents, count);
  const firstMonth = monthOf(firstDate);
  const day = Number(firstDate.slice(8, 10));

  db.withTransactionSync(() => {
    amounts.forEach((amount, i) => {
      saveTransaction({
        kind: 'expense',
        amountCents: amount,
        date: dueDateFor(addMonths(firstMonth, i), day),
        categoryId,
        accountId,
        paymentMethod,
        cardId,
        description: `${description} (${i + 1}/${count})`,
        paid: i < paidUntil ? 1 : 0,
        offBudget,
        installmentId: id,
        installmentNo: i + 1,
        installmentTotal: count,
      });
    });
  });

  return id;
}

export function updateInstallmentInfo({ id, description, categoryId, accountId, paymentMethod, offBudget = 0, note = null }) {
  db.withTransactionSync(() => {
    save('installments', id, {
      description,
      category_id: categoryId ?? null,
      account_id: accountId ?? null,
      payment_method: paymentMethod ?? null,
      off_budget: offBudget ? 1 : 0,
      note,
    });
    // Reflete o "incluir no saldo" em TODAS as parcelas (pagas e a pagar).
    db.runSync('UPDATE transactions SET off_budget = ?, updated_at = ? WHERE installment_id = ? AND deleted = 0', [
      offBudget ? 1 : 0,
      nowIso(),
      id,
    ]);
    // Só as parcelas em aberto acompanham a mudança; o que já foi pago fica como está.
    const parcels = db.getAllSync(
      'SELECT id, installment_no, installment_total FROM transactions WHERE installment_id = ? AND deleted = 0 AND paid = 0',
      [id]
    );
    for (const parcel of parcels) {
      db.runSync(
        `UPDATE transactions
         SET description = ?, category_id = ?, account_id = ?, payment_method = ?, updated_at = ?
         WHERE id = ?`,
        [
          `${description} (${parcel.installment_no}/${parcel.installment_total})`,
          categoryId ?? null,
          accountId ?? null,
          paymentMethod ?? null,
          nowIso(),
          parcel.id,
        ]
      );
    }
  });
}

export function deleteInstallment(id) {
  db.withTransactionSync(() => {
    softDelete('installments', id);
    db.runSync('UPDATE transactions SET deleted = 1, updated_at = ? WHERE installment_id = ?', [
      nowIso(),
      id,
    ]);
  });
}

// Total ainda devendo em parcelas e quanto pesa em cada um dos próximos meses.
export function getInstallmentForecast(fromMonth, months = 6) {
  const rows = db.getAllSync(
    `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total_cents, COUNT(*) AS parcels
     FROM transactions
     WHERE deleted = 0 AND paid = 0 AND off_budget = 0 AND installment_id IS NOT NULL
       AND substr(date, 1, 7) >= ?
     GROUP BY month
     ORDER BY month
     LIMIT ?`,
    [fromMonth, months]
  );
  const total = db.getFirstSync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total_cents, COUNT(*) AS parcels
     FROM transactions
     WHERE deleted = 0 AND paid = 0 AND off_budget = 0 AND installment_id IS NOT NULL`
  );
  return { byMonth: rows, ...total };
}
