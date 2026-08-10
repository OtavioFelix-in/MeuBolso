// Primeiro acesso: guarda o nome do usuário e aplica as escolhas iniciais
// (saldo da conta e salário). É retomável — o passo atual fica salvo em settings,
// então se o app fechar no meio, volta de onde parou. Cada passo grava na hora,
// então nada se perde.

import { db, getSetting, nowIso, setSetting } from './core';
import { saveSalary } from './budget';

export function isOnboardingDone() {
  return getSetting('onboarding_done') === '1';
}

export function getOnboardingStep() {
  return Number(getSetting('onboarding_step', 0)) || 0;
}

export function setOnboardingStep(step) {
  setSetting('onboarding_step', step);
}

export function getUserName() {
  return (getSetting('user_name', '') || '').trim();
}

// Primeiro nome, para a saudação ("Boa tarde, João").
export function getFirstName() {
  const name = getUserName();
  return name ? name.split(/\s+/)[0] : '';
}

export function setUserName(name) {
  setSetting('user_name', (name || '').trim());
}

// Define o saldo inicial da conta corrente padrão (a primeira "corrente" que
// existir; senão, a primeira conta). Só mexe se vier um valor > 0, pra não
// zerar o saldo de quem já usava o app.
export function setInitialBalance(cents) {
  if (!cents || cents <= 0) return;
  const acc = db.getFirstSync(
    `SELECT id FROM accounts WHERE deleted = 0 AND archived = 0
     ORDER BY (type = 'corrente') DESC, position, id LIMIT 1`
  );
  if (acc) {
    db.runSync('UPDATE accounts SET initial_cents = ?, updated_at = ? WHERE id = ?', [cents, nowIso(), acc.id]);
  }
}

// Aplica o salário informado no onboarding (vira a recorrência de renda fixa).
export function setOnboardingSalary(cents, day) {
  if (!cents || cents <= 0) return;
  saveSalary({ cents, day: day || 5 });
}

export function finishOnboarding() {
  setSetting('onboarding_done', '1');
}
