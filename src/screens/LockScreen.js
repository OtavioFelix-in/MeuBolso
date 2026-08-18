// Tela mostrada quando o app está bloqueado. Tenta autenticar sozinha ao
// aparecer; se o usuário cancelar, fica o botão pra tentar de novo.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme-context';
import { Button } from '../components/ui';
import { authenticate } from '../security/auth';
import { fontForWeight } from '../theme';

export default function LockScreen({ onUnlock }) {
  const { colors } = useTheme();
  const [trying, setTrying] = useState(false);

  async function attempt() {
    setTrying(true);
    const ok = await authenticate('Desbloqueie o Meu Bolso');
    setTrying(false);
    if (ok) onUnlock();
  }

  // Pede o desbloqueio automaticamente ao abrir.
  useEffect(() => {
    attempt();
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
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
        <Text style={{ fontSize: 44 }}>🔒</Text>
      </View>
      <Text style={{ fontSize: 22, fontFamily: fontForWeight('800'), color: colors.text, textAlign: 'center' }}>
        Meu Bolso está bloqueado
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
        Use sua biometria ou o desbloqueio do aparelho pra entrar.
      </Text>
      <Button title="Desbloquear" icon="🔓" onPress={attempt} loading={trying} style={{ marginTop: 28, alignSelf: 'stretch' }} />
    </SafeAreaView>
  );
}
