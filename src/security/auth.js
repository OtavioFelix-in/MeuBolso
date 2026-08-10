// Trava do app por biometria / desbloqueio do aparelho. Não guardamos senha
// nenhuma: usamos o próprio desbloqueio do celular (digital, rosto ou PIN do
// aparelho) via expo-local-authentication. O liga/desliga fica em settings.

import * as LocalAuthentication from 'expo-local-authentication';
import { getSetting, setSetting } from '../db';

export function isLockEnabled() {
  return getSetting('security_lock', '0') === '1';
}

export function setLockEnabled(on) {
  setSetting('security_lock', on ? '1' : '0');
}

// Tem hardware de biometria E algo cadastrado (digital/rosto/PIN do aparelho)?
export async function canUseLock() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

// Dispara o desbloqueio nativo. Retorna true se autenticou.
export async function authenticate(reason = 'Desbloqueie o Meu Bolso') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false, // deixa cair no PIN/senha do aparelho
    });
    return result.success === true;
  } catch {
    return false;
  }
}
