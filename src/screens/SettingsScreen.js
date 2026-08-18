// Ajustes: menu de grupos (Aparência, Notificações, Segurança, Dados, Sobre)
// que abrem dentro do mesmo sheet, com botão voltar — em vez de uma lista
// só, infinita, com ícone em cada linha.

import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { notificationsAvailable, refreshReminders, setupNotifications } from '../notifications/notifications';
import { authenticate, canUseLock, isLockEnabled, setLockEnabled } from '../security/auth';
import { FONT_FAMILY } from '../theme';
import { FONT_SCALES, MODE_LABEL, useTheme } from '../theme-context';
import { exportBackup, exportSpreadsheet, importBackup } from '../utils/backup';
import { LegalSheet, ProfileSheet } from '../components/SettingsSheets';
import { SwitchRow } from '../components/fields';
import { Button, Card, Divider, IconBubble, Muted, Segmented, Sheet } from '../components/ui';

const NOTIF_KEYS = [
  { key: 'bills', label: 'Contas vencendo', hint: 'Avisa alguns dias antes de cada conta fixa e parcela.', default: '1' },
  { key: 'daily', label: 'Lembrete diário', hint: 'Todo dia às 20h, pra registrar os gastos antes de esquecer.', default: '0' },
  { key: 'invest', label: 'Aporte mensal', hint: 'Dia 5 de cada mês, pra lembrar de investir.', default: '1' },
  { key: 'goals', label: 'Metas', hint: 'Todo dia 1º, pra guardar um pouquinho pra cada objetivo.', default: '1' },
  { key: 'smart', label: 'Alertas de gasto', hint: 'Ritmo do mês acima do normal, gasto atípico ou cartão perto do limite. No máx. 3 por semana.', default: '0' },
  { key: 'weekly', label: 'Resumo semanal', hint: 'Todo domingo às 20h, quanto você gastou na semana vs. sua média.', default: '1' },
];

export default function SettingsScreen({ visible, onClose, onResetApp }) {
  const { colors, mode, cycleMode, highContrast, setHighContrast, fontScaleKey, setFontScale, resetAppearance } = useTheme();
  const { refresh } = useApp();

  const [tick, setTick] = useState(0);
  const [section, setSection] = useState(null); // null = menu | 'appearance' | 'notifications' | 'security' | 'data' | 'about'
  const [profileOpen, setProfileOpen] = useState(false);
  const [legal, setLegal] = useState(null); // null | 'privacy' | 'terms'
  const [busy, setBusy] = useState(false);
  const [lockOn, setLockOn] = useState(() => isLockEnabled());
  const [lockAvailable, setLockAvailable] = useState(false);

  useEffect(() => {
    canUseLock().then(setLockAvailable);
  }, []);

  function handleClose() {
    setSection(null);
    onClose?.();
  }

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

  const notif = Object.fromEntries(NOTIF_KEYS.map((n) => [n.key, db.getSetting(`notif_${n.key}`, n.default) === '1']));
  const notifOnCount = Object.values(notif).filter(Boolean).length;

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
              Alert.alert('Pronto', 'Backup restaurado com sucesso.');
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
  const securityValue = !lockAvailable ? 'Indisponível' : lockOn ? 'Ativada' : 'Desativada';

  const SECTIONS = {
    appearance: { title: 'Aparência', render: renderAppearance },
    notifications: { title: 'Notificações', render: renderNotifications },
    security: { title: 'Segurança', render: renderSecurity },
    data: { title: 'Dados e backup', render: renderData },
    about: { title: 'Sobre', render: renderAbout },
  };

  function renderAppearance() {
    return (
      <>
        <Card onPress={cycleMode}>
          <Row label="Tema" value={MODE_LABEL[mode]} />
        </Card>
        <View style={{ marginTop: 14 }}>
          <SwitchRow
            label="Alto contraste"
            hint="Cores mais fortes e bordas mais visíveis, pra facilitar a leitura."
            value={highContrast}
            onChange={setHighContrast}
          />
        </View>
        <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY.semibold, color: colors.textMuted, marginTop: 6, marginBottom: 8 }}>
          Tamanho da fonte
        </Text>
        <Segmented
          options={FONT_SCALES.map((f) => ({ key: f.key, label: f.label }))}
          value={fontScaleKey}
          onChange={setFontScale}
        />
        <Button title="Restaurar aparência padrão" variant="ghost" style={{ marginTop: 14 }} onPress={resetAppearance} />
      </>
    );
  }

  function renderNotifications() {
    return (
      <>
        {!notificationsAvailable() ? (
          <Card style={{ marginBottom: 12 }}>
            <Muted size={12}>
              No Expo Go os lembretes ficam desligados por limitação do próprio Expo. Eles funcionam normalmente no APK gerado.
            </Muted>
          </Card>
        ) : null}
        {NOTIF_KEYS.map((n) => (
          <SwitchRow
            key={n.key}
            label={n.label}
            hint={n.hint}
            value={notif[n.key]}
            onChange={(v) => toggleNotif(n.key, v)}
          />
        ))}
        <Button
          title="Reagendar lembretes agora"
          variant="ghost"
          style={{ marginTop: 4 }}
          onPress={async () => {
            const result = await refreshReminders();
            Alert.alert(
              result.available ? 'Prontinho' : 'Indisponível aqui',
              result.available
                ? `${result.scheduled} ${result.scheduled === 1 ? 'lembrete agendado' : 'lembretes agendados'}.`
                : 'Os lembretes só funcionam fora do Expo Go.'
            );
          }}
        />
      </>
    );
  }

  function renderSecurity() {
    return lockAvailable ? (
      <SwitchRow
        label="Bloquear o app"
        hint="Pede biometria ou o desbloqueio do aparelho ao abrir e ao voltar depois de 1 min."
        value={lockOn}
        onChange={toggleLock}
      />
    ) : (
      <Card>
        <Muted size={12}>Configure uma biometria ou bloqueio de tela no seu aparelho pra poder proteger o Meu Bolso.</Muted>
      </Card>
    );
  }

  function renderData() {
    return (
      <Card>
        <Muted size={12}>Tudo fica salvo só no seu aparelho. Exporte de vez em quando — é seu seguro contra perder o celular.</Muted>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button title="Exportar backup (.json)" onPress={() => handleExport('json')} loading={busy} />
          <Button title="Exportar planilha (.csv)" variant="soft" onPress={() => handleExport('csv')} />
          <Button title="Importar backup" variant="ghost" onPress={handleImport} />
          <Button title="Apagar todos os dados" variant="danger" onPress={handleWipe} />
        </View>
      </Card>
    );
  }

  function renderAbout() {
    return (
      <Card>
        <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.bold, color: colors.text }}>Meu Bolso</Text>
        <Muted size={12} style={{ marginTop: 4 }}>
          Controle financeiro manual, offline e sem anúncios. Seus dados ficam só no seu aparelho.
        </Muted>
        <Muted size={12} style={{ marginTop: 8 }}>Versão 1.0.0</Muted>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button title="Política de privacidade" variant="ghost" onPress={() => setLegal('privacy')} />
          <Button title="Termos de uso" variant="ghost" onPress={() => setLegal('terms')} />
        </View>
      </Card>
    );
  }

  const active = section ? SECTIONS[section] : null;

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      onBack={active ? () => setSection(null) : undefined}
      title={active ? active.title : 'Ajustes'}
      height="90%"
    >
      {active ? (
        active.render()
      ) : (
        <>
          <Card onPress={() => setProfileOpen(true)} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBubble icon="user" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.semibold, color: colors.text }}>{userName || 'Seu nome'}</Text>
                <Muted size={12}>Toque pra editar como o app te chama</Muted>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </Card>

          <Card padded={false}>
            <MenuRow icon="sliders" label="Aparência" value={MODE_LABEL[mode]} onPress={() => setSection('appearance')} first />
            <Divider />
            <MenuRow icon="bell" label="Notificações" value={`${notifOnCount}/${NOTIF_KEYS.length} ativas`} onPress={() => setSection('notifications')} />
            <Divider />
            <MenuRow icon="shield" label="Segurança" value={securityValue} onPress={() => setSection('security')} />
            <Divider />
            <MenuRow icon="database" label="Dados e backup" onPress={() => setSection('data')} />
            <Divider />
            <MenuRow icon="info" label="Sobre" value="v1.0.0" onPress={() => setSection('about')} last />
          </Card>
        </>
      )}

      <ProfileSheet visible={profileOpen} initial={userName} onClose={() => setProfileOpen(false)} onSaved={reload} />
      <LegalSheet type={legal} onClose={() => setLegal(null)} />
    </Sheet>
  );
}

function Row({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.semibold, color: colors.text }}>{label}</Text>
      <Muted size={13}>{value}</Muted>
    </View>
  );
}

function MenuRow({ icon, label, value, onPress, first, last }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 13,
          paddingTop: first ? 2 : 13,
          paddingBottom: last ? 2 : 13,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <IconBubble icon={icon} color={colors.textMuted} size={34} />
      <Text style={{ flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.medium, color: colors.text }}>{label}</Text>
      {value ? <Muted size={13}>{value}</Muted> : null}
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}
