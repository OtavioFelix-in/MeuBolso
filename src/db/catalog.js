// Cadastros de apoio: contas e categorias.

import { db, nowIso, save, softDelete } from './core';

// ---- Contas ----

export function getAccounts({ includeArchived = false } = {}) {
  return db.getAllSync(
    `SELECT * FROM accounts WHERE deleted = 0 ${includeArchived ? '' : 'AND archived = 0'}
     ORDER BY position, id`
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
    ORDER BY a.position, a.id
  `);
}

export function saveAccount({ id, name, type, emoji, color, initialCents }) {
  return save('accounts', id, {
    name,
    type,
    emoji,
    color,
    initial_cents: initialCents,
  });
}

export function deleteAccount(id) {
  softDelete('accounts', id);
  db.runSync('UPDATE transactions SET account_id = NULL, updated_at = ? WHERE account_id = ?', [
    nowIso(),
    id,
  ]);
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

export function saveCategory({ id, name, kind, emoji, color, parentId = null }) {
  return save('categories', id, {
    name,
    kind,
    emoji,
    color,
    parent_id: parentId,
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
