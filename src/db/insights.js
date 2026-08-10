// Motor de insights locais — Sprint 3 (ver SPRINT3.md).
// Funções puras sobre o banco, sem UI. Regra de ouro: nunca inventar
// comparação que não existe — cada insight só aparece com histórico mínimo.

import { addMonths, currentMonth, daysInMonth, today } from '../utils/date';
import { getCardsWithUsage } from './cards';
import { db } from './core';
import { getCategoryBreakdown, getFinancialProfile, getMonthlySeries, getMonthSummary } from './reports';

const sum = (sql, params = []) => db.getFirstSync(sql, params)?.total ?? 0;

// Meses (mais antigo → mais novo) com pelo menos um lançamento, terminando
// antes de `month` — usados como base de comparação, nunca incluem o próprio mês.
function priorMonthsWithData(month, lookback) {
  return getMonthlySeries(addMonths(month, -1), lookback).filter((s) => s.income > 0 || s.expense > 0);
}

// ---- Média por categoria nos meses anteriores (exclui o mês corrente) ----

export function getCategoryAverages(month, lookback = 3) {
  const prior = priorMonthsWithData(month, lookback);
  if (prior.length === 0) return { months: 0, categories: [] };

  const rows = db.getAllSync(
    `SELECT
       COALESCE(p.id, c.id) AS category_id,
       COALESCE(p.name, c.name, 'Sem categoria') AS name,
       COALESCE(p.emoji, c.emoji, '❔') AS emoji,
       SUM(t.amount_cents) AS total_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense'
       AND substr(t.date, 1, 7) >= ? AND substr(t.date, 1, 7) <= ?
     GROUP BY category_id`,
    [prior[0].month, prior[prior.length - 1].month]
  );

  return {
    months: prior.length,
    categories: rows.map((r) => ({ ...r, average_cents: Math.round(r.total_cents / prior.length) })),
  };
}

// ---- Ritmo do mês: gasto até agora, projeção de fechamento ----

export function getMonthPace(month) {
  const isCurrent = month === currentMonth();
  const dayNow = isCurrent ? Number(today().slice(8, 10)) : daysInMonth(month);
  const total = daysInMonth(month);
  const spent = getMonthSummary(month).expense_paid;
  const dailyRate = dayNow > 0 ? spent / dayNow : 0;
  return {
    isCurrent,
    dayNow,
    totalDays: total,
    daysLeft: Math.max(total - dayNow, 0),
    spent,
    projection: Math.round(dailyRate * total),
  };
}

// ---- Maior gasto do mês ----

export function getBiggestExpense(month) {
  return db.getFirstSync(
    `SELECT t.*, COALESCE(p.name, c.name) AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense' AND substr(t.date, 1, 7) = ?
     ORDER BY t.amount_cents DESC LIMIT 1`,
    [month]
  );
}

// ---- Lançamento muito acima do normal da própria categoria ----

export function getAnomalies(month, lookback = 3) {
  const prior = priorMonthsWithData(month, lookback);
  if (prior.length < lookback) return [];

  const avgPerEntry = db.getAllSync(
    `SELECT COALESCE(p.id, c.id) AS category_id, AVG(t.amount_cents) AS avg_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense'
       AND substr(t.date, 1, 7) >= ? AND substr(t.date, 1, 7) <= ?
     GROUP BY category_id`,
    [prior[0].month, prior[prior.length - 1].month]
  );
  const avgMap = Object.fromEntries(avgPerEntry.map((r) => [r.category_id, r.avg_cents]));

  const entries = db.getAllSync(
    `SELECT t.*, COALESCE(p.id, c.id) AS category_id, COALESCE(p.name, c.name) AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense' AND substr(t.date, 1, 7) = ?`,
    [month]
  );

  return entries
    .map((e) => ({ ...e, average_cents: avgMap[e.category_id] ?? 0 }))
    .filter((e) => e.average_cents > 0 && e.amount_cents > e.average_cents * 2.5)
    .sort((a, b) => b.amount_cents / b.average_cents - a.amount_cents / a.average_cents);
}

// ---- Peso das contas fixas na renda ----

export function getSubscriptionsWeight(month) {
  const income = getMonthSummary(month).income;
  const fixed = sum(
    `SELECT COALESCE(SUM(t.amount_cents), 0) AS total
     FROM transactions t
     LEFT JOIN recurrences r ON r.id = t.recurrence_id
     WHERE t.deleted = 0 AND t.off_budget = 0 AND t.kind = 'expense' AND substr(t.date, 1, 7) = ?
       AND (t.installment_id IS NOT NULL OR (t.recurrence_id IS NOT NULL AND r.variable = 0))`,
    [month]
  );
  return { fixed, income, percent: income > 0 ? (fixed / income) * 100 : 0 };
}

// ---- Resumo dos últimos 7 dias vs. média semanal (pro resumo semanal) ----

export function getWeekSummary() {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceIso = since.toISOString().slice(0, 10);

  const spent = sum(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
     WHERE deleted = 0 AND off_budget = 0 AND kind = 'expense' AND paid = 1 AND date >= ?`,
    [sinceIso]
  );
  const profile = getFinancialProfile(currentMonth(), 6);
  const weeklyAverage = profile.avgExpense / 4.345;
  const delta = weeklyAverage > 0 ? ((spent - weeklyAverage) / weeklyAverage) * 100 : 0;
  return { spent, weeklyAverage: Math.round(weeklyAverage), delta };
}

// ---- Catálogo completo, pronto pra tela ----

function insight(id, type, emoji, title, text, priority) {
  return { id, type, emoji, title, text, priority };
}

const money = (cents) => `R$ ${(Math.abs(cents) / 100).toFixed(2).replace('.', ',')}`;

export function buildInsights(month) {
  const list = [];
  const summary = getMonthSummary(month);
  if (summary.entries === 0) return list;

  // 1. Resultado do mês
  list.push(
    summary.leftover >= 0
      ? insight('result', 'positivo', '💰', 'Resultado do mês', `Este mês você está sobrando ${money(summary.leftover)}.`, 5)
      : insight('result', 'alerta', '⚠️', 'Resultado do mês', `Este mês você está no vermelho em ${money(summary.leftover)}.`, 9)
  );

  // 2. Comparativo mensal
  const previous = getMonthSummary(addMonths(month, -1));
  if (previous.entries > 0 && previous.expense > 0) {
    const delta = ((summary.expense - previous.expense) / previous.expense) * 100;
    if (Math.abs(delta) >= 1) {
      list.push(
        insight(
          'comparison',
          'neutro',
          '📅',
          'Comparativo mensal',
          `Você gastou ${Math.abs(delta).toFixed(0)}% ${delta > 0 ? 'a mais' : 'a menos'} que no mês passado.`,
          3
        )
      );
    }
  }

  // 3 e 4. Categoria em alta / em queda
  const averages = getCategoryAverages(month, 3);
  if (averages.months >= 2) {
    const breakdown = getCategoryBreakdown(month, 'expense');
    const avgMap = Object.fromEntries(averages.categories.map((c) => [c.category_id, c]));
    let highest = null;
    let lowest = null;
    for (const cat of breakdown) {
      const base = avgMap[cat.category_id];
      if (!base || base.average_cents <= 0) continue;
      const delta = (cat.total_cents - base.average_cents) / base.average_cents;
      if (delta >= 0.3 && (!highest || delta > highest.delta)) highest = { ...cat, delta };
      if (delta <= -0.2 && (!lowest || delta < lowest.delta)) lowest = { ...cat, delta };
    }
    if (highest) {
      list.push(
        insight(
          'category-up',
          'alerta',
          '📈',
          'Categoria em alta',
          `Seu gasto com ${highest.name} subiu ${(highest.delta * 100).toFixed(0)}% vs. sua média.`,
          7
        )
      );
    }
    if (lowest) {
      list.push(
        insight(
          'category-down',
          'positivo',
          '👏',
          'Categoria em queda',
          `Mandou bem: ${lowest.name} ficou ${Math.abs(lowest.delta * 100).toFixed(0)}% abaixo do normal.`,
          4
        )
      );
    }
  }

  // 5 e 6. Ritmo do mês (só faz sentido no mês corrente)
  const pace = getMonthPace(month);
  if (pace.isCurrent && pace.dayNow >= 5) {
    const profile = getFinancialProfile(month, 6);
    if (profile.avgExpense > 0) {
      if (pace.projection > profile.avgExpense * 1.15) {
        list.push(
          insight(
            'pace-hot',
            'alerta',
            '🔥',
            'Ritmo do mês',
            `No ritmo atual, deve fechar em ${money(pace.projection)}, acima do normal.`,
            8
          )
        );
      } else if (pace.projection < profile.avgExpense * 0.9) {
        list.push(
          insight('pace-good', 'positivo', '🐢', 'Ritmo bom', 'Está gastando mais devagar que o normal. 👏', 4)
        );
      }
    }
  }

  // 7. Maior gasto
  const biggest = getBiggestExpense(month);
  if (biggest) {
    list.push(
      insight(
        'biggest',
        'neutro',
        '🔎',
        'Maior gasto',
        `Seu maior gasto foi ${biggest.description || biggest.category_name || 'um lançamento'}: ${money(biggest.amount_cents)}.`,
        2
      )
    );
  }

  // 8. Lançamento fora do padrão
  const anomalies = getAnomalies(month, 3);
  if (anomalies.length > 0) {
    const top = anomalies[0];
    list.push(
      insight(
        'anomaly',
        'alerta',
        '🚨',
        'Fora do padrão',
        `Um gasto de ${money(top.amount_cents)} em ${top.category_name || 'uma categoria'} chamou atenção — bem acima do seu normal.`,
        8
      )
    );
  }

  // 9. Peso das contas fixas
  const weight = getSubscriptionsWeight(month);
  if (weight.income > 0 && weight.percent > 50) {
    list.push(
      insight(
        'fixed-weight',
        'alerta',
        '🧾',
        'Peso das contas fixas',
        `Suas contas fixas consomem ${weight.percent.toFixed(0)}% da sua renda.`,
        7
      )
    );
  }

  // 10. Uso do cartão
  for (const card of getCardsWithUsage(month)) {
    if (card.usage_percent > 80) {
      list.push(
        insight(
          `card-${card.id}`,
          'alerta',
          '💳',
          'Uso do cartão',
          `O cartão ${card.name} já usou ${card.usage_percent.toFixed(0)}% do limite.`,
          6
        )
      );
    }
  }

  // 11. Sem registrar (só no mês corrente)
  if (month === currentMonth()) {
    const last = db.getFirstSync(
      `SELECT MAX(date) AS date FROM transactions WHERE deleted = 0 AND substr(date, 1, 7) = ?`,
      [month]
    );
    if (last?.date) {
      const days = Math.round((new Date(today()) - new Date(last.date)) / 86400000);
      if (days >= 5) {
        list.push(
          insight('no-entries', 'neutro', '🗒️', 'Sem registrar', `Faz ${days} dias sem registrar nada. Bora atualizar?`, 3)
        );
      }
    }
  }

  // 12. Melhor mês
  const series = getMonthlySeries(month, 12).filter((s) => s.income > 0 || s.expense > 0);
  if (series.length >= 3) {
    const balances = series.map((s) => ({ month: s.month, balance: s.income - s.expense }));
    const best = balances.reduce((a, b) => (b.balance > a.balance ? b : a));
    if (best.month === month && best.balance > 0) {
      list.push(
        insight('best-month', 'positivo', '🎉', 'Melhor mês', 'Sua melhor economia desde que começou. 🎉', 5)
      );
    }
  }

  const order = { alerta: 0, positivo: 1, neutro: 2 };
  return list
    .sort((a, b) => order[a.type] - order[b.type] || b.priority - a.priority)
    .slice(0, 5);
}
