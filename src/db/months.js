// Modelo de "abrir mês". Um mês só fica ABERTO quando a pessoa clica em abrir —
// só aí as contas fixas e o salário viram lançamentos previstos de verdade nele.
// Enquanto fechado, o mês aparece apenas como PREVISÃO (nada é criado no banco),
// pra não deixar todos os meses bagunçados e cheios de coisa automática.

import { addMonths, currentMonth } from '../utils/date';
import { db, getSetting, nowIso, setSetting } from './core';
import { getRecurrencesForMonth, materializeMonth, materializeMonthTx } from './recurrences';

export function isMonthOpen(month) {
  return !!db.getFirstSync('SELECT month FROM open_months WHERE month = ?', [month]);
}

export function getOpenMonths() {
  return db.getAllSync('SELECT month FROM open_months ORDER BY month').map((r) => r.month);
}

// Abrir o mês: marca como aberto e materializa contas fixas + salário nele.
// Uma transação só — se materializar falhar, o mês não fica marcado como
// aberto sem os lançamentos previstos.
export function openMonth(month) {
  db.withTransactionSync(() => {
    db.runSync('INSERT OR IGNORE INTO open_months (month, opened_at) VALUES (?, ?)', [month, nowIso()]);
    materializeMonthTx(month);
  });
  return true;
}

// Recria os previstos em todos os meses já abertos (após cadastrar/editar uma
// conta fixa ou o salário, pra a novidade cair nos meses abertos).
export function materializeOpenMonths() {
  for (const m of getOpenMonths()) materializeMonth(m);
}

// Fechar o mês: volta pra previsão. Remove só os previstos automáticos (contas
// fixas/salário) que ainda NÃO foram pagos. O que já foi pago e os lançamentos
// manuais continuam salvos.
export function closeMonth(month) {
  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE transactions SET deleted = 1, updated_at = ?
       WHERE deleted = 0 AND recurrence_id IS NOT NULL AND paid = 0 AND substr(date, 1, 7) = ?`,
      [nowIso(), month]
    );
    db.runSync('DELETE FROM open_months WHERE month = ?', [month]);
  });
}

// Se sobrou algo real no mês (pago ou lançamento manual), avisamos antes de fechar.
export function monthHasKeptData(month) {
  const row = db.getFirstSync(
    `SELECT COUNT(*) AS n FROM transactions
     WHERE deleted = 0 AND substr(date, 1, 7) = ?
       AND (paid = 1 OR (recurrence_id IS NULL AND installment_id IS NULL))`,
    [month]
  );
  return row.n > 0;
}

// Na primeira vez que o app abre, deixa só o MÊS ATUAL aberto (pra não começar
// vazio). Meses passados NÃO são abertos automaticamente — se a pessoa quiser
// registrar algo retroativo, ela abre aquele mês na aba Meses.
export function ensureCurrentMonthOpen() {
  const base = currentMonth();

  // Limpeza única: fecha meses PASSADOS que ficaram abertos sem nada de real —
  // herança de versões antigas que abriam tudo automático e só ocupavam espaço.
  if (getSetting('cleanup_past_open_v1') !== '1') {
    for (const m of getOpenMonths()) {
      if (m < base && !monthHasKeptData(m)) closeMonth(m);
    }
    setSetting('cleanup_past_open_v1', '1');
  }

  if (getSetting('auto_opened_first') !== '1') {
    openMonth(base);
    setSetting('auto_opened_first', '1');
  }
}

// Previsão de um mês SEM criar nada: soma o que já existe de real com o que as
// contas fixas/salário gerariam. Serve tanto pra mês aberto quanto fechado.
export function getMonthProjection(month) {
  const open = isMonthOpen(month);

  const recs = getRecurrencesForMonth(month).filter((r) => r.in_month);
  let recIncome = 0;
  let recExpense = 0;
  for (const r of recs) {
    if (r.kind === 'income') recIncome += r.month_amount_cents;
    else recExpense += r.month_amount_cents;
  }

  // Lançamentos manuais (nem conta fixa, nem parcela).
  const manual = db.getFirstSync(
    `SELECT
       COALESCE(SUM(CASE WHEN kind = 'income'  THEN amount_cents ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE deleted = 0 AND off_budget = 0 AND substr(date, 1, 7) = ?
       AND recurrence_id IS NULL AND installment_id IS NULL`,
    [month]
  );

  // Parcelas que caem no mês (contam no saldo, salvo as marcadas fora do saldo).
  const inst = db.getFirstSync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS n
     FROM transactions
     WHERE deleted = 0 AND off_budget = 0 AND installment_id IS NOT NULL AND substr(date, 1, 7) = ?`,
    [month]
  );

  const income = recIncome + manual.income;
  const expense = recExpense + manual.expense + inst.total;

  return {
    month,
    open,
    income,
    expense,
    leftover: income - expense,
    bills_cents: recExpense,
    salary_cents: recIncome,
    installments_cents: inst.total,
    installments_count: inst.n,
    manual_income: manual.income,
    manual_expense: manual.expense,
    has_activity: income > 0 || expense > 0,
  };
}

// Linha do tempo de meses: por padrão só o mês atual e os futuros (planejamento),
// mais qualquer mês já aberto (inclusive passado, se a pessoa abriu retroativo).
// `before` > 0 revela meses anteriores pra quem quiser abrir retroativo.
export function getMonthsTimeline({ before = 0, after = 8 } = {}) {
  const base = currentMonth();
  const set = new Set();
  for (let i = -before; i <= after; i++) set.add(addMonths(base, i));
  for (const m of getOpenMonths()) set.add(m);

  return Array.from(set)
    .sort()
    .map((month) => ({ ...getMonthProjection(month), isCurrent: month === base }));
}
