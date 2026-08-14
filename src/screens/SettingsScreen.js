// Ajustes: contas, categorias, notificações, tema e backup.

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { notificationsAvailable, refreshReminders, setupNotifications } from '../notifications/notifications';
import { authenticate, canUseLock, isLockEnabled, setLockEnabled } from '../security/auth';
import { FONT_SCALES, MODE_EMOJI, MODE_LABEL, useTheme } from '../theme-context';
import { exportBackup, exportSpreadsheet, importBackup } from '../utils/backup';
import { formatMoney } from '../utils/money';
import { LegalSheet, ProfileSheet } from '../components/SettingsSheets';
import { SwitchRow } from '../components/fields';
import {
  Button,
  Card,
  Divider,
  Header,
  IconBubble,
  Muted,
  SectionTitle,
  Segmented,
  Sheet,
} from '../components/ui';

export default function SettingsScreen({ visible, onClose, onResetApp }) {
  const { colors, mode, cycleMode, highContrast, setHighContrast, fontScaleKey, setFontScale, resetAppearance } = useTheme();
  const { refresh } = useApp();

  const [tick, setTick] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [legal, setLegal] = useState(null); // null | 'privacy' | 'terms'
  const [busy, setBusy] = useState(false);
  const [lockOn, setLockOn] = useState(() => isLockEnabled());
  const [lockAvailable, setLockAvailable] = useState(false);

  useEffect(() => {
    canUseLock().then(setLockAvailable);
  }, []);

  async function toggleLock(value) {
    if (value) {
      const ok = await authenticate('Confirme pra ativar a proteção');
      if (!ok) return;
      setLockEnabled(true);
      setLockOn(true);
    } else {
      setLockEnabled(false);
      setLockOn(false);
    }
  }

  const reload = () => {
    setTick((t) => t + 1);
    refresh();
  };

  const notif = {
    bills: db.getSetting('notif_bills', '1') === '1',
    daily: db.getSetting('notif_daily', '0') === '1',
    invest: db.getSetting('notif_invest', '1') === '1',
    goals: db.getSetting('notif_goals', '1') === '1',
    smart: db.getSetting('notif_smart', '0') === '1',
    weekly: db.getSetting('notif_weekly', '1') === '1',
  };

  async function toggleNotif(key, value) {
    db.setSetting(`notif_${key}`, value ? '1' : '0');
    setTick((t) => t + 1);
    if (value) await setupNotifications();
    await refreshReminders();
  }

  async function handleExport(kind) {
    setBusy(true);
    try {
      if (kind === 'json') await exportBackup();
      else await exportSpreadsheet();
    } catch (e) {
      Alert.alert('Não deu pra exportar', 'Algo deu errado ao gerar o arquivo. Tente de novo em instantes.');
    } finally {
      setBusy(false);
    }
  }

  function handleImport() {
    Alert.alert('Importar backup', 'Isso substitui TODOS os dados atuais pelos do arquivo. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Importar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            if (await importBackup()) {
              reload();
              Alert.alert('Pronto! 💾', 'Backup restaurado com sucesso.');
            }
          } catch (e) {
            Alert.alert('Arquivo inválido', 'Esse arquivo não parece um backup do Meu Bolso.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function handleWipe() {
    Alert.alert(
      'Apagar todos os dados?',
      'Isso remove TUDO do aparelho: lançamentos, contas, categorias, salário e configurações. Não dá pra desfazer. Se quiser guardar, exporte um backup antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () => {
            db.wipeAllData();
            db.ensureCurrentMonthOpen();
            onClose?.();
            onResetApp?.();
          },
        },
      ]
    );
  }

  const userName = db.getUserName();

  return (
    <Sheet visible={visible} onClose={onClose} title="Ajustes" height="94%">
      <SectionTitle>Perfil</SectionTitle>
      <Card onPress={() => setProfileOpen(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBubble emoji="👤" color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{userName || 'Seu nome'}</Text>
            <Muted size={12}>Toque pra editar como o app te chama.</Muted>
          </View>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>editar</Text>
        </View>
      </Card>

      <SectionTitle>Aparência</SectionTitle>
      <Card onPress={cycleMode}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBubble emoji={MODE_EMOJI[mode]} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Tema: {MODE_LABEL[mode]}</Text>
            <Muted size={12}>Toque pra alternar entre automático, escuro e claro.</Muted>
          </View>
        </View>
      </Card>

      <View style={{ marginTop: 10 }}>
        <SwitchRow
          emoji="🌗"
          label="Alto contraste"
          hint="Cores mais fortes e bordas mais visíveis, pra facilitar a leitura."
          value={highContrast}
          onChange={setHighContrast}
        />
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 6, marginBottom: 8 }}>
        Tamanho da fonte
      </Text>
      <Segmented
        options={FONT_SCALES.map((f) => ({ key: f.key, label: f.label }))}
        value={fontScaleKey}
        onChange={setFontScale}
      />

      <Button title="Restaurar aparência padrão" variant="ghost" style={{ marginTop: 12 }} onPress={resetAppearance} />

      <Card style={{ marginTop: 12 }}>
        <Muted size={12}>
          💼 Renda fixa (salário) e as contas correntes/carteira agora ficam na aba{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>Carteira</Text>, junto com investimentos e cartões.
        </Muted>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Muted size={12}>
          🏷️ Categorias agora ficam junto de onde você usa: as de{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>despesa</Text> em Despesas, as de{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>receita</Text> na Carteira.
        </Muted>
      </Card>

      <SectionTitle>Notificações</SectionTitle>
      {!notificationsAvailable() ? (
        <Card style={{ marginBottom: 12 }}>
          <Muted size={12}>
            No Expo Go os lembretes ficam desligados por limitação do próprio Expo. Eles funcionam
            normalmente no APK gerado.
          </Muted>
        </Card>
      ) : null}
      <SwitchRow
        emoji="🔔"
        label="Contas vencendo"
        hint="Avisa alguns dias antes de cada conta fixa e parcela."
        value={notif.bills}
        onChange={(v) => toggleNotif('bills', v)}
      />
      <SwitchRow
        emoji="✍️"
        label="Lembrete diário"
        hint="Todo dia às 20h, pra registrar os gastos antes de esquecer."
        value={notif.daily}
        onChange={(v) => toggleNotif('daily', v)}
      />
      <SwitchRow
        emoji="📈"
        label="Aporte mensal"
        hint="Dia 5 de cada mês, pra lembrar de investir."
        value={notif.invest}
        onChange={(v) => toggleNotif('invest', v)}
      />
      <SwitchRow
        emoji="🎯"
        label="Metas"
        hint="Todo dia 1º, pra guardar um pouquinho pra cada objetivo."
        value={notif.goals}
        onChange={(v) => toggleNotif('goals', v)}
      />
      <SwitchRow
        emoji="🧠"
        label="Alertas de gasto"
        hint="Ritmo do mês acima do normal, gasto atípico ou cartão perto do limite. No máx. 3 por semana."
        value={notif.smart}
        onChange={(v) => toggleNotif('smart', v)}
      />
      <SwitchRow
        emoji="📆"
        label="Resumo semanal"
        hint="Todo domingo às 20h, quanto você gastou na semana vs. sua média."
        value={notif.weekly}
        onChange={(v) => toggleNotif('weekly', v)}
      />
      <Button
        title="Reagendar lembretes agora"
        variant="ghost"
        onPress={async () => {
          const result = await refreshReminders();
          Alert.alert(
            result.available ? 'Prontinho ✅' : 'Indisponível aqui',
            result.available
              ? `${result.scheduled} ${result.scheduled === 1 ? 'lembrete agendado' : 'lembretes agendados'}.`
              : 'Os lembretes só funcionam fora do Expo Go.'
          );
        }}
      />

      <SectionTitle>Segurança</SectionTitle>
      {lockAvailable ? (
        <SwitchRow
          emoji="🔒"
          label="Bloquear o app"
          hint="Pede biometria ou o desbloqueio do aparelho ao abrir e ao voltar depois de 1 min."
          value={lockOn}
          onChange={toggleLock}
        />
      ) : (
        <Card style={{ marginBottom: 12 }}>
          <Muted size={12}>
            Configure uma biometria ou bloqueio de tela no seu aparelho pra poder proteger o Meu Bolso.
          </Muted>
        </Card>
      )}

      <SectionTitle>Seus dados</SectionTitle>
      <Card>
        <Muted size={12}>
          Tudo fica salvo só no seu aparelho. Exporte de vez em quando — é seu seguro contra perder o
          celular.
        </Muted>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button title="Exportar backup (.json)" icon="💾" onPress={() => handleExport('json')} loading={busy} />
          <Button title="Exportar planilha (.csv)" icon="📊" variant="soft" onPress={() => handleExport('csv')} />
          <Button title="Importar backup" icon="📥" variant="ghost" onPress={handleImport} />
          <Button title="Apagar todos os dados" icon="🗑️" variant="danger" onPress={handleWipe} />
        </View>
      </Card>

      <SectionTitle>Sobre</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Meu Bolso</Text>
        <Muted size={12} style={{ marginTop: 4 }}>
          Controle financeiro manual, offline e sem anúncios. Seus dados ficam só no seu aparelho.
        </Muted>
        <Muted size={12} style={{ marginTop: 8 }}>Versão 1.0.0</Muted>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button title="Política de privacidade" variant="ghost" onPress={() => setLegal('privacy')} />
          <Button title="Termos de uso" variant="ghost" onPress={() => setLegal('terms')} />
        </View>
      </Card>

      <ProfileSheet visible={profileOpen} initial={userName} onClose={() => setProfileOpen(false)} onSaved={reload} />

      <LegalSheet type={legal} onClose={() => setLegal(null)} />
    </Sheet>
  );
}
