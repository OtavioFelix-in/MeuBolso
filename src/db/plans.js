// Metas, investimentos e patrimônio (bens).
//
// Dinheiro guardado em meta ou aportado em investimento SAI do saldo disponível
// e entra no patrimônio — a ideia é que "saldo disponível" seja o que dá pra
// gastar sem mexer no que já foi separado.

import { daysBetween, monthOf, today } from '../utils/date';
import { db, save, softDelete } from './core';
import { saveTransaction } from './transactions';

// ---- Metas ----

export function getGoals({ includeArchived = false } = {}) {
  const rows = db.getAllSync(
    `SELECT g.*,
       COALESCE((SELECT SUM(d.amount_cents) FROM goal_deposits d
                 WHERE d.goal_id = g.id AND d.deleted = 0), 0) AS saved_cents
     FROM goals g
     WHERE g.deleted = 0 ${includeArchived ? '' : 'AND g.archived = 0'}
     ORDER BY g.archived, g.position, g.id`
  );
  return rows.map(withGoalProgress);
}

export function getGoal(id) {
  const row = db.getFirstSync(
    `SELECT g.*,
       COALESCE((SELECT SUM(d.amount_cents) FROM goal_deposits d
                 WHERE d.goal_id = g.id AND d.deleted = 0), 0) AS saved_cents
     FROM goals g WHERE g.id = ?`,
    [id]
  );
  return row ? withGoalProgress(row) : null;
}

// Percentual, quanto falta, quanto precisa guardar por mês e a previsão de
// chegada no ritmo atual (média dos aportes já feitos).
function withGoalProgress(goal) {
  const missing = Math.max(goal.target_cents - goal.saved_cents, 0);
  const percent = goal.target_cents > 0 ? (goal.saved_cents / goal.target_cents) * 100 : 0;

  let monthsLeft = null;
  if (goal.deadline) {
    const days = daysBetween(today(), goal.deadline);
    monthsLeft = Math.max(Math.ceil(days / 30), days > 0 ? 1 : 0);
  }
  const perMonth = monthsLeft && monthsLeft > 0 ? Math.ceil(missing / monthsLeft) : null;

  const pace = db.getFirstSync(
    `SELECT COUNT(DISTINCT substr(date, 1, 7)) AS months, COALESCE(SUM(amount_cents), 0) AS total
     FROM goal_deposits WHERE goal_id = ? AND deleted = 0 AND amount_cents > 0`,
    [goal.id]
  );
  const avgPerMonth = pace.months > 0 ? pace.total / pace.months : 0;
  const monthsToFinish = avgPerMonth > 0 && missing > 0 ? Math.ceil(missing / avgPerMonth) : null;

  return {
    ...goal,
    missing_cents: missing,
    percent: Math.min(percent, 100),
    done: missing === 0 && goal.target_cents > 0,
    months_left: monthsLeft,
    need_per_month_cents: perMonth,
    avg_per_month_cents: Math.round(avgPerMonth),
    months_to_finish: monthsToFinish,
  };
}

export function saveGoal({ id, name, emoji, color, targetCents, deadline }) {
  return save('goals', id, {
    name,
    emoji,
    color,
    target_cents: targetCents,
    deadline: deadline ?? null,
  });
}

export function deleteGoal(id) {
  softDelete('goals', id);
  const deposits = db.getAllSync('SELECT id FROM goal_deposits WHERE goal_id = ? AND deleted = 0', [id]);
  for (const d of deposits) softDelete('goal_deposits', d.id);
}

export function setGoalArchived(id, archived) {
  save('goals', id, { archived: archived ? 1 : 0 });
}

export function getGoalDeposits(goalId) {
  return db.getAllSync(
    'SELECT * FROM goal_deposits WHERE goal_id = ? AND deleted = 0 ORDER BY date DESC, id DESC',
    [goalId]
  );
}

// amountCents negativo = resgate da meta.
export function addGoalDeposit({ goalId, amountCents, date, note = null }) {
  return save('goal_deposits', null, {
    goal_id: goalId,
    amount_cents: amountCents,
    date,
    note,
  });
}

export function deleteGoalDeposit(id) {
  softDelete('goal_deposits', id);
}

export function getGoalsTotal() {
  return db.getFirstSync(
    `SELECT COALESCE(SUM(d.amount_cents), 0) AS total
     FROM goal_deposits d
     JOIN goals g ON g.id = d.goal_id AND g.deleted = 0
     WHERE d.deleted = 0`
  ).total;
}

// ---- Investimentos ----

export function getInvestments() {
  const rows = db.getAllSync(`
    SELECT i.*,
      COALESCE((SELECT SUM(CASE WHEN m.kind = 'aporte' THEN m.amount_cents ELSE -m.amount_cents END)
                FROM investment_moves m WHERE m.investment_id = i.id AND m.deleted = 0), 0) AS invested_cents,
      (SELECT COUNT(*) FROM investment_moves m
       WHERE m.investment_id = i.id AND m.deleted = 0 AND m.kind = 'aporte') AS contributions
    FROM investments i
    WHERE i.deleted = 0
    ORDER BY i.current_cents DESC, i.id
  `);

  const total = rows.reduce((sum, r) => sum + r.current_cents, 0);
  return rows.map((r) => ({
    ...r,
    profit_cents: r.current_cents - r.invested_cents,
    profit_percent: r.invested_cents > 0
      ? ((r.current_cents - r.invested_cents) / r.invested_cents) * 100
      : 0,
    share_percent: total > 0 ? (r.current_cents / total) * 100 : 0,
  }));
}

export function saveInvestment({ id, name, type, color, currentCents, targetCents, note, liquid = 1 }) {
  return save('investments', id, {
    name,
    type,
    color,
    current_cents: currentCents,
    target_cents: targetCents ?? 0,
    note: note ?? null,
    liquid: liquid ? 1 : 0,
  });
}

export function deleteInvestment(id) {
  softDelete('investments', id);
  const moves = db.getAllSync('SELECT id FROM investment_moves WHERE investment_id = ? AND deleted = 0', [id]);
  for (const m of moves) softDelete('investment_moves', m.id);
}

export function getInvestmentMoves(investmentId) {
  return db.getAllSync(
    'SELECT * FROM investment_moves WHERE investment_id = ? AND deleted = 0 ORDER BY date DESC, id DESC',
    [investmentId]
  );
}

// Aportar/resgatar já ajusta o valor atual — sem isso a rentabilidade ficaria
// errada logo depois do aporte. Se vier accountId, a movimentação também entra
// como uma saída/entrada na conta corrente (off_budget: mexe no saldo da conta,
// mas não polui as despesas do mês).
export function addInvestmentMove({ investmentId, kind, amountCents, date, accountId = null }) {
  const inv = db.getFirstSync('SELECT name, current_cents FROM investments WHERE id = ?', [investmentId]);
  const id = save('investment_moves', null, {
    investment_id: investmentId,
    kind,
    amount_cents: amountCents,
    date,
  });
  const delta = kind === 'aporte' ? amountCents : -amountCents;
  save('investments', investmentId, {
    current_cents: Math.max((inv?.current_cents ?? 0) + delta, 0),
  });

  if (accountId) {
    saveTransaction({
      kind: kind === 'aporte' ? 'expense' : 'income',
      amountCents,
      date,
      accountId,
      description: `${kind === 'aporte' ? 'Aporte' : 'Resgate'}: ${inv?.name ?? 'investimento'}`,
      paid: 1,
      offBudget: 1,
    });
  }
  return id;
}

export function deleteInvestmentMove(id) {
  const move = db.getFirstSync('SELECT * FROM investment_moves WHERE id = ?', [id]);
  softDelete('investment_moves', id);
  if (move) {
    const delta = move.kind === 'aporte' ? -move.amount_cents : move.amount_cents;
    const current = db.getFirstSync('SELECT current_cents FROM investments WHERE id = ?', [move.investment_id]);
    save('investments', move.investment_id, {
      current_cents: Math.max((current?.current_cents ?? 0) + delta, 0),
    });
  }
}

export function getInvestmentsTotal() {
  return db.getFirstSync(
    `SELECT COALESCE(SUM(current_cents), 0) AS current,
            COALESCE(SUM((SELECT SUM(CASE WHEN m.kind = 'aporte' THEN m.amount_cents ELSE -m.amount_cents END)
                          FROM investment_moves m WHERE m.investment_id = investments.id AND m.deleted = 0)), 0) AS invested
     FROM investments WHERE deleted = 0`
  );
}

// Aportes do mês — usado no dashboard e nos lembretes.
export function getContributionsInMonth(month) {
  return db.getFirstSync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM investment_moves
     WHERE deleted = 0 AND kind = 'aporte' AND substr(date, 1, 7) = ?`,
    [month]
  ).total;
}

// ---- Patrimônio (bens) ----

export function getAssets() {
  return db.getAllSync('SELECT * FROM assets WHERE deleted = 0 ORDER BY value_cents DESC, id');
}

export function saveAsset({ id, name, type, emoji, valueCents, purchaseCents, acquiredAt, note }) {
  return save('assets', id, {
    name,
    type,
    emoji,
    value_cents: valueCents,
    purchase_cents: purchaseCents ?? 0,
    acquired_at: acquiredAt ?? null,
    note: note ?? null,
  });
}

export function deleteAsset(id) {
  softDelete('assets', id);
}

export function getAssetsTotal() {
  return db.getFirstSync('SELECT COALESCE(SUM(value_cents), 0) AS total FROM assets WHERE deleted = 0').total;
}

// Soma dos aportes/depósitos feitos num mês — entra no cálculo do saldo.
export function getSavedInMonth(month) {
  const goals = db.getFirstSync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM goal_deposits
     WHERE deleted = 0 AND substr(date, 1, 7) = ?`,
    [month]
  ).total;
  const invest = db.getFirstSync(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'aporte' THEN amount_cents ELSE -amount_cents END), 0) AS total
     FROM investment_moves WHERE deleted = 0 AND substr(date, 1, 7) = ?`,
    [month]
  ).total;
  return { goals, invest, total: goals + invest };
}

export function monthOfToday() {
  return monthOf(today());
}
