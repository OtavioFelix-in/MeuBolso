// Salário fixo mensal — construído em cima do que já existe (uma recorrência de
// receita), pra não inventar tabela.

import { currentMonth, dueDateFor } from '../utils/date';
import { db, getSetting, nowIso, setSetting } from './core';
import { saveRecurrence } from './recurrences';
import { saveTransaction } from './transactions';
import { materializeOpenMonths } from './months';

// ---- Categoria por nome (âncora do Salário) ----

function findCategory(name, kind) {
  return db.getFirstSync(
    'SELECT * FROM categories WHERE deleted = 0 AND kind = ? AND parent_id IS NULL AND name = ?',
    [kind, name]
  );
}

// ---- Salário / renda fixa ----
// É uma recorrência de receita. Guardamos o id dela em settings pra achar depois.
// Editar só um mês = editar o lançamento daquele mês (feito na tela Início).

export function getSalary() {
  const id = Number(getSetting('salary_recurrence_id', 0));
  if (!id) return { configured: false, cents: 0, day: 5, recurrenceId: null };
  const rec = db.getFirstSync('SELECT * FROM recurrences WHERE id = ? AND deleted = 0', [id]);
  if (!rec) return { configured: false, cents: 0, day: 5, recurrenceId: null };
  return { configured: true, cents: rec.amount_cents, day: rec.due_day, recurrenceId: rec.id, active: rec.active === 1 };
}

// applyFrom = mês (YYYY-MM) a partir do qual o novo valor vale. Meses anteriores
// (já abertos) mantêm o salário antigo; deste mês pra frente passa a ser o novo.
export function saveSalary({ cents, day, applyFrom = currentMonth() }) {
  const current = getSalary();
  const salaryCat = findCategory('Salário', 'income');
  const id = saveRecurrence({
    id: current.recurrenceId,
    kind: 'income',
    name: 'Salário',
    amountCents: cents,
    dueDay: day,
    categoryId: salaryCat?.id ?? null,
    remindDays: 0,
    active: true,
    startMonth: current.recurrenceId ? undefined : applyFrom,
  });
  setSetting('salary_recurrence_id', id);

  // Atualiza o salário já lançado nos meses abertos a partir de applyFrom.
  db.runSync(
    `UPDATE transactions SET amount_cents = ?, updated_at = ?
     WHERE recurrence_id = ? AND deleted = 0 AND substr(date, 1, 7) >= ?`,
    [cents, nowIso(), id, applyFrom]
  );

  materializeOpenMonths();
  return id;
}

// Define o salário recebido NAQUELE mês (usado ao abrir um mês). Se ainda não há
// salário configurado, cria como padrão a partir deste mês; senão, ajusta só
// este mês sem mexer nos anteriores.
export function setMonthSalary(month, cents) {
  let { recurrenceId } = getSalary();
  if (!recurrenceId) {
    // Primeira vez: cria o salário (vira o padrão daqui pra frente) e já joga
    // o valor nos meses abertos a partir deste mês.
    recurrenceId = saveSalary({ cents, day: 5, applyFrom: month });
  }
  const tx = getSalaryTransaction(month);
  if (tx) {
    db.runSync('UPDATE transactions SET amount_cents = ?, updated_at = ? WHERE id = ?', [cents, nowIso(), tx.id]);
  } else {
    const rec = db.getFirstSync('SELECT * FROM recurrences WHERE id = ?', [recurrenceId]);
    if (rec) {
      saveTransaction({
        kind: 'income',
        amountCents: cents,
        date: dueDateFor(month, rec.due_day),
        categoryId: rec.category_id,
        description: 'Salário',
        paid: 0,
        recurrenceId,
      });
    }
  }
}

// O lançamento do salário no mês (pra mostrar/editar só aquele mês).
export function getSalaryTransaction(month) {
  const { recurrenceId } = getSalary();
  if (!recurrenceId) return null;
  return db.getFirstSync(
    `SELECT * FROM transactions WHERE deleted = 0 AND recurrence_id = ? AND substr(date, 1, 7) = ?`,
    [recurrenceId, month]
  );
}
