import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/app-context';
import TabBar, { Fab } from './src/components/TabBar';
import TransactionForm from './src/components/TransactionForm';
import { ensureCurrentMonthOpen, initDatabase, isOnboardingDone } from './src/db';
import { isLockEnabled } from './src/security/auth';
import { refreshReminders, setupNotifications } from './src/notifications/notifications';
import AgendaScreen from './src/screens/AgendaScreen';
import ContasFixasScreen from './src/screens/ContasFixasScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DespesasScreen from './src/screens/DespesasScreen';
import LockScreen from './src/screens/LockScreen';
import MesesScreen from './src/screens/MesesScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ParcelamentosScreen from './src/screens/ParcelamentosScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WalletScreen from './src/screens/WalletScreen';
import { ThemeProvider, useTheme } from './src/theme-context';

// O banco precisa existir antes de qualquer tela (ou o tema) consultar.
initDatabase();
ensureCurrentMonthOpen();

const CLOSED = { open: false, tx: null, kind: 'expense', presetCategoryId: null };

// Abas da barra inferior.
const TAB_SCREENS = {
  home: DashboardScreen,
  expenses: DespesasScreen,
  meses: MesesScreen,
  wallet: WalletScreen,
  reports: ReportsScreen,
};

// Telas abertas "por cima" (com botão voltar), a partir do Início.
const SUB_SCREENS = {
  bills: ContasFixasScreen,
  installments: ParcelamentosScreen,
  agenda: AgendaScreen,
};

// Botão flutuante só onde faz sentido lançar despesa/receita rápido.
const FAB_TABS = new Set(['home', 'expenses']);

function Shell({ tab, sub, setTab, setSub, form, setForm, settingsOpen, setSettingsOpen, onResetApp }) {
  const { colors, isDark } = useTheme();
  const { refresh } = useApp();

  useEffect(() => {
    (async () => {
      await setupNotifications();
      await refreshReminders();
    })().catch(() => {});
  }, []);

  const TabScreen = TAB_SCREENS[tab];
  const SubScreen = sub ? SUB_SCREENS[sub.name] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={{ flex: 1 }}>
        {/* Só a aba ativa é montada: ao trocar, a tela recarrega os dados do banco. */}
        {SubScreen ? (
          <SubScreen params={sub.params} />
        ) : (
          <TabScreen onOpenSettings={() => setSettingsOpen(true)} />
        )}

        {FAB_TABS.has(tab) && !SubScreen ? (
          <Fab onPress={() => setForm({ open: true, tx: null, kind: 'expense', presetCategoryId: null })} />
        ) : null}
      </View>

      {!SubScreen ? <TabBar active={tab} onChange={setTab} /> : null}

      <TransactionForm
        visible={form.open}
        transaction={form.tx}
        defaultKind={form.kind}
        presetCategoryId={form.presetCategoryId}
        onClose={() => setForm(CLOSED)}
        onSaved={async () => {
          refresh();
          await refreshReminders();
        }}
      />

      <SettingsScreen visible={settingsOpen} onClose={() => setSettingsOpen(false)} onResetApp={onResetApp} />
    </SafeAreaView>
  );
}

function Root() {
  const [tab, setTab] = useState('home');
  const [sub, setSub] = useState(null);
  const [form, setForm] = useState(CLOSED);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(() => isOnboardingDone());
  const [locked, setLocked] = useState(() => isLockEnabled());
  const bgSince = useRef(null);

  // Re-bloqueia ao voltar do segundo plano depois de mais de 1 minuto.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        bgSince.current = Date.now();
      } else if (state === 'active') {
        if (isLockEnabled() && bgSince.current && Date.now() - bgSince.current > 60000) {
          setLocked(true);
        }
        bgSince.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const openTransaction = useCallback(
    (tx = null, kind = 'expense', presetCategoryId = null) =>
      setForm({ open: true, tx, kind: tx?.kind ?? kind, presetCategoryId }),
    []
  );

  // Um destino pode ser: uma aba, uma tela secundária, ou 'settings'.
  const navigate = useCallback((name, params = null) => {
    if (name === 'settings') {
      setSettingsOpen(true);
      return;
    }
    if (TAB_SCREENS[name]) {
      setSub(null);
      setTab(name);
    } else if (SUB_SCREENS[name]) {
      setSub({ name, params });
    }
  }, []);

  const back = useCallback(() => setSub(null), []);

  // Chamado depois de apagar todos os dados: volta o app ao primeiro acesso.
  const onResetApp = useCallback(() => {
    setSettingsOpen(false);
    setLocked(false);
    setTab('home');
    setSub(null);
    setOnboarded(false);
  }, []);

  if (!onboarded) {
    return <OnboardingScreen onFinish={() => setOnboarded(true)} />;
  }

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <AppProvider openTransaction={openTransaction} navigate={navigate} back={back}>
      <Shell
        tab={tab}
        sub={sub}
        setTab={(t) => {
          setSub(null);
          setTab(t);
        }}
        setSub={setSub}
        form={form}
        setForm={setForm}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        onResetApp={onResetApp}
      />
    </AppProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
