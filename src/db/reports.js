// Consultas de resumo, gráficos e relatórios.
//
// Regra de ouro dos saldos:
//   saldo disponível = saldo inicial das contas
//                    + receitas recebidas - despesas pagas
//                    - o que foi guardado em metas e aportado em investimentos
//   patrimônio = saldo disponível + metas + investimentos (valor atual) + bens
// Ou seja: o que já foi separado sai do "dá pra gastar" mas continua sendo seu.

import { addMonths, lastMonths, monthOf, today } from '../utils/date';
import { db } from './core';

const sum = (sql, params = []) => db.getFirstSync(sql, params)?.total ?? 0;

// ---- Saldos ----

export function getAvailableBalance() {
  const initial = sum('SELECT COALESCE(SUM(initial_cents), 0) AS total FROM accounts WHERE deleted = 0');
  const movement = sum(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE -amount_cents END), 0) AS total
     FROM transactions WHERE deleted = 0 AND paid = 1 AND off_budget = 0`
  );
  const goals = sum('SELECT COALESCE(SUM(amount_cents), 0) AS total FROM goal_deposits WHERE deleted = 0');
  const invest = sum(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'aporte' THEN amount_cents ELSE -amount_cents END), 0) AS total
     FROM investment_moves WHERE deleted = 0`
  );
  return initial + movement - goals - invest;
}

export function getNetWorth() {
  const available = getAvailableBalance();
  const goals = sum(
    `SELECT COALESCE(SUM(d.amount_cents), 0) AS total FROM goal_deposits d
     JOIN goals g ON g.id = d.goal_id AND g.deleted = 0 WHERE d.deleted = 0`
  );
  const investments = sum('SELECT COALESCE(SUM(current_cents), 0) AS total FROM investments WHERE deleted = 0');
  const assets = sum('SELECT COALESCE(SUM(value_cents), 0) AS total FROM assets WHERE deleted = 0');
  return { available, goals, investments, assets, total: available + goals + investments + assets };
}

// ---- Resumo do mês ----

export function getMonthSummary(month) {
  const row = db.getFirstSync(
    `SELECT
       COALESCE(SUM(CASE WHEN kind = 'income'  AND paid = 1 THEN amount_cents ELSE 0 END), 0) AS income_paid,
       COALESCE(SUM(CASE WHEN kind = 'income'  AND paid = 0 THEN amount_cents ELSE 0 END), 0) AS income_pending,
       COALESCE(SUM(CASE WHEN kind = 'expense' AND paid = 1 THEN amount_cents ELSE 0 END), 0) AS expense_paid,
       COALESCE(SUM(CASE WHEN kind = 'expense' AND paid = 0 THEN amount_cents ELSE 0 END), 0) AS expense_pending,
       COUNT(*) AS entries
     FROM transactions WHERE deleted = 0 AND off_budget = 0 AND substr(date, 1, 7) = ?`,
    [month]
  );

  const savedGoals = sum(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM goal_deposits
     WHERE deleted = 0 AND substr(date, 1, 7) = ?`,
    [month]
  );
  const savedInvest = sum(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'aporte' THEN amount_cents ELSE -amount_cents END), 0) AS total
     FROM investment_moves WHERE deleted = 0 AND substr(date, 1, 7) = ?`,
    [month]
  );

  const income = row.income_paid + row.income_pending;
  const expense = row.expense_paid + row.expense_pending;
  const saved = savedGoals + savedInvest;
  const leftover = income - expense - saved;

  return {
    month,
    ...row,
    income,
    expense,
    saved,
    saved_goals: savedGoals,
    saved_invest: savedInvest,
    leftover,
    // "Percentual economizado": do que entrou, quanto não virou despesa.
    saving_rate: income > 0 ? ((income - expense) / income) * 100 : 0,
    invested_rate: income > 0 ? (saved / income) * 100 : 0,
  };
}

// ---- Gastos por categoria (agrupando subcategoria na mãe) ----

export function getCategoryBreakdown(month, kind = 'expense') {
  const rows = db.getAllSync(
    `SELECT
       COALESCE(p.id, c.id) AS category_id,
       COALESCE(p.name, c.name, 'Sem categoria') AS name,
       COALESCE(p.emoji, c.emoji, '❔') AS emoji,
       COALESCE(p.color, c.color, '#697586') AS color,
       SUM(t.amount_cents) AS total_cents,
       COUNT(*) AS entries
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = ? AND substr(t.date, 1, 7) = ?
     GROUP BY category_id
     ORDER BY total_cents DESC`,
    [kind, month]
  );
  const total = rows.reduce((acc, r) => acc + r.total_cents, 0);
  return rows.map((r) => ({ ...r, percent: total > 0 ? (r.total_cents / total) * 100 : 0, total }));
}

// Quebra de uma categoria nas suas subcategorias (pro drill-down do relatório).
export function getSubcategoryBreakdown(month, categoryId) {
  return db.getAllSync(
    `SELECT COALESCE(c.name, 'Sem subcategoria') AS name, SUM(t.amount_cents) AS total_cents, COUNT(*) AS entries
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense' AND substr(t.date, 1, 7) = ?
       AND (t.category_id = ? OR c.parent_id = ?)
     GROUP BY t.category_id
     ORDER BY total_cents DESC`,
    [month, categoryId, categoryId]
  );
}

// ---- Séries pros gráficos ----

export function getMonthlySeries(endMonth, count = 6) {
  const months = lastMonths(endMonth, count);
  const rows = db.getAllSync(
    `SELECT substr(date, 1, 7) AS month,
       COALESCE(SUM(CASE WHEN kind = 'income'  THEN amount_cents ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE deleted = 0 AND off_budget = 0 AND substr(date, 1, 7) >= ? AND substr(date, 1, 7) <= ?
     GROUP BY month`,
    [months[0], months[months.length - 1]]
  );
  const map = Object.fromEntries(rows.map((r) => [r.month, r]));

  const saved = db.getAllSync(
    `SELECT month, SUM(total) AS total FROM (
       SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total FROM goal_deposits
       WHERE deleted = 0 GROUP BY month
       UNION ALL
       SELECT substr(date, 1, 7) AS month,
         SUM(CASE WHEN kind = 'aporte' THEN amount_cents ELSE -amount_cents END) AS total
       FROM investment_moves WHERE deleted = 0 GROUP BY month
     ) GROUP BY month`
  );
  const savedMap = Object.fromEntries(saved.map((r) => [r.month, r.total]));

  return months.map((month) => ({
    month,
    income: map[month]?.income ?? 0,
    expense: map[month]?.expense ?? 0,
    saved: savedMap[month] ?? 0,
    balance: (map[month]?.income ?? 0) - (map[month]?.expense ?? 0),
  }));
}

// Evolução do patrimônio: acumula tudo que aconteceu até o fim de cada mês.
// Para o mês mais recente usamos o valor atual dos investimentos (que já inclui
// rendimento), por isso a última barra pode subir mais que os aportes.
export function getNetWorthSeries(endMonth, count = 6) {
  const months = lastMonths(endMonth, count);
  const initial = sum('SELECT COALESCE(SUM(initial_cents), 0) AS total FROM accounts WHERE deleted = 0');

  const tx = db.getAllSync(
    `SELECT substr(date, 1, 7) AS month,
       SUM(CASE WHEN kind = 'income' THEN amount_cents ELSE -amount_cents END) AS total
     FROM transactions WHERE deleted = 0 AND paid = 1 AND off_budget = 0 GROUP BY month`
  );
  const deposits = db.getAllSync(
    `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total
     FROM goal_deposits WHERE deleted = 0 GROUP BY month`
  );
  const moves = db.getAllSync(
    `SELECT substr(date, 1, 7) AS month,
       SUM(CASE WHEN kind = 'aporte' THEN amount_cents ELSE -amount_cents END) AS total
     FROM investment_moves WHERE deleted = 0 GROUP BY month`
  );
  const assets = db.getAllSync(
    `SELECT COALESCE(substr(acquired_at, 1, 7), '0000-00') AS month, SUM(value_cents) AS total
     FROM assets WHERE deleted = 0 GROUP BY month`
  );
  const investNow = sum('SELECT COALESCE(SUM(current_cents), 0) AS total FROM investments WHERE deleted = 0');

  const until = (rows, month) =>
    rows.filter((r) => r.month <= month).reduce((acc, r) => acc + r.total, 0);

  const lastMonth = months[months.length - 1];
  return months.map((month) => {
    const cash = initial + until(tx, month) - until(deposits, month) - until(moves, month);
    const invested = month === lastMonth ? investNow : until(moves, month);
    const saved = until(deposits, month);
    const bens = until(assets, month);
    return {
      month,
      cash,
      invested,
      goals: saved,
      assets: bens,
      total: cash + invested + saved + bens,
    };
  });
}

// Evolução de uma categoria específica ao longo dos meses (dashboard de hábitos).
export function getCategorySeries(categoryId, endMonth, count = 6) {
  const months = lastMonths(endMonth, count);
  const rows = db.getAllSync(
    `SELECT substr(t.date, 1, 7) AS month, SUM(t.amount_cents) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense'
       AND (t.category_id = ? OR c.parent_id = ?)
       AND substr(t.date, 1, 7) >= ? AND substr(t.date, 1, 7) <= ?
     GROUP BY month`,
    [categoryId, categoryId, months[0], months[months.length - 1]]
  );
  const map = Object.fromEntries(rows.map((r) => [r.month, r.total]));
  return months.map((month) => ({ month, total: map[month] ?? 0 }));
}

// ---- Perfil financeiro ----

export function getFinancialProfile(month, monthsBack = 6) {
  const series = getMonthlySeries(month, monthsBack);
  const withData = series.filter((s) => s.income > 0 || s.expense > 0);
  const n = withData.length || 1;

  const avgIncome = withData.reduce((a, s) => a + s.income, 0) / n;
  const avgExpense = withData.reduce((a, s) => a + s.expense, 0) / n;
  const avgSaved = withData.reduce((a, s) => a + s.saved, 0) / n;

  const worth = getNetWorth();
  // Reserva de emergência: quantos meses de despesa média o dinheiro líquido cobre.
  const liquid = worth.available + worth.goals + worth.investments;
  const emergencyMonths = avgExpense > 0 ? liquid / avgExpense : 0;

  return {
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    avgSaved: Math.round(avgSaved),
    savingRate: avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0,
    investedRate: worth.total > 0 ? (worth.investments / worth.total) * 100 : 0,
    emergencyMonths,
    cashFlow: Math.round(avgIncome - avgExpense),
    worth,
    monthsAnalyzed: withData.length,
  };
}

// ---- Relatórios inteligentes ----

// Responde, com números do banco, as perguntas que o app se propõe a responder.
export function getSmartAnswers(month) {
  const year = month.slice(0, 4);
  const previous = addMonths(month, -1);
  const answers = [];

  const breakdown = getCategoryBreakdown(month, 'expense');
  if (breakdown.length > 0) {
    const top = breakdown[0];
    answers.push({
      key: 'top-category',
      emoji: top.emoji,
      question: 'Onde gasto mais dinheiro?',
      answer: top.name,
      value: top.total_cents,
      detail: `${top.percent.toFixed(0)}% de tudo que saiu em ${month.slice(5)}/${month.slice(2, 4)} · ${top.entries} lançamentos`,
    });
  }

  const biggest = db.getFirstSync(
    `SELECT t.*, COALESCE(p.name, c.name) AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense' AND substr(t.date, 1, 7) = ?
     ORDER BY t.amount_cents DESC LIMIT 1`,
    [month]
  );
  if (biggest) {
    answers.push({
      key: 'biggest',
      emoji: '🔎',
      question: 'Qual foi meu maior gasto?',
      answer: biggest.description || biggest.category_name || 'Lançamento',
      value: biggest.amount_cents,
      detail: `em ${biggest.date.slice(8)}/${biggest.date.slice(5, 7)}${biggest.category_name ? ` · ${biggest.category_name}` : ''}`,
    });
  }

  // Categoria que mais cresceu em relação ao mês passado.
  const prevBreakdown = getCategoryBreakdown(previous, 'expense');
  const prevMap = Object.fromEntries(prevBreakdown.map((r) => [r.category_id, r.total_cents]));
  let grew = null;
  for (const row of breakdown) {
    const before = prevMap[row.category_id] ?? 0;
    const delta = row.total_cents - before;
    if (before > 0 && delta > 0 && (!grew || delta > grew.delta)) {
      grew = { ...row, delta, before };
    }
  }
  if (grew) {
    answers.push({
      key: 'growth',
      emoji: '📈',
      question: 'Qual categoria mais cresceu?',
      answer: grew.name,
      value: grew.delta,
      positive: false,
      detail: `subiu ${((grew.delta / grew.before) * 100).toFixed(0)}% em relação ao mês passado`,
    });
  }

  const summary = getMonthSummary(month);
  answers.push({
    key: 'saving',
    emoji: '🐷',
    question: 'Quanto consigo economizar por mês?',
    answer: summary.leftover >= 0 ? 'Sobrou este mês' : 'Faltou este mês',
    value: Math.abs(summary.leftover),
    positive: summary.leftover >= 0,
    detail:
      summary.income > 0
        ? `${summary.saving_rate.toFixed(0)}% do que entrou não virou despesa`
        : 'Cadastre suas receitas pra ver este número',
  });

  const yearRow = db.getFirstSync(
    `SELECT
       COALESCE(SUM(CASE WHEN kind = 'income'  THEN amount_cents ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
     FROM transactions WHERE deleted = 0 AND off_budget = 0 AND substr(date, 1, 4) = ?`,
    [year]
  );
  answers.push({
    key: 'year',
    emoji: '🗓️',
    question: `Quanto economizei em ${year}?`,
    answer: yearRow.income - yearRow.expense >= 0 ? 'Saldo positivo no ano' : 'Saldo negativo no ano',
    value: Math.abs(yearRow.income - yearRow.expense),
    positive: yearRow.income - yearRow.expense >= 0,
    detail: `entrou ${(yearRow.income / 100).toFixed(0)} e saiu ${(yearRow.expense / 100).toFixed(0)} reais no ano`,
  });

  const debt = db.getFirstSync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS parcels
     FROM transactions
     WHERE deleted = 0 AND paid = 0 AND installment_id IS NOT NULL`
  );
  answers.push({
    key: 'installments',
    emoji: '💳',
    question: 'Quanto falta pra quitar todas as parcelas?',
    answer: debt.parcels > 0 ? `${debt.parcels} parcelas em aberto` : 'Nenhuma parcela em aberto',
    value: debt.total,
    positive: debt.parcels === 0,
    detail: debt.parcels > 0 ? 'somando todas as compras parceladas' : 'você está livre de parcelas 🎉',
  });

  const committed = db.getAllSync(
    `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total
     FROM transactions
     WHERE deleted = 0 AND paid = 0 AND off_budget = 0 AND kind = 'expense' AND substr(date, 1, 7) > ?
     GROUP BY month ORDER BY month LIMIT 3`,
    [month]
  );
  if (committed.length > 0) {
    answers.push({
      key: 'committed',
      emoji: '🔒',
      question: 'Quanto já está comprometido nos próximos meses?',
      answer: `${committed.length} ${committed.length === 1 ? 'mês' : 'meses'} à frente`,
      value: committed.reduce((a, r) => a + r.total, 0),
      positive: false,
      detail: committed
        .map((r) => `${r.month.slice(5)}: ${(r.total / 100).toFixed(0)}`)
        .join(' · '),
    });
  }

  return answers;
}

// Quanto foi gasto numa categoria específica dentro do mês (usado nos hábitos).
export function getCategoryTotal(categoryId, month) {
  return sum(
    `SELECT COALESCE(SUM(t.amount_cents), 0) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense' AND substr(t.date, 1, 7) = ?
       AND (t.category_id = ? OR c.parent_id = ?)`,
    [month, categoryId, categoryId]
  );
}

// Meses que já têm algum lançamento — o seletor de mês não deixa passar disso.
export function getMonthRange() {
  const row = db.getFirstSync(
    `SELECT MIN(substr(date, 1, 7)) AS first, MAX(substr(date, 1, 7)) AS last
     FROM transactions WHERE deleted = 0`
  );
  return { first: row?.first ?? monthOf(today()), last: row?.last ?? monthOf(today()) };
}
