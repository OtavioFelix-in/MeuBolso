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

  return { scheduled, available: true };
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
