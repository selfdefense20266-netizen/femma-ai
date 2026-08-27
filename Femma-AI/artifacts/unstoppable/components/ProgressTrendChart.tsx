import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

type Props = {
  data: number[];
  highlightIndex: number;
  color: string;
  fillColor: string;
  mutedColor: string;
};

const CHART_HEIGHT = 156;
const PAD_LEFT = 32;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (!points.length) return '';
  const last = points[points.length - 1];
  const first = points[0];
  return `${buildPath(points)} L ${last.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`;
}

export default function ProgressTrendChart({ data, highlightIndex, color, fillColor, mutedColor }: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - width) > 0.5) setWidth(next);
  };

  const chart = useMemo(() => {
    if (width <= 0 || !data.length) return null;

    const innerW = width - PAD_LEFT - PAD_RIGHT;
    const innerH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const baseline = PAD_TOP + innerH;

    const rawMax = Math.max(...data);
    const rawMin = Math.min(...data);
    const paddedMax = rawMax === rawMin ? rawMax + 10 : rawMax + Math.max(2, Math.round((rawMax - rawMin) * 0.12));
    const paddedMin = rawMax === rawMin ? Math.max(0, rawMin - 10) : Math.max(0, rawMin - Math.max(2, Math.round((rawMax - rawMin) * 0.08)));
    const range = Math.max(paddedMax - paddedMin, 1);

    const yFor = (value: number) => PAD_TOP + innerH - ((value - paddedMin) / range) * innerH;

    const points = data.map((value, index) => ({
      x: PAD_LEFT + (index / Math.max(data.length - 1, 1)) * innerW,
      y: yFor(value),
      value,
    }));

    const yTicks = [paddedMin, paddedMin + range * 0.33, paddedMin + range * 0.66, paddedMax].map((v) => Math.round(v));
    const highlight = points[Math.min(Math.max(highlightIndex, 0), points.length - 1)];

    return { points, baseline, yTicks, highlight, innerW, paddedMin, range, innerH };
  }, [data, highlightIndex, width]);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {width > 0 && chart ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fillColor} stopOpacity="0.32" />
              <Stop offset="1" stopColor={fillColor} stopOpacity="0.03" />
            </LinearGradient>
          </Defs>

          {chart.yTicks.map((tick) => {
            const y = PAD_TOP + chart.innerH - ((tick - chart.paddedMin) / chart.range) * chart.innerH;
            return (
              <React.Fragment key={`grid-${tick}`}>
                <Line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={width - PAD_RIGHT}
                  y2={y}
                  stroke={mutedColor}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <SvgText x={6} y={y + 3} fill={mutedColor} fontSize={9}>
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Path d={buildAreaPath(chart.points, chart.baseline)} fill="url(#trendFill)" />
          <Path
            d={buildPath(chart.points)}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chart.points.map((point, index) => (
            <Circle
              key={`dot-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === highlightIndex ? 4.5 : 3}
              fill={index === highlightIndex ? color : '#FFFFFF'}
              stroke={color}
              strokeWidth={index === highlightIndex ? 0 : 1.5}
            />
          ))}

          {chart.highlight ? (
            <>
              <Circle cx={chart.highlight.x} cy={chart.highlight.y - 16} r={13} fill={color} />
              <SvgText
                x={chart.highlight.x}
                y={chart.highlight.y - 12}
                fill="#FFFFFF"
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
              >
                {chart.highlight.value}
              </SvgText>
            </>
          ) : null}

          {data.map((_, index) => (
            <SvgText
              key={`w-${index}`}
              x={PAD_LEFT + (index / Math.max(data.length - 1, 1)) * chart.innerW}
              y={CHART_HEIGHT - 8}
              fill={index === highlightIndex ? color : mutedColor}
              fontSize={9}
              fontWeight={index === highlightIndex ? '700' : '400'}
              textAnchor="middle"
            >
              W{index + 1}
            </SvgText>
          ))}
        </Svg>
      ) : (
        <View style={{ height: CHART_HEIGHT }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
