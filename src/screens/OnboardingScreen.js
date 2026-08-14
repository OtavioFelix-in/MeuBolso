// Primeiro acesso. Fluxo curto em passos: boas-vindas → nome → saldo → renda
// fixa → notificações → pronto. Cada passo grava na hora e o passo atual fica
// salvo, então é retomável se o app fechar no meio.

import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import * as db from '../db';
import { setupNotifications } from '../notifications/notifications';
import { authenticate, canUseLock, setLockEnabled } from '../security/auth';
import { useTheme } from '../theme-context';
import { MoneyField, StepperField, TextField } from '../components/fields';
import { Button, ProgressBar } from '../components/ui';

// Índices dos passos (guardados em settings pra retomar de onde parou).
const WELCOME = 0;
const NAME = 1;
const BALANCE = 2;
const SALARY = 3;
const NOTIF = 4;
const SECURITY = 5;
const DONE = 6;

export default function OnboardingScreen({ onFinish }) {
  const { colors } = useTheme();

  const [step, setStep] = useState(() => db.getOnboardingStep());
  const [name, setName] = useState(() => db.getUserName());
  const [balance, setBalance] = useState(0);
  const [hasSalary, setHasSalary] = useState(true);
  const [salary, setSalary] = useState(0);
  const [salaryDay, setSalaryDay] = useState(5);
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

  function go(next) {
    Keyboard.dismiss();
    db.setOnboardingStep(next);
    setStep(next);
  }

  function advance() {
    // Grava o dado do passo atual antes de seguir.
    if (step === NAME) db.setUserName(name);
    if (step === BALANCE) db.setInitialBalance(balance);
    if (step === SALARY && hasSalary) db.setOnboardingSalary(salary, salaryDay);
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
  const hasKeyboard = step === NAME || step === BALANCE || (step === SALARY && hasSalary);

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

          {step === BALANCE ? (
            <Panel
              emoji="🏦"
              title={firstName ? `Quanto você tem hoje, ${firstName}?` : 'Quanto você tem hoje?'}
              subtitle="O saldo atual da sua conta. Pode deixar em branco e ajustar depois."
            >
              <MoneyField
                cents={balance}
                onChange={setBalance}
                autoFocus
                color={colors.primary}
                returnKeyType="next"
                onSubmitEditing={advance}
              />
            </Panel>
          ) : null}

          {step === SALARY ? (
            <Panel emoji="💼" title="Você tem uma renda fixa mensal?" subtitle="Se tiver, ela entra sozinha todo mês pra você não precisar lançar.">
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
                </>
              ) : null}
            </Panel>
          ) : null}

          {step === NOTIF ? (
            <Panel
              emoji="🔔"
              title="Quer que a gente te lembre?"
              subtitle="Avisos de contas a vencer e um lembrete pra registrar os gastos. Você escolhe o que receber depois, nos Ajustes."
            />
          ) : null}

          {step === SECURITY ? (
            <Panel
              emoji="🔒"
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
              emoji="🎉"
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

          {step === BALANCE ? (
            <>
              <Button title="Continuar" onPress={advance} />
              <Button title="Pular por enquanto" variant="ghost" onPress={() => go(step + 1)} />
            </>
          ) : null}

          {step === SALARY ? (
            <Button title="Continuar" onPress={advance} disabled={hasSalary && salary <= 0} />
          ) : null}

          {step === NOTIF ? (
            <>
              <Button title="Ativar lembretes" icon="🔔" onPress={enableNotifications} />
              <Button title="Agora não" variant="ghost" onPress={() => go(step + 1)} />
            </>
          ) : null}

          {step === SECURITY ? (
            lockAvailable ? (
              <>
                <Button title="Ativar biometria" icon="🔒" onPress={enableLock} />
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

// Bloco central com ícone/emoji grande, título e subtítulo (boas-vindas e final).
function Hero({ emoji, icon, title, subtitle }) {
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
        {icon ?? <Text style={{ fontSize: 48 }}>{emoji}</Text>}
      </View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
        {subtitle}
      </Text>
    </View>
  );
}

// Passo com formulário: emoji menor, título, subtítulo e os campos embaixo.
function Panel({ emoji, title, subtitle, children }) {
  const { colors } = useTheme();
  return (
    <View>
      {emoji ? <Text style={{ fontSize: 40 }}>{emoji}</Text> : null}
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: emoji ? 12 : 0 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 21 }}>{subtitle}</Text>
      ) : null}
      {children ? <View style={{ marginTop: 24 }}>{children}</View> : null}
    </View>
  );
}

const styles = (colors) => ({
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 7 },
});
