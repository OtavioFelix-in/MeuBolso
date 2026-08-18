// Encolhe levemente no toque e volta com uma mola — resposta tátil em todo
// componente tocável do app (Card, Button, Chip, abas, FAB...).
import { useRef } from 'react';
import { Animated } from 'react-native';

export function useTapAnim(scaleTo = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return { scale, onPressIn, onPressOut };
}
