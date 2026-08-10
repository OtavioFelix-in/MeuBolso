// Exportar/importar tudo. O backup é um JSON com as tabelas cruas, então dá pra
// restaurar em outro aparelho sem perder id nenhum.

import { db, nowIso } from './core';

const TABLES = [
  'accounts',
  'cards',
  'categories',
  'transactions',
  'recurrences',
  'installments',
  'goals',
  'goal_deposits',
  'investments',
  'investment_moves',
  'assets',
  'events',
  'open_months',
  'settings',
];

export function exportAll() {
  const data = {};
  for (const table of TABLES) {
    data[table] = db.getAllSync(`SELECT * FROM ${table}`);
  }
  return { app: 'MeuBolso', version: 1, exported_at: nowIso(), data };
}

export function importAll(backup) {
  const data = backup?.data;
  if (!data || !Array.isArray(data.transactions)) {
    throw new Error('Arquivo de backup inválido');
  }

  db.execSync('BEGIN');
  try {
    for (const table of TABLES) {
      db.runSync(`DELETE FROM ${table}`);
      for (const row of data[table] ?? []) {
        const cols = Object.keys(row);
        db.runSync(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => row[c])
        );
      }
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}

// Planilha de lançamentos pra abrir no Excel/Sheets.
export function exportCsv() {
  const rows = db.getAllSync(`
    SELECT t.date, t.kind, t.amount_cents, t.description, t.payment_method, t.paid,
      COALESCE(p.name, c.name, '') AS categoria,
      CASE WHEN p.name IS NULL THEN '' ELSE c.name END AS subcategoria,
      COALESCE(a.name, '') AS conta
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.deleted = 0
    ORDER BY t.date
  `);

  const header = 'Data;Tipo;Valor;Categoria;Subcategoria;Conta;Forma;Descrição;Situação';
  const lines = rows.map((r) =>
    [
      r.date,
      r.kind === 'income' ? 'Receita' : 'Despesa',
      (r.amount_cents / 100).toFixed(2).replace('.', ','),
      r.categoria,
      r.subcategoria,
      r.conta,
      r.payment_method ?? '',
      (r.description ?? '').replace(/[;\n\r]/g, ' '),
      r.paid ? 'Confirmado' : 'Previsto',
    ].join(';')
  );

  return [header, ...lines].join('\n');
}
