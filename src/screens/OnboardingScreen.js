// Primeiro acesso. Fluxo curto em passos: boas-vindas → nome → contas →
// dinheiro em espécie → renda fixa → notificações → biometria → pronto. Cada
// passo grava na hora e o passo atual fica salvo, então é retomável se o app
// fechar no meio.

import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import * as db from '../db';
import { setupNotifications } from '../notifications/notifications';
import { authenticate, canUseLock, setLockEnabled } from '../security/auth';
import { useTheme } from '../theme-context';
import { AccountForm } from '../components/CatalogForms';
import { MoneyField, PickerField, StepperField, TextField } from '../components/fields';
import { Button, Divider, IconBubble, ProgressBar } from '../components/ui';
import { useTapAnim } from '../hooks/useTapAnim';
import { BANK_PRESETS, RADIUS, accountIcon, accountOption, fontForWeight, isCashAccount } from '../theme';
import { formatMoney } from '../utils/money';

// Índices dos passos (guardados em settings pra retomar de onde parou).
const WELCOME = 0;
const NAME = 1;
const ACCOUNTS = 2;
const CASH = 3;
const SALARY = 4;
const NOTIF = 5;
const SECURITY = 6;
const DONE = 7;

export default function OnboardingScreen({ onFinish }) {
  const { colors } = useTheme();

  const [step, setStep] = useState(() => db.getOnboardingStep());
  const [name, setName] = useState(() => db.getUserName());
  const [accounts, setAccounts] = useState(() => db.getAccounts());
  const [accountForm, setAccountForm] = useState(null);
  const [hasCash, setHasCash] = useState(() => Boolean(db.getCashAccount()));
  const [cash, setCash] = useState(() => db.getCashAccount()?.initial_cents ?? 0);
  const [hasSalary, setHasSalary] = useState(true);
  const [salary, setSalary] = useState(0);
  const [salaryDay, setSalaryDay] = useState(5);
  const [salaryAccountId, setSalaryAccountId] = useState(null);
  const [lockAvailable, setLockAvailable] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    canUseLock().then(setLockAvailable);
  }, []);

  // Garante que o campo e o botão "Continuar" fiquem visíveis quando o
  // teclado abre, mesmo se o conteúdo não couber inteiro na tela reduzida.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  const firstName = name.trim().split(/\s+/)[0] || '';
  const digitalAccounts = accounts.filter((a) => !isCashAccount(a));
  const cashOnly = digitalAccounts.length === 0;
  const bankOptions = BANK_PRESETS.filter((b) => !accounts.some((a) => a.name === b.name));

  function reloadAccounts() {
    const list = db.getAccounts();
    setAccounts(list);
    if (!list.some((a) => a.id === salaryAccountId)) setSalaryAccountId(list[0]?.id ?? null);
  }

  function go(next) {
    Keyboard.dismiss();
    db.setOnboardingStep(next);
    setStep(next);
  }

  function advance() {
    // Grava o dado do passo atual antes de seguir.
    if (step === NAME) db.setUserName(name);
    if (step === CASH) {
      if (cashOnly || hasCash) db.setCashAccount(cash);
      else db.removeCashAccount();
      reloadAccounts();
    }
    if (step === SALARY && hasSalary) db.setOnboardingSalary(salary, salaryDay, salaryAccountId);
    go(step + 1);
  }

  async function enableNotifications() {
    await setupNotifications().catch(() => {});
    go(step + 1);
  }

  async function enableLock() {
    const ok = await authenticate('Confirme pra ativar a proteção');
    if (ok) {
      setLockEnabled(true);
      go(step + 1);
    }
    // Se não autenticou, fica no passo pra tentar de novo ou pular.
  }

  function finish() {
    db.finishOnboarding();
    onFinish?.();
  }

  const nameValid = name.trim().length >= 2;
  // Passos com teclado ficam alinhados no topo: centralizar empurrava o campo
  // e o botão "Continuar" pra trás do teclado no Android (tela ficava cortada).
  const hasKeyboard =
    step === NAME || step === ACCOUNTS || (step === CASH && (cashOnly || hasCash)) || (step === SALARY && hasSalary);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Progresso (não aparece na tela de boas-vindas nem na final) */}
          {step > WELCOME && step < DONE ? (
            <View style={{ marginBottom: 20 }}>
              <ProgressBar percent={((step - WELCOME) / (DONE - WELCOME)) * 100} />
            </View>
          ) : null}

          <View style={{ flex: 1, justifyContent: hasKeyboard ? 'flex-start' : 'center', paddingTop: hasKeyboard ? 12 : 0 }}>
          {step === WELCOME ? (
            <Hero
              icon={<WalletIcon size={54} />}
              title="Bem-vindo ao Meu Bolso"
              subtitle="Controle financeiro simples, offline e sem anúncios. Vamos deixar tudo do seu jeito em menos de um minuto."
            />
          ) : null}

          {step === NAME ? (
            <Panel title="Como podemos te chamar?" subtitle="Usamos só pra personalizar o app.">
              <TextField
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                autoFocus
                maxLength={40}
                returnKeyType="next"
                onSubmitEditing={() => nameValid && advance()}
              />
            </Panel>
          ) : null}

          {step === ACCOUNTS ? (
            <Panel
              icon="credit-card"
              title={firstName ? `Onde está o seu dinheiro, ${firstName}?` : 'Onde está o seu dinheiro?'}
              subtitle="Cadastre as contas de banco e carteiras digitais que você usa, com o saldo de hoje. Outras podem ser adicionadas depois, na Carteira."
            >
              {digitalAccounts.length > 0 ? (
                <View style={[styles(colors).list, { marginBottom: 20 }]}>
                  {digitalAccounts.map((a, i) => (
                    <View key={a.id}>
                      {i > 0 ? <Divider /> : null}
                      <Pressable onPress={() => setAccountForm({ account: a })} style={styles(colors).accountRow}>
                        <IconBubble icon={accountIcon(a)} color={a.color} size={36} />
                        <Text style={styles(colors).accountName} numberOfLines={1}>{a.name}</Text>
                        <Text style={styles(colors).accountValue}>{formatMoney(a.initial_cents)}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={styles(colors).fieldLabel}>{digitalAccounts.length > 0 ? 'Adicionar outra' : 'Toque no seu banco'}</Text>
              <View style={styles(colors).bankGrid}>
                {bankOptions.map((b) => (
                  <BankOption key={b.name} label={b.label ?? b.name} color={b.color} onPress={() => setAccountForm({ preset: b })} />
                ))}
                <BankOption label="Outro" color={colors.textMuted} onPress={() => setAccountForm({})} />
              </View>
            </Panel>
          ) : null}

          {step === CASH ? (
            cashOnly ? (
              <Panel
                icon="dollar-sign"
                title="Quanto você tem em espécie hoje?"
                subtitle="Vamos começar só com o dinheiro físico. Quando quiser, cadastre uma conta bancária na Carteira."
              >
                <MoneyField cents={cash} onChange={setCash} autoFocus color={colors.primary} returnKeyType="next" onSubmitEditing={advance} />
              </Panel>
            ) : (
              <Panel
                icon="dollar-sign"
                title="Você também tem dinheiro em espécie?"
                subtitle="Notas e moedas ficam separadas das contas digitais, pra você saber exatamente onde está cada real."
              >
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: hasCash ? 18 : 0 }}>
                  <Button title="Tenho" variant={hasCash ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setHasCash(true)} />
                  <Button title="Não tenho" variant={!hasCash ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setHasCash(false)} />
                </View>
                {hasCash ? (
                  <>
                    <Text style={styles(colors).fieldLabel}>Quanto tem agora</Text>
                    <MoneyField cents={cash} onChange={setCash} autoFocus color={colors.primary} returnKeyType="next" onSubmitEditing={advance} />
                  </>
                ) : null}
              </Panel>
            )
          ) : null}

          {step === SALARY ? (
            <Panel icon="briefcase" title="Você tem uma renda fixa mensal?" subtitle="Se tiver, ela entra sozinha todo mês pra você não precisar lançar.">
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: hasSalary ? 18 : 0 }}>
                <Button title="Tenho" variant={hasSalary ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setHasSalary(true)} />
                <Button title="Não tenho" variant={!hasSalary ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setHasSalary(false)} />
              </View>
              {hasSalary ? (
                <>
                  <Text style={styles(colors).fieldLabel}>Valor do salário</Text>
                  <MoneyField
                    cents={salary}
                    onChange={setSalary}
                    color={colors.income}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => salary > 0 && advance()}
                  />
                  <Text style={[styles(colors).fieldLabel, { marginTop: 16 }]}>Cai todo dia</Text>
                  <StepperField value={salaryDay} onChange={setSalaryDay} min={1} max={31} suffix="do mês" />
                  {accounts.length > 1 ? (
                    <>
                      <Text style={[styles(colors).fieldLabel, { marginTop: 16 }]}>Cai na conta</Text>
                      <PickerField
                        label="Cai na conta"
                        value={salaryAccountId ?? accounts[0]?.id}
                        onChange={setSalaryAccountId}
                        options={accounts.map(accountOption)}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </Panel>
          ) : null}

          {step === NOTIF ? (
            <Panel
              icon="bell"
              title="Quer que a gente te lembre?"
              subtitle="Avisos de contas a vencer e um lembrete pra registrar os gastos. Você escolhe o que receber depois, nos Ajustes."
            />
          ) : null}

          {step === SECURITY ? (
            <Panel
              icon="lock"
              title="Proteger com biometria?"
              subtitle={
                lockAvailable
                  ? 'Pede sua digital ou rosto pra abrir o app. Assim, só você vê suas finanças.'
                  : 'Seu aparelho ainda não tem biometria nem bloqueio configurado. Você pode ativar depois nos Ajustes, quando configurar no celular.'
              }
            />
          ) : null}

          {step === DONE ? (
            <Hero
              icon={<Feather name="check" size={46} color={colors.primary} />}
              title={firstName ? `Tudo pronto, ${firstName}!` : 'Tudo pronto!'}
              subtitle="Seu app está configurado. Toque no + a qualquer momento pra registrar um gasto ou uma receita."
            />
          ) : null}
          </View>

          {/* Rodapé: fica DENTRO do ScrollView (que tem keyboardShouldPersistTaps)
              pra o toque valer de primeira mesmo com um campo ainda em foco. */}
          <View style={{ gap: 10, paddingTop: 20 }}>
          {step === WELCOME ? <Button title="Começar" onPress={() => go(NAME)} /> : null}

          {step === NAME ? (
            <Button title="Continuar" onPress={advance} disabled={!nameValid} />
          ) : null}

          {step === ACCOUNTS ? (
            cashOnly ? (
              <Button title="Uso apenas dinheiro em espécie" variant="ghost" onPress={() => go(CASH)} />
            ) : (
              <Button title="Continuar" onPress={() => go(CASH)} />
            )
          ) : null}

          {step === CASH ? <Button title="Continuar" onPress={advance} /> : null}

          {step === SALARY ? (
            <Button title="Continuar" onPress={advance} disabled={hasSalary && salary <= 0} />
          ) : null}

          {step === NOTIF ? (
            <>
              <Button title="Ativar lembretes" feather="bell" onPress={enableNotifications} />
              <Button title="Agora não" variant="ghost" onPress={() => go(step + 1)} />
            </>
          ) : null}

          {step === SECURITY ? (
            lockAvailable ? (
              <>
                <Button title="Ativar biometria" feather="lock" onPress={enableLock} />
                <Button title="Agora não" variant="ghost" onPress={() => go(step + 1)} />
              </>
            ) : (
              <Button title="Continuar" onPress={() => go(step + 1)} />
            )
          ) : null}

          {step === DONE ? <Button title="Entrar no app" onPress={finish} /> : null}

          {step > WELCOME && step < DONE ? (
            <Button title="Voltar" variant="ghost" onPress={() => go(step - 1)} />
          ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountForm
        visible={Boolean(accountForm)}
        account={accountForm?.account}
        preset={accountForm?.preset}
        allowDeleteLast
        digitalOnly
        onClose={() => setAccountForm(null)}
        onSaved={reloadAccounts}
      />
    </SafeAreaView>
  );
}

// Carteira marrom desenhada em SVG (não há um emoji bom de carteira marrom).
function WalletIcon({ size = 54 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* corpo da carteira */}
      <Rect x="7" y="15" width="50" height="35" rx="7" fill="#6B4326" />
      <Rect x="7" y="20" width="50" height="30" rx="7" fill="#8B5A2B" />
      {/* costura / vinco */}
      <Rect x="7" y="26" width="50" height="2.4" fill="#5A3820" opacity="0.55" />
      {/* bolso do cartão + fecho */}
      <Rect x="33" y="29" width="24" height="13" rx="6.5" fill="#6B4326" />
      <Circle cx="43" cy="35.5" r="3.4" fill="#E8C9A0" />
    </Svg>
  );
}

// Bloco central com ícone grande, título e subtítulo (boas-vindas e final).
function Hero({ icon, title, subtitle }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 26, fontFamily: fontForWeight('800'), color: colors.text, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 15, fontFamily: fontForWeight('400'), color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
        {subtitle}
      </Text>
    </View>
  );
}

// Passo com formulário: ícone menor, título, subtítulo e os campos embaixo.
function Panel({ icon, title, subtitle, children }) {
  const { colors } = useTheme();
  return (
    <View>
      {icon ? <IconBubble icon={icon} size={52} /> : null}
      <Text style={{ fontSize: 24, fontFamily: fontForWeight('800'), color: colors.text, marginTop: icon ? 14 : 0 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 14, fontFamily: fontForWeight('400'), color: colors.textMuted, marginTop: 8, lineHeight: 21 }}>{subtitle}</Text>
      ) : null}
      {children ? <View style={{ marginTop: 24 }}>{children}</View> : null}
    </View>
  );
}

function BankOption({ label, color, onPress }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapAnim(0.94);
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles(colors).bankCell}>
      <Animated.View style={[styles(colors).bank, { transform: [{ scale }] }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ flex: 1, fontSize: 13, fontFamily: fontForWeight('600'), color: colors.text }} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = (colors) => ({
  fieldLabel: { fontSize: 13, fontFamily: fontForWeight('700'), color: colors.textMuted, marginBottom: 7 },
  list: { backgroundColor: colors.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  accountName: { flex: 1, fontSize: 15, fontFamily: fontForWeight('600'), color: colors.text },
  accountValue: { fontSize: 15, fontFamily: fontForWeight('700'), color: colors.text },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  bankCell: { width: '48.5%' },
  bank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});
