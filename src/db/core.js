// Conexão com o SQLite local (expo-sqlite, API síncrona do SDK 57) e criação
// do schema. Tudo fica no aparelho — o app funciona 100% offline.
//
// Convenções que valem pro banco inteiro:
//   * dinheiro em CENTAVOS, sempre INTEGER (nunca REAL);
//   * data de lançamento em 'YYYY-MM-DD' (hora local), mês em 'YYYY-MM';
//   * toda tabela tem uuid + updated_at + deleted (soft delete), pra um dia
//     dar pra sincronizar entre aparelhos sem repensar o modelo.

import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../theme';

export const db = SQLite.openDatabaseSync('meubolso.db');

export const newUuid = () => Crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

export function addColumnIfMissing(table, name, definition) {
  const columns = db.getAllSync(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === name)) {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'corrente',
      emoji TEXT NOT NULL DEFAULT '🏦',
      color TEXT NOT NULL DEFAULT '#4C6FFF',
      initial_cents INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      parent_id INTEGER,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'expense',
      emoji TEXT NOT NULL DEFAULT '📦',
      color TEXT NOT NULL DEFAULT '#697586',
      position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      kind TEXT NOT NULL DEFAULT 'expense',
      amount_cents INTEGER NOT NULL,
      date TEXT NOT NULL,
      category_id INTEGER,
      account_id INTEGER,
      payment_method TEXT,
      description TEXT,
      receipt_uri TEXT,
      card_id INTEGER,
      paid INTEGER NOT NULL DEFAULT 1,
      off_budget INTEGER NOT NULL DEFAULT 0,
      recurrence_id INTEGER,
      installment_id INTEGER,
      installment_no INTEGER,
      installment_total INTEGER,
      notification_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      kind TEXT NOT NULL DEFAULT 'expense',
      name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      due_day INTEGER NOT NULL DEFAULT 1,
      category_id INTEGER,
      account_id INTEGER,
      payment_method TEXT,
      remind_days INTEGER NOT NULL DEFAULT 3,
      variable INTEGER NOT NULL DEFAULT 0,
      period TEXT NOT NULL DEFAULT 'monthly',
      card_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      start_month TEXT,
      end_month TEXT,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      description TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      count INTEGER NOT NULL,
      first_date TEXT NOT NULL,
      category_id INTEGER,
      account_id INTEGER,
      payment_method TEXT,
      off_budget INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🎯',
      color TEXT NOT NULL DEFAULT '#00A870',
      target_cents INTEGER NOT NULL DEFAULT 0,
      deadline TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS goal_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      goal_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'cdb',
      color TEXT NOT NULL DEFAULT '#4C6FFF',
      current_cents INTEGER NOT NULL DEFAULT 0,
      target_cents INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS investment_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      investment_id INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'aporte',
      amount_cents INTEGER NOT NULL,
      date TEXT NOT NULL,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'outro',
      emoji TEXT NOT NULL DEFAULT '📦',
      value_cents INTEGER NOT NULL DEFAULT 0,
      purchase_cents INTEGER NOT NULL DEFAULT 0,
      acquired_at TEXT,
      note TEXT,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🗓️',
      date TEXT NOT NULL,
      description TEXT,
      planned_cents INTEGER NOT NULL DEFAULT 0,
      spent_cents INTEGER NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      limit_cents INTEGER NOT NULL DEFAULT 0,
      closing_day INTEGER,
      due_day INTEGER,
      color TEXT NOT NULL DEFAULT '#7C5CFC',
      position INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS open_months (
      month TEXT PRIMARY KEY,
      opened_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions (date);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions (category_id);
    CREATE INDEX IF NOT EXISTS idx_tx_installment ON transactions (installment_id);
    CREATE INDEX IF NOT EXISTS idx_tx_recurrence ON transactions (recurrence_id);
    CREATE INDEX IF NOT EXISTS idx_deposits_goal ON goal_deposits (goal_id);
    CREATE INDEX IF NOT EXISTS idx_moves_investment ON investment_moves (investment_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
  `);

  runMigrations();
  seedIfEmpty();
}

// Colunas novas para bancos que já existiam antes desta versão.
function runMigrations() {
  addColumnIfMissing('transactions', 'off_budget', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('installments', 'off_budget', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('installments', 'note', 'TEXT');
  addColumnIfMissing('assets', 'purchase_cents', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('transactions', 'card_id', 'INTEGER');
  addColumnIfMissing('recurrences', 'period', "TEXT NOT NULL DEFAULT 'monthly'");
  addColumnIfMissing('recurrences', 'card_id', 'INTEGER');
  addColumnIfMissing('categories', 'essential', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('investments', 'liquid', 'INTEGER NOT NULL DEFAULT 1');
}

// Primeira abertura: cria as categorias e contas padrão. Se a pessoa apagar
// tudo depois, não recriamos (a flag fica salva em settings).
function seedIfEmpty() {
  if (getSetting('seeded') === '1') return;

  for (const kind of ['expense', 'income']) {
    DEFAULT_CATEGORIES[kind].forEach((cat, i) => {
      const parentId = insertCategory({
        name: cat.name,
        kind,
        emoji: cat.emoji,
        color: cat.color,
        position: i,
        parentId: null,
        essential: cat.essential ? 1 : 0,
      });
      cat.subs.forEach((sub, j) => {
        insertCategory({
          name: sub,
          kind,
          emoji: cat.emoji,
          color: cat.color,
          position: j,
          parentId,
        });
      });
    });
  }

  DEFAULT_ACCOUNTS.forEach((acc, i) => {
    db.runSync(
      `INSERT INTO accounts (uuid, name, type, emoji, color, initial_cents, position, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [newUuid(), acc.name, acc.type, acc.emoji, acc.color, i, nowIso()]
    );
  });

  setSetting('seeded', '1');
}

function insertCategory({ name, kind, emoji, color, position, parentId, essential = 0 }) {
  const result = db.runSync(
    `INSERT INTO categories (uuid, parent_id, name, kind, emoji, color, position, essential, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newUuid(), parentId, name, kind, emoji, color, position, essential, nowIso()]
  );
  return result.lastInsertRowId;
}

// Apaga TODOS os dados do app: zera todas as tabelas (inclusive settings, o que
// remove nome, salário, flags de onboarding e trava) e recria só as categorias e
// contas padrão. Depois disso o app volta ao estado de primeiro acesso.
export function wipeAllData() {
  const tables = [
    'transactions', 'recurrences', 'installments', 'goal_deposits', 'goals',
    'investment_moves', 'investments', 'assets', 'events', 'cards',
    'categories', 'accounts', 'open_months', 'settings',
  ];
  db.withTransactionSync(() => {
    for (const table of tables) {
      db.runSync(`DELETE FROM ${table}`);
    }
  });
  seedIfEmpty();
}

// ---- Settings (chave/valor) ----

export function getSetting(key, fallback = null) {
  const row = db.getFirstSync('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)]
  );
}

// ---- Helpers usados pelos módulos de domínio ----

export function softDelete(table, id) {
  db.runSync(`UPDATE ${table} SET deleted = 1, updated_at = ? WHERE id = ?`, [nowIso(), id]);
}

// INSERT/UPDATE a partir de um objeto {coluna: valor}, cuidando de uuid e
// updated_at. Retorna o id da linha.
export function save(table, id, fields) {
  const data = { ...fields, updated_at: nowIso() };
  const cols = Object.keys(data);

  if (id) {
    db.runSync(
      `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...cols.map((c) => data[c]), id]
    );
    return id;
  }

  const result = db.runSync(
    `INSERT INTO ${table} (uuid, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`,
    [newUuid(), ...cols.map((c) => data[c])]
  );
  return result.lastInsertRowId;
}
