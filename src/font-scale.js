// Escala de fonte global. Em vez de refatorar o fontSize de cada tela, a gente
// intercepta o render do <Text> uma única vez e multiplica o fontSize pela
// escala escolhida nos Ajustes. scale = 1 não mexe em nada.

import React from 'react';
import { StyleSheet, Text } from 'react-native';

let scale = 1;

export function setGlobalFontScale(s) {
  scale = s || 1;
}

export function getGlobalFontScale() {
  return scale;
}

// Aplica o patch só uma vez (guardado por flag pra sobreviver a hot reload).
if (!Text.__mbScalePatched && typeof Text.render === 'function') {
  Text.__mbScalePatched = true;
  const originalRender = Text.render;
  Text.render = function (...args) {
    const element = originalRender.apply(this, args);
    if (scale === 1 || !element) return element;
    const flat = StyleSheet.flatten(element.props.style) || {};
    if (typeof flat.fontSize === 'number') {
      return React.cloneElement(element, {
        style: [element.props.style, { fontSize: Math.round(flat.fontSize * scale) }],
      });
    }
    return element;
  };
}
