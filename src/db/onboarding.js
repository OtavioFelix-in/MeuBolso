// Primeiro acesso: guarda o nome do usuário e aplica as escolhas iniciais
// (contas com o saldo de hoje, dinheiro em espécie e salário). É retomável — o
// passo atual fica salvo em settings, então se o app fechar no meio, volta de
// onde parou. Cada passo grava na hora, então nada se perde.

import { getSetting, setSetting } from './core';
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

// Aplica o salário informado no onboarding (vira a recorrência de renda fixa).
export function setOnboardingSalary(cents, day, accountId) {
  if (!cents || cents <= 0) return;
  saveSalary({ cents, day: day || 5, accountId });
}

export function finishOnboarding() {
  setSetting('onboarding_done', '1');
}
