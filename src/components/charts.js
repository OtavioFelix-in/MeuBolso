// Gráficos em SVG (react-native-svg). Todos se medem sozinhos com onLayout,
// então é só colocar dentro de um card que eles ocupam a largura disponível.

import { useId, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../theme-context';
import { monthShort } from '../utils/date';
import { formatMoney } from '../utils/money';
import { fontForWeight } from '../theme';

function useWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (e) => setWidth(e.nativeEvent.layout.width);
  return [width, onLayout];
}

// ---- Rosca: pra onde o dinheiro está indo ----

export function DonutChart({ data, size = 190, thickness = 26, centerLabel, centerValue }) {
  const { colors } = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.cardAlt}
            strokeWidth={thickness}
            fill="none"
          />
          {total > 0 &&
            data.map((slice, i) => {
              // Fatias minúsculas viram um tracinho visível de 1,2% do círculo.
              const share = Math.max(slice.value / total, 0.012);
              const length = share * circumference;
              const dash = `${length} ${circumference - length}`;
              const element = (
                <Circle
                  key={`${slice.name}-${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
              offset += length;
              return element;
            })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: fontForWeight('600') }}>{centerLabel}</Text>
        <Text style={{ fontSize: 19, color: colors.text, fontFamily: fontForWeight('800') }}>{centerValue}</Text>
      </View>
    </View>
  );
}

export function DonutLegend({ data, onPress, max = 6 }) {
  const { colors } = useTheme();
  const shown = data.slice(0, max);
  const rest = data.slice(max);
  const restTotal = rest.reduce((s, d) => s + d.value, 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  const rows = [...shown];
  if (rest.length > 0) {
    rows.push({ name: `Outras ${rest.length} categorias`, value: restTotal, color: colors.textMuted });
  }

  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      {rows.map((row, i) => (
        <Pressable
          key={`${row.name}-${i}`}
          onPress={onPress && i < shown.length ? () => onPress(row) : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: row.color }} />
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: fontForWeight('600') }}>
            {row.emoji ? `${row.emoji} ` : ''}
            {row.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, width: 42, textAlign: 'right' }}>
            {total > 0 ? `${Math.round((row.value / total) * 100)}%` : '0%'}
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, fontFamily: fontForWeight('700') }}>
            {formatMoney(row.value)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---- Barras: comparação entre meses ----

// `series` = [{ month, income, expense }]. Mostra duas barras por mês.
export function MonthBars({ series, height = 170, showIncome = true, showExpense = true }) {
  const { colors } = useTheme();
  const [width, onLayout] = useWidth();

  const max = Math.max(
    ...series.map((s) => Math.max(showIncome ? s.income : 0, showExpense ? s.expense : 0)),
    1
  );
  const chartHeight = height - 26;
  const slot = width / Math.max(series.length, 1);
  const barCount = (showIncome ? 1 : 0) + (showExpense ? 1 : 0);
  const barWidth = Math.min(slot / (barCount + 1.4), 20);

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke={colors.border} strokeWidth={1} />
          {series.map((item, i) => {
            const center = slot * i + slot / 2;
            const bars = [];
            if (showIncome && showExpense) {
              bars.push({ value: item.income, color: colors.income, x: center - barWidth - 2 });
              bars.push({ value: item.expense, color: colors.expense, x: center + 2 });
            } else if (showIncome) {
              bars.push({ value: item.income, color: colors.income, x: center - barWidth / 2 });
            } else {
              bars.push({ value: item.expense, color: colors.expense, x: center - barWidth / 2 });
            }

            return (
              <G key={item.month}>
                {bars.map((bar, j) => {
                  const barHeight = Math.max((bar.value / max) * (chartHeight - 16), bar.value > 0 ? 3 : 0);
                  return (
                    <Rect
                      key={j}
                      x={bar.x}
                      y={chartHeight - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={5}
                      fill={bar.color}
                      opacity={i === series.length - 1 ? 1 : 0.75}
                    />
                  );
                })}
                <SvgText
                  x={center}
                  y={height - 8}
                  fontSize={11}
                  fontWeight="600"
                  fill={i === series.length - 1 ? colors.text : colors.textMuted}
                  textAnchor="middle"
                >
                  {monthShort(item.month)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

// ---- Linha: evolução (patrimônio, investimentos...) ----

export function LineChart({ series, height = 180, color, fill = true, valueKey = 'total' }) {
  const { colors } = useTheme();
  const [width, onLayout] = useWidth();
  const tint = color ?? colors.primary;
  // Dois gráficos na mesma tela não podem dividir o id do gradiente.
  const gradientId = `lineFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const values = series.map((s) => s[valueKey] ?? 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const padTop = 14;
  const chartHeight = height - 26;
  const stepX = series.length > 1 ? width / (series.length - 1) : width;

  const pointAt = (i) => ({
    x: series.length > 1 ? stepX * i : width / 2,
    y: padTop + (1 - (values[i] - min) / range) * (chartHeight - padTop),
  });

  const points = series.map((_, i) => pointAt(i));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? 0},${chartHeight} L${points[0]?.x ?? 0},${chartHeight} Z`;

  return (
    <View onLayout={onLayout}>
      {width > 0 && series.length > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint} stopOpacity="0.28" />
              <Stop offset="1" stopColor={tint} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          <Line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke={colors.border} strokeWidth={1} />
          {fill && series.length > 1 ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
          <Path d={linePath} stroke={tint} strokeWidth={2.5} fill="none" strokeLinejoin="round" />

          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 5 : 3}
              fill={i === points.length - 1 ? tint : colors.card}
              stroke={tint}
              strokeWidth={2}
            />
          ))}

          {series.map((item, i) => (
            <SvgText
              key={item.month}
              x={pointAt(i).x}
              y={height - 8}
              fontSize={11}
              fontWeight="600"
              fill={i === series.length - 1 ? colors.text : colors.textMuted}
              textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
            >
              {monthShort(item.month)}
            </SvgText>
          ))}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

// ---- Barra horizontal comparativa (dashboard de hábitos) ----

export function CompareBars({ rows, color }) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <View key={row.label} style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: fontForWeight('600') }}>{row.label}</Text>
            <Text style={{ color: row.value > 0 ? colors.text : colors.textMuted, fontSize: 13, fontFamily: fontForWeight('700') }}>
              {formatMoney(row.value)}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 8, backgroundColor: colors.cardAlt, overflow: 'hidden' }}>
            <View
              style={{
                width: `${(row.value / max) * 100}%`,
                height: '100%',
                borderRadius: 8,
                backgroundColor: row.highlight ? tint : `${tint}99`,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// Mini gráfico de barras que cabe dentro de uma linha de lista.
export function Sparkline({ values, color, height = 34, width = 74 }) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  const max = Math.max(...values, 1);
  const barWidth = width / (values.length * 1.6);

  return (
    <Svg width={width} height={height}>
      {values.map((value, i) => {
        const barHeight = Math.max((value / max) * height, value > 0 ? 2 : 1);
        return (
          <Rect
            key={i}
            x={i * (width / values.length) + barWidth * 0.3}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={i === values.length - 1 ? tint : colors.border}
          />
        );
      })}
    </Svg>
  );
}
