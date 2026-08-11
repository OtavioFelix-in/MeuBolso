// Lembretes locais com expo-notifications — não precisa de servidor.
//
// IMPORTANTE: no Expo Go (Android, SDK 53+) o módulo quebra só de ser importado.
// Por isso o require é condicional: dentro do Expo Go os lembretes ficam
// desativados; no APK/build de desenvolvimento funcionam normalmente.

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import * as db from '../db';
import { addMonths, currentMonth, formatDate, reminderDate, today } from '../utils/date';
import { formatMoney } from '../utils/money';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!isExpoGo) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const notificationsAvailable = () => Notifications !== null;

export async function setupNotifications() {
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('financeiro', {
      name: 'Lembretes financeiros',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleAt(date, title, body) {
  if (!Notifications || date <= new Date()) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'financeiro',
    },
  });
}

async function scheduleDaily(hour, minute, title, body) {
  if (!Notifications) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'financeiro',
    },
  });
}

async function scheduleMonthly(day, hour, title, body) {
  if (!Notifications) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour,
      minute: 0,
      channelId: 'financeiro',
    },
  });
}

export async function cancelReminder(notificationId) {
  if (Notifications && notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

// Reagenda TUDO do zero. É chamado na abertura do app e depois de mexer em
// contas fixas/parcelas — mais simples (e mais confiável) do que tentar
// sincronizar lembrete por lembrete.
export async function refreshReminders() {
  if (!Notifications) return { scheduled: 0, available: false };

  await Notifications.cancelAllScheduledNotificationsAsync();
  let scheduled = 0;

  if (db.getSetting('notif_bills', '1') === '1') {
    scheduled += await scheduleBillReminders();
  }
  if (db.getSetting('notif_daily', '0') === '1') {
    await scheduleDaily(
      20,
      0,
      'Como foi o dia? 💸',
      'Registre os gastos de hoje antes de esquecer.'
    );
    scheduled++;
  }
  if (db.getSetting('notif_invest', '1') === '1') {
    await scheduleMonthly(
      5,
      10,
      'Hora de investir 📈',
      'Já fez o aporte do mês? Registre no Meu Bolso.'
    );
    scheduled++;
  }
  if (db.getSetting('notif_goals', '1') === '1') {
    await scheduleMonthly(
      1,
      10,
      'Suas metas te esperam 🎯',
      'Comece o mês guardando um pouquinho pra cada objetivo.'
    );
    scheduled++;
  }
  if (db.getSetting('notif_smart', '0') === '1') {
    scheduled += await scheduleSmartAlerts();
  }
  if (db.getSetting('notif_weekly', '1') === '1') {
    const id = await scheduleWeeklySummary();
    if (id) scheduled++;
  }

  return { scheduled, available: true };
}

// ---- Notificações inteligentes: orçamento de disparo ----
// Regras (ver SPRINT3.md): no máx. 3 por semana, gap mínimo de 48h entre elas.
// O log de envio fica em settings e NÃO é limpo pelo cancelamento geral de
// refreshReminders (que só mexe nas notificações agendadas, não no histórico).

const SMART_WEEKLY_LIMIT = 3;
const SMART_GAP_MS = 48 * 60 * 60 * 1000;
const SMART_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getSmartLog() {
  try {
    const log = JSON.parse(db.getSetting('notif_smart_log', '[]'));
    return Array.isArray(log) ? log.filter((t) => Date.now() - t < SMART_WEEK_MS) : [];
  } catch {
    return [];
  }
}

function canSendSmart(log) {
  if (log.length >= SMART_WEEKLY_LIMIT) return false;
  const last = log[log.length - 1];
  return !last || Date.now() - last >= SMART_GAP_MS;
}

function recordSmart(log) {
  db.setSetting('notif_smart_log', JSON.stringify([...log, Date.now()]));
}

// Prioridade: ritmo estourando > gasto atípico > uso de cartão alto.
// Cada refresh manda no máximo UM alerta inteligente (o de maior prioridade
// disponível), respeitando o orçamento — evita virar parede de notificação.
async function scheduleSmartAlerts() {
  let log = getSmartLog();
  if (!canSendSmart(log)) return 0;

  const month = currentMonth();
  const pace = db.getMonthPace(month);
  const profile = db.getFinancialProfile(month, 6);
  const topAnomaly = db.getAnomalies(month, 3)[0];
  const hotCard = db.getCardsWithUsage(month).find((c) => c.usage_percent > 80);

  let candidate = null;
  if (pace.isCurrent && pace.dayNow >= 10 && profile.avgExpense > 0 && pace.projection > profile.avgExpense * 1.2) {
    candidate = {
      title: 'Ritmo do mês acima do normal 🔥',
      body: `No ritmo atual, deve fechar em ${formatMoney(pace.projection)}, acima da sua média.`,
    };
  } else if (topAnomaly) {
    candidate = {
      title: 'Gasto fora do padrão 🚨',
      body: `${formatMoney(topAnomaly.amount_cents)} em ${topAnomaly.category_name || 'uma categoria'} — bem acima do seu normal.`,
    };
  } else if (hotCard) {
    candidate = {
      title: 'Cartão perto do limite 💳',
      body: `${hotCard.name} já usou ${hotCard.usage_percent.toFixed(0)}% do limite.`,
    };
  }

  if (!candidate) return 0;

  // Dispara na hora (trigger: null), não daqui a alguns minutos: um refresh
  // seguinte (ex.: depois de salvar um lançamento, que também chama
  // refreshReminders) cancela tudo que ainda está pendente — se o alerta
  // ainda não tivesse disparado, sumiria sem avisar, mas o orçamento já teria
  // contado como enviado.
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: candidate.title, body: candidate.body, sound: 'default' },
    trigger: null,
  });
  if (id) recordSmart(log);
  return id ? 1 : 0;
}

// Resumo semanal: sempre reagendado pro próximo domingo às 20h, com o número
// calculado na hora (não é um trigger recorrente do SO, que teria conteúdo parado).
async function scheduleWeeklySummary() {
  const when = new Date();
  const daysUntilSunday = (7 - when.getDay()) % 7;
  when.setDate(when.getDate() + daysUntilSunday);
  when.setHours(20, 0, 0, 0);
  // Se hoje já é domingo e já passou das 20h, pula pro domingo seguinte.
  if (when <= new Date()) when.setDate(when.getDate() + 7);

  const week = db.getWeekSummary();
  const comparison =
    week.weeklyAverage > 0
      ? `${Math.abs(week.delta).toFixed(0)}% ${week.delta > 0 ? 'acima' : 'abaixo'} da sua média`
      : 'ainda sem média pra comparar';

  return scheduleAt(when, 'Resumo da semana 📆', `Você gastou ${formatMoney(week.spent)} — ${comparison}.`);
}

// Um lembrete por vencimento em aberto nos próximos 60 dias.
async function scheduleBillReminders() {
  const limit = `${addMonths(currentMonth(), 2)}-01`;
  const upcoming = db.getUpcoming(limit);
  const remindDays = Object.fromEntries(
    db.getRecurrences().map((r) => [r.id, r.remind_days])
  );

  let count = 0;
  for (const tx of upcoming) {
    const days = tx.recurrence_id ? (remindDays[tx.recurrence_id] ?? 3) : 1;
    const when = reminderDate(tx.date, days);
    const isBill = Boolean(tx.recurrence_id);
    const label = tx.description || tx.category_name || 'Lançamento';

    const id = await scheduleAt(
      when,
      isBill ? `${label} vence logo 🔔` : `Parcela chegando 💳`,
      `${formatMoney(tx.amount_cents)} · vence em ${formatDate(tx.date)}`
    );
    if (id) count++;
  }

  // Alerta extra pro que já está atrasado: avisa hoje mesmo, mais tarde.
  const overdue = upcoming.filter((tx) => tx.date < today());
  if (overdue.length > 0) {
    const total = overdue.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const when = new Date();
    when.setHours(when.getHours() + 1, 0, 0, 0);
    const id = await scheduleAt(
      when,
      `${overdue.length} ${overdue.length === 1 ? 'conta atrasada' : 'contas atrasadas'} ⚠️`,
      `${formatMoney(total)} esperando pagamento.`
    );
    if (id) count++;
  }

  return count;
}
