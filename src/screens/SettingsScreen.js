// Ajustes: contas, categorias, notificações, tema e backup.

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { notificationsAvailable, refreshReminders, setupNotifications } from '../notifications/notifications';
import { authenticate, canUseLock, isLockEnabled, setLockEnabled } from '../security/auth';
import { FONT_SCALES, MODE_EMOJI, MODE_LABEL, useTheme } from '../theme-context';
import { exportBackup, exportSpreadsheet, importBackup } from '../utils/backup';
import { currentMonth, monthLabel, monthOf } from '../utils/date';
import { formatMoney } from '../utils/money';
import { AccountForm, CategoryForm } from '../components/CatalogForms';
import { DateField, Field, MoneyField, StepperField, SwitchRow, TextField } from '../components/fields';
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
  const [accountForm, setAccountForm] = useState({ open: false, account: null });
  const [categoryForm, setCategoryForm] = useState({ open: false, category: null, parent: null, kind: 'expense' });
  const [categoryKind, setCategoryKind] = useState('expense');
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
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

  const salary = useMemo(() => (visible ? db.getSalary() : { configured: false, cents: 0, day: 5 }), [visible, tick]);

  const reload = () => {
    setTick((t) => t + 1);
    refresh();
  };

  const accounts = useMemo(() => (visible ? db.getAccountsWithBalance() : []), [visible, tick]);
  const categories = useMemo(() => (visible ? db.getCategoryTree(categoryKind) : []), [visible, categoryKind, tick]);

  const notif = {
    bills: db.getSetting('notif_bills', '1') === '1',
    daily: db.getSetting('notif_daily', '0') === '1',
    invest: db.getSetting('notif_invest', '1') === '1',
    goals: db.getSetting('notif_goals', '1') === '1',
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

      <SectionTitle>Renda fixa mensal</SectionTitle>
      <Card onPress={() => setSalaryOpen(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBubble emoji="💼" color={colors.income} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              {salary.configured && salary.cents > 0 ? `Salário: ${formatMoney(salary.cents)}` : 'Configurar salário'}
            </Text>
            <Muted size={12}>
              {salary.configured && salary.cents > 0
                ? `Entra todo dia ${salary.day} automaticamente. Edite um mês específico lá no Início.`
                : 'Entra automático todo mês. Se um mês for diferente, você edita só aquele no Início.'}
            </Muted>
          </View>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{salary.configured ? 'editar' : 'definir'}</Text>
        </View>
      </Card>

      <SectionTitle action="+ nova" onAction={() => setAccountForm({ open: true, account: null })}>
        Contas
      </SectionTitle>
      <Card>
        {accounts.map((account, i) => (
          <View key={account.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => setAccountForm({ open: true, account })}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
                pressed && { opacity: 0.6 },
              ]}
            >
              <IconBubble emoji={account.emoji} color={account.color} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{account.name}</Text>
                <Muted size={12}>saldo inicial de {formatMoney(account.initial_cents)}</Muted>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: account.balance_cents >= 0 ? colors.text : colors.expense,
                }}
              >
                {formatMoney(account.balance_cents)}
              </Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <SectionTitle action="+ nova" onAction={() => setCategoryForm({ open: true, category: null, parent: null, kind: categoryKind })}>
        Categorias
      </SectionTitle>
      <View style={{ marginBottom: 12 }}>
        <Segmented
          options={[
            { key: 'expense', label: 'Despesas' },
            { key: 'income', label: 'Receitas' },
          ]}
          value={categoryKind}
          onChange={setCategoryKind}
        />
      </View>
      <Card>
        {categories.map((cat, i) => {
          const isOpen = expanded === cat.id;
          return (
            <View key={cat.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => setExpanded(isOpen ? null : cat.id)}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <IconBubble emoji={cat.emoji} color={cat.color} size={38} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>{cat.name}</Text>
                <Muted size={12}>
                  {cat.subs.length > 0 ? `${cat.subs.length} sub` : 'sem sub'} {isOpen ? '▲' : '▼'}
                </Muted>
              </Pressable>

              {isOpen ? (
                <View style={{ paddingLeft: 50, paddingBottom: 12, gap: 8 }}>
                  {cat.subs.map((sub) => (
                    <Pressable key={sub.id} onPress={() => setCategoryForm({ open: true, category: sub, parent: cat, kind: categoryKind })}>
                      <Text style={{ color: colors.text, fontSize: 14, paddingVertical: 4 }}>• {sub.name}</Text>
                    </Pressable>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Button
                      title="Editar"
                      variant="ghost"
                      style={{ flex: 1, paddingVertical: 9 }}
                      onPress={() => setCategoryForm({ open: true, category: cat, parent: null, kind: categoryKind })}
                    />
                    <Button
                      title="+ subcategoria"
                      variant="soft"
                      style={{ flex: 1, paddingVertical: 9 }}
                      onPress={() => setCategoryForm({ open: true, category: null, parent: cat, kind: categoryKind })}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
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

      <AccountForm
        visible={accountForm.open}
        account={accountForm.account}
        onClose={() => setAccountForm({ open: false, account: null })}
        onSaved={reload}
      />

      <CategoryForm
        visible={categoryForm.open}
        category={categoryForm.category}
        parent={categoryForm.parent}
        kind={categoryForm.kind}
        onClose={() => setCategoryForm({ open: false, category: null, parent: null, kind: categoryKind })}
        onSaved={reload}
      />

      <SalarySheet visible={salaryOpen} current={salary} onClose={() => setSalaryOpen(false)} onSaved={reload} />

      <ProfileSheet visible={profileOpen} initial={userName} onClose={() => setProfileOpen(false)} onSaved={reload} />

      <LegalSheet type={legal} onClose={() => setLegal(null)} />
    </Sheet>
  );
}

function ProfileSheet({ visible, initial, onClose, onSaved }) {
  const [name, setName] = useState(initial);

  useEffect(() => { if (visible) setName(initial); }, [visible, initial]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Seu nome"
      height="46%"
      footer={<Button title="Salvar" onPress={() => { db.setUserName(name); onSaved?.(); onClose(); }} />}
    >
      <Field label="Como o app deve te chamar">
        <TextField value={name} onChangeText={setName} placeholder="Seu nome" autoFocus maxLength={40} />
      </Field>
    </Sheet>
  );
}

function LegalSheet({ type, onClose }) {
  const { colors } = useTheme();
  const isPrivacy = type === 'privacy';
  const paragraphs = isPrivacy ? PRIVACY : TERMS;

  return (
    <Sheet
      visible={Boolean(type)}
      onClose={onClose}
      title={isPrivacy ? 'Política de privacidade' : 'Termos de uso'}
      height="84%"
    >
      {paragraphs.map((p, i) => (
        <Text key={i} style={{ fontSize: 13.5, color: colors.text, lineHeight: 21, marginBottom: 12 }}>{p}</Text>
      ))}
      <Muted size={12} style={{ marginTop: 4, marginBottom: 8 }}>Atualizado em agosto de 2026.</Muted>
    </Sheet>
  );
}

const PRIVACY = [
  'O Meu Bolso é um aplicativo de controle financeiro que funciona 100% offline. Todos os dados que você registra (lançamentos, contas, salário, categorias e demais informações) ficam salvos apenas no seu próprio aparelho.',
  'Não coletamos, não enviamos e não armazenamos seus dados em nenhum servidor. O desenvolvedor não tem acesso a nenhuma informação sua.',
  'O app não usa rastreadores, não exibe anúncios e não compartilha dados com terceiros.',
  'As permissões que o app pode pedir são usadas só no aparelho: câmera e fotos para anexar comprovantes aos lançamentos, notificações para lembretes de contas, e biometria apenas para desbloquear o app. Nada disso sai do seu celular.',
  'Como os dados ficam só no aparelho, faça backups pela tela de Ajustes para não perdê-los ao trocar ou formatar o celular. Você pode apagar todos os seus dados a qualquer momento em Ajustes › Apagar todos os dados.',
];

const TERMS = [
  'O Meu Bolso é oferecido "como está", para ajudar você a organizar suas finanças pessoais. Ele é um apoio à sua organização e não substitui a orientação de um profissional financeiro.',
  'Você é responsável pelas informações que registra e por manter backups dos seus dados. Como tudo fica apenas no seu aparelho, o desenvolvedor não se responsabiliza por perda de dados decorrente de troca, formatação ou perda do aparelho, nem da desinstalação do app.',
  'O app não realiza transações financeiras e não se conecta a bancos: todos os valores são informados manualmente por você.',
  'Ao usar o aplicativo, você concorda com estes termos, que podem ser atualizados em novas versões do app.',
];

function SalarySheet({ visible, current, onClose, onSaved }) {
  const { colors } = useTheme();
  const [cents, setCents] = useState(current.cents);
  const [day, setDay] = useState(current.day || 5);
  const [applyFrom, setApplyFrom] = useState(currentMonth());

  useEffect(() => {
    if (visible) {
      setCents(current.cents);
      setDay(current.day || 5);
      setApplyFrom(currentMonth());
    }
  }, [visible, current.cents, current.day]);

  function save() {
    db.saveSalary({ cents, day, applyFrom });
    onSaved?.();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Salário / renda fixa"
      height="72%"
      footer={<Button title="Salvar" onPress={save} />}
    >
      <Field label="Valor do salário">
        <MoneyField key={visible ? 'sal-open' : 'sal-closed'} cents={cents} onChange={setCents} autoFocus color={colors.income} />
      </Field>
      <Field label="Dia que costuma cair" hint="Entra automático todo mês que você abrir.">
        <StepperField value={day} onChange={setDay} min={1} max={31} suffix="do mês" />
      </Field>
      <Field
        label="Valer a partir de"
        hint="O novo valor vale deste mês em diante. Meses anteriores (já abertos) continuam com o salário antigo."
      >
        <DateField value={`${applyFrom}-01`} onChange={(d) => setApplyFrom(monthOf(d))} placeholder="Este mês" />
      </Field>
      {current.configured ? (
        <Muted size={12}>Vigência: {monthLabel(applyFrom, { full: true })} em diante.</Muted>
      ) : null}
    </Sheet>
  );
}
