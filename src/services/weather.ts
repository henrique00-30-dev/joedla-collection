export type StoreWeather = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  rainChance: number;
};

type WeatherApiResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
  };
};

const WEATHER_LOCATIONS = [
  { city: 'Rosário do Catete', latitude: -10.696, longitude: -37.193 },
  { city: 'Aracaju', latitude: -10.9472, longitude: -37.0731 },
  { city: 'Santo Amaro', latitude: -10.78889, longitude: -37.05444 },
  { city: 'Maruim', latitude: -10.7375, longitude: -37.08167 },
  { city: 'Carmópolis', latitude: -10.64806, longitude: -36.98889 },
] as const;

async function loadCityWeather(
  location: (typeof WEATHER_LOCATIONS)[number],
): Promise<StoreWeather> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature',
    hourly: 'precipitation_probability',
    timezone: 'America/Maceio',
    forecast_days: '1',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Não foi possível consultar o clima.');

  const data = (await response.json()) as WeatherApiResponse;
  const current = data.current;
  if (
    !current?.time ||
    typeof current.temperature_2m !== 'number' ||
    typeof current.apparent_temperature !== 'number'
  ) {
    throw new Error('Resposta de clima incompleta.');
  }

  const currentHour = `${current.time.slice(0, 13)}:00`;
  const rainIndex = data.hourly?.time?.indexOf(currentHour) ?? -1;
  const rainChance =
    rainIndex >= 0
      ? data.hourly?.precipitation_probability?.[rainIndex] ?? 0
      : 0;

  return {
    city: location.city,
    temperature: Math.round(current.temperature_2m),
    apparentTemperature: Math.round(current.apparent_temperature),
    rainChance: Math.round(rainChance),
  };
}

export async function loadStoreWeather(): Promise<StoreWeather[]> {
  const results = await Promise.allSettled(
    WEATHER_LOCATIONS.map((location) => loadCityWeather(location)),
  );
  const weather = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  if (!weather.length) throw new Error('Clima temporariamente indisponível.');
  return weather;
}
