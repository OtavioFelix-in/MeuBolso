// Dica contextual que aparece uma única vez por tela e some ao tocar no ✕.
// O "já vi" fica salvo em settings (chave tip_<tipKey>), então não volta a
// incomodar. É o nosso "tutorial": ensina no lugar e na hora certa.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as db from '../db';
import { useTheme } from '../theme-context';

export default function TipCard({ tipKey, emoji, title, text, style }) {
  const { colors } = useTheme();
  const [seen, setSeen] = useState(() => db.getSetting(`tip_${tipKey}`, '0') === '1');

  if (seen) return null;

  function dismiss() {
    db.setSetting(`tip_${tipKey}`, '1');
    setSeen(true);
  }

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
          backgroundColor: colors.primaryLight,
          borderColor: `${colors.primary}55`,
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.text, opacity: 0.75, marginTop: 4, lineHeight: 19 }}>{text}</Text>
      </View>
      <Pressable onPress={dismiss} hitSlop={10}>
        <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
      </Pressable>
    </View>
  );
}
