import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { loadStoreWeather, StoreWeather } from '@/src/services/weather';
import { colors, spacing } from '@/src/theme';

type TickerItem = {
  key: string;
  kind: 'message' | 'important' | 'weather';
  label: string;
  text: string;
  accent: string;
};

const WEATHER_ACCENTS = ['#A87338'];

function weatherItem(weather: StoreWeather, index: number): TickerItem {
  return {
    key: `weather-${weather.city}`,
    kind: 'weather',
    label: weather.city.toLocaleUpperCase('pt-BR'),
    text: `${weather.temperature}°C  •  sensação ${weather.apparentTemperature}°C  •  chuva ${weather.rainChance}%`,
    accent: WEATHER_ACCENTS[index % WEATHER_ACCENTS.length],
  };
}

function buildTickerItems(messages: string[], weather: StoreWeather[]) {
  const weatherItems = weather.map(weatherItem);
  if (!messages.length) return weatherItems;

  const weightedMessages = messages.flatMap((rawMessage, index) => {
    const trimmed = rawMessage.trim();
    const important = trimmed.startsWith('(') && trimmed.endsWith(')');
    const text = important ? trimmed.slice(1, -1).trim() : trimmed;
    if (!text) return [];

    const repetitions = important ? 3 : 1;
    return Array.from({ length: repetitions }, (_, repetition) => ({
      key: `message-${index}-${repetition}`,
      kind: important ? ('important' as const) : ('message' as const),
      label: important ? 'IMPORTANTE' : 'AVISO',
      text,
      accent: important ? '#8F2438' : '#B98545',
    }));
  });

  if (!weightedMessages.length) return weatherItems;

  const items: TickerItem[] = [];
  const pairCount = Math.max(weightedMessages.length, weatherItems.length || 1);
  for (let index = 0; index < pairCount; index += 1) {
    const message = weightedMessages[index % weightedMessages.length];
    items.push({ ...message, key: `${message.key}-pair-${index}` });
    if (weatherItems.length) {
      const forecast = weatherItems[index % weatherItems.length];
      items.push({ ...forecast, key: `${forecast.key}-pair-${index}` });
    }
  }
  return items;
}

function TickerSequence({
  items,
  onLayout,
}: {
  items: TickerItem[];
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View onLayout={onLayout} style={styles.sequence}>
      {items.map((item) => (
        <View
          key={item.key}
          style={[styles.item, item.kind === 'important' && styles.importantItem]}>
          <View style={[styles.label, { backgroundColor: item.accent }]}>
            <Text
              style={[
                styles.labelText,
                item.kind === 'message' && styles.messageLabelText,
              ]}>
              {item.label}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.itemText, item.kind === 'important' && styles.importantText]}>
            {item.text}
          </Text>
          <View style={styles.separator} />
        </View>
      ))}
    </View>
  );
}

export function AnnouncementTicker({ messages }: { messages?: string[] }) {
  const [weather, setWeather] = useState<StoreWeather[]>([]);
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const cleanMessages = useMemo(
    () => (messages ?? []).map((message) => message.trim()).filter(Boolean),
    [messages],
  );

  useEffect(() => {
    let active = true;

    async function refreshWeather() {
      try {
        const nextWeather = await loadStoreWeather();
        if (active) {
          setWeather(nextWeather);
          setWeatherUnavailable(false);
        }
      } catch {
        if (active) setWeatherUnavailable(true);
      }
    }

    void refreshWeather();
    const interval = setInterval(() => void refreshWeather(), 30 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const tickerItems = useMemo(
    () => buildTickerItems(cleanMessages, weather),
    [cleanMessages, weather],
  );
  const visibleItems = tickerItems.length
    ? tickerItems
    : [
        {
          key: 'weather-status',
          kind: 'weather' as const,
          label: 'CLIMA',
          text: weatherUnavailable
            ? 'Previsão temporariamente indisponível'
            : 'Atualizando a previsão das cinco cidades... ',
          accent: colors.info,
        },
      ];
  const animationKey = visibleItems.map((item) => `${item.key}-${item.text}`).join('|');

  useEffect(() => {
    if (!sequenceWidth) return;
    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -sequenceWidth,
        duration: Math.max(14000, Math.round((sequenceWidth / 48) * 1000)),
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [animationKey, sequenceWidth, translateX]);

  function measureSequence(event: LayoutChangeEvent) {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== sequenceWidth) setSequenceWidth(nextWidth);
  }

  return (
    <View accessibilityLabel="Avisos e clima em tempo real" style={styles.container}>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>INFORMAÇÃO</Text>
      </View>
      <View style={styles.marquee}>
        <Animated.View
          pointerEvents="none"
          style={[styles.track, { transform: [{ translateX }] }]}>
          <TickerSequence items={visibleItems} onLayout={measureSequence} />
          <TickerSequence items={visibleItems} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    marginTop: spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#B98545',
    backgroundColor: '#2B1B12',
  },
  liveBadge: {
    zIndex: 2,
    width: 112,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#6D4A2D',
    backgroundColor: '#1D130E',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4A15F',
  },
  liveText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  marquee: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sequence: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexShrink: 0,
    minHeight: 44,
    paddingLeft: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  importantItem: {
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#A9344B',
    borderRadius: 7,
    backgroundColor: '#4A1823',
  },
  label: {
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  messageLabelText: {
    color: colors.white,
  },
  itemText: {
    flexShrink: 0,
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  importantText: {
    color: '#FFDCE3',
    fontSize: 14,
    fontWeight: '900',
  },
  separator: {
    width: 2,
    height: 20,
    marginHorizontal: 42,
    backgroundColor: '#6D4A2D',
  },
});
