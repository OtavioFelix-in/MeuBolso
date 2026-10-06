// Cadastros de apoio: contas e categorias.

import { CASH_ACCOUNT } from '../theme';
import { db, getSetting, nowIso, save, softDelete } from './core';

// ---- Contas ----

export function getAccounts({ includeArchived = false } = {}) {
  return db.getAllSync(
    `SELECT * FROM accounts WHERE deleted = 0 ${includeArchived ? '' : 'AND archived = 0'}
     ORDER BY (type = 'dinheiro'), position, id`
  );
}

// Saldo por conta = saldo inicial + o que já entrou - o que já saiu (só pagos).
export function getAccountsWithBalance() {
  return db.getAllSync(`
    SELECT a.*,
      a.initial_cents + COALESCE((
        SELECT SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents ELSE -t.amount_cents END)
        FROM transactions t
        WHERE t.account_id = a.id AND t.deleted = 0 AND t.paid = 1
      ), 0) AS balance_cents
    FROM accounts a
    WHERE a.deleted = 0 AND a.archived = 0
    ORDER BY (a.type = 'dinheiro'), a.position, a.id
  `);
}

export function saveAccount({ id, name, type, color, initialCents }) {
  return save('accounts', id, {
    name,
    type,
    color,
    initial_cents: initialCents,
  });
}

export function getDefaultAccountId() {
  const lastId = Number(getSetting('last_account', 0)) || 0;
  const accounts = getAccounts();
  if (accounts.some((a) => a.id === lastId)) return lastId;
  return accounts[0]?.id ?? null;
}

export function getCashAccount() {
  return db.getFirstSync(
    "SELECT * FROM accounts WHERE deleted = 0 AND archived = 0 AND type = 'dinheiro' ORDER BY position, id LIMIT 1"
  );
}

export function setCashAccount(cents) {
  const cash = getCashAccount();
  return save('accounts', cash?.id, {
    name: cash?.name ?? CASH_ACCOUNT.name,
    type: 'dinheiro',
    color: cash?.color ?? CASH_ACCOUNT.color,
    initial_cents: cents,
  });
}

export function removeCashAccount() {
  const cash = getCashAccount();
  if (cash && countAccountUse(cash.id) === 0) softDelete('accounts', cash.id);
}

export function countAccountUse(id) {
  return (
    db.getFirstSync('SELECT COUNT(*) AS total FROM transactions WHERE deleted = 0 AND account_id = ?', [id])?.total ?? 0
  );
}

export function deleteAccount(id, moveToId = null) {
  db.withTransactionSync(() => {
    if (moveToId) {
      const now = nowIso();
      const acc = db.getFirstSync('SELECT initial_cents FROM accounts WHERE id = ?', [id]);
      db.runSync('UPDATE accounts SET initial_cents = initial_cents + ?, updated_at = ? WHERE id = ?', [
        acc?.initial_cents ?? 0,
        now,
        moveToId,
      ]);
      for (const table of ['transactions', 'recurrences', 'installments']) {
        db.runSync(`UPDATE ${table} SET account_id = ?, updated_at = ? WHERE account_id = ?`, [moveToId, now, id]);
      }
    }
    softDelete('accounts', id);
  });
}

// ---- Categorias ----

// Categorias-mãe com as subcategorias aninhadas, prontas pro seletor.
export function getCategoryTree(kind) {
  const rows = db.getAllSync(
    'SELECT * FROM categories WHERE deleted = 0 AND kind = ? ORDER BY position, id',
    [kind]
  );
  const parents = rows.filter((r) => !r.parent_id);
  return parents.map((parent) => ({
    ...parent,
    subs: rows.filter((r) => r.parent_id === parent.id),
  }));
}

export function getCategories(kind = null) {
  if (kind) {
    return db.getAllSync(
      'SELECT * FROM categories WHERE deleted = 0 AND kind = ? ORDER BY position, id',
      [kind]
    );
  }
  return db.getAllSync('SELECT * FROM categories WHERE deleted = 0 ORDER BY kind, position, id');
}

export function getCategory(id) {
  if (!id) return null;
  return db.getFirstSync('SELECT * FROM categories WHERE id = ?', [id]);
}

export function saveCategory({ id, name, kind, emoji, color, parentId = null, essential = 0 }) {
  return save('categories', id, {
    name,
    kind,
    emoji,
    color,
    parent_id: parentId,
    essential: essential ? 1 : 0,
  });
}

export function deleteCategory(id) {
  softDelete('categories', id);
  const subs = db.getAllSync('SELECT id FROM categories WHERE parent_id = ? AND deleted = 0', [id]);
  for (const sub of subs) softDelete('categories', sub.id);
}

export function countCategoryUse(id) {
  return db.getFirstSync(
    `SELECT COUNT(*) AS n FROM transactions
     WHERE deleted = 0 AND (category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?))`,
    [id, id]
  ).n;
}
