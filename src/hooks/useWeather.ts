import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ComponentType,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Thermometer,
  type LucideProps,
} from "lucide-react";

// WMO weather interpretation codes
// https://open-meteo.com/en/docs#weathervariables
const WMO_CODES: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Freezing Drizzle",
  57: "Freezing Drizzle",
  61: "Rainy",
  63: "Rainy",
  65: "Rainy",
  66: "Freezing Rain",
  67: "Freezing Rain",
  71: "Snowy",
  73: "Snowy",
  75: "Snowy",
  77: "Snowy",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Rain Showers",
  85: "Snow Showers",
  86: "Snow Showers",
  95: "Stormy",
  96: "Stormy",
  99: "Stormy",
};

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
// The dashboard reuses the same cadence: Open-Meteo models update hourly to
// 6-hourly, so polling faster only re-reads the same forecast.
const DASHBOARD_REFRESH_MS = 30 * 60 * 1000;
const SNAPSHOT_KEY = "nectar-weather-snapshot";
const SNAPSHOT_TTL_MS = 30 * 60 * 1000;

export interface WeatherHour {
  time: string;
  temperature: number;
  precipProbability: number;
  weatherCode: number;
  isDay: boolean;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProbabilityMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherSnapshot {
  savedAt: number;
  timezone: string;
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    weatherCode: number;
    isDay: boolean;
    uvIndex: number | null;
  };
  hourly: WeatherHour[];
  daily: WeatherDay[];
}

interface WeatherState {
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  weatherCondition: string;
  weatherIcon: ComponentType<LucideProps>;
}

interface ResolvedLocation {
  lat: number;
  lon: number;
  city?: string;
}

export function getWeatherIcon(
  condition: string,
  isDay = true,
): ComponentType<LucideProps> {
  switch (condition) {
    case "Clear":
    case "Mostly Clear":
      return isDay ? Sun : Moon;
    case "Partly Cloudy":
    case "Overcast":
      return Cloud;
    case "Foggy":
      return CloudFog;
    case "Drizzle":
    case "Freezing Drizzle":
      return CloudDrizzle;
    case "Rainy":
    case "Rain Showers":
    case "Freezing Rain":
      return CloudRain;
    case "Snowy":
    case "Snow Showers":
      return CloudSnow;
    case "Stormy":
      return CloudLightning;
    default:
      return Thermometer;
  }
}

export const conditionForCode = (code: number): string => WMO_CODES[code] || "Unknown";

async function fetchWeatherForCoords(
  latitude: number,
  longitude: number,
  unit: string,
): Promise<WeatherState> {
  const unitParam = unit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&timezone=auto${unitParam}`,
  );

  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}`);
  }

  const data = await response.json();

  if (typeof data?.current?.temperature_2m !== "number") {
    throw new Error("Invalid weather API response shape");
  }

  const temp = Math.round(data.current.temperature_2m);
  const apparentTemperature =
    typeof data.current.apparent_temperature === "number"
      ? Math.round(data.current.apparent_temperature)
      : null;
  const humidity =
    typeof data.current.relative_humidity_2m === "number"
      ? Math.round(data.current.relative_humidity_2m)
      : null;
  const code = data.current.weather_code;
  const condition = WMO_CODES[code] || "Unknown";
  const isDay = data.current.is_day === 1;

  return {
    temperature: temp,
    apparentTemperature,
    humidity,
    weatherCondition: condition,
    weatherIcon: getWeatherIcon(condition, isDay),
  };
}

async function fetchSnapshotForCoords(
  latitude: number,
  longitude: number,
  unit: string,
): Promise<WeatherSnapshot> {
  const unitParam = unit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,uv_index` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
    `&forecast_hours=24&forecast_days=3&timezone=auto${unitParam}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}`);
  }
  const data = await response.json();
  const c = data?.current;
  if (!c || typeof c.temperature_2m !== "number") {
    throw new Error("Invalid weather API response shape");
  }

  const hourlyTimes: string[] = data?.hourly?.time ?? [];
  const hourly: WeatherHour[] = hourlyTimes.map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m?.[i] ?? 0,
    precipProbability: data.hourly.precipitation_probability?.[i] ?? 0,
    weatherCode: data.hourly.weather_code?.[i] ?? 0,
    isDay: data.hourly.is_day?.[i] === 1,
  }));

  const d = data?.daily ?? {};
  const dailyDates: string[] = d.time ?? [];
  const daily: WeatherDay[] = dailyDates.map((date, i) => ({
    date,
    weatherCode: d.weather_code?.[i] ?? 0,
    tempMax: d.temperature_2m_max?.[i] ?? 0,
    tempMin: d.temperature_2m_min?.[i] ?? 0,
    precipProbabilityMax: d.precipitation_probability_max?.[i] ?? 0,
    sunrise: d.sunrise?.[i] ?? "",
    sunset: d.sunset?.[i] ?? "",
  }));

  return {
    savedAt: Date.now(),
    timezone: data?.timezone ?? "",
    current: {
      time: c.time ?? "",
      temperature: c.temperature_2m,
      apparentTemperature: c.apparent_temperature ?? c.temperature_2m,
      humidity: c.relative_humidity_2m ?? 0,
      weatherCode: c.weather_code ?? 0,
      isDay: c.is_day === 1,
      uvIndex: typeof c.uv_index === "number" ? c.uv_index : null,
    },
    hourly,
    daily,
  };
}

function readSnapshotCache(): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as WeatherSnapshot;
    if (!snapshot?.savedAt || !snapshot.current) return null;
    if (Date.now() - snapshot.savedAt > SNAPSHOT_TTL_MS) return null;
    return snapshot;
  } catch {
    return null;
  }
}

const IP_LOCATION_KEY = "nectar-weather-ip-location";

function rememberIpLocation(location: ResolvedLocation): ResolvedLocation {
  try {
    localStorage.setItem(IP_LOCATION_KEY, JSON.stringify(location));
  } catch {}
  return location;
}

function lastIpLocation(): ResolvedLocation | null {
  try {
    const saved = JSON.parse(localStorage.getItem(IP_LOCATION_KEY) ?? "null");
    return typeof saved?.lat === "number" && typeof saved?.lon === "number" ? saved : null;
  } catch {
    return null;
  }
}

async function resolveLocation(): Promise<ResolvedLocation | null> {
  // 1. Check saved coordinates from settings or localStorage
  try {
    const settings = (await invoke("load_settings").catch(() => ({}))) as Record<
      string,
      any
    >;
    const savedLat =
      settings["nectar-weather-lat"] || localStorage.getItem("nectar-weather-lat");
    const savedLon =
      settings["nectar-weather-lon"] || localStorage.getItem("nectar-weather-lon");
    const savedCity =
      settings["nectar-weather-city"] || localStorage.getItem("nectar-weather-city");

    if (savedLat && savedLon) {
      return {
        lat: parseFloat(savedLat),
        lon: parseFloat(savedLon),
        city: savedCity || undefined,
      };
    }
  } catch {
    // continue to IP geolocation
  }

  // 2. Try IP-based geolocation
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      const lat = data.latitude || data.lat;
      const lon = data.longitude || data.lon;
      if (lat && lon) {
        return rememberIpLocation({ lat, lon, city: data.city || undefined });
      }
    }
  } catch {
    // try fallback
  }

  // 3. Fallback IP geolocation via HTTPS
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return rememberIpLocation({ lat: data.latitude, lon: data.longitude, city: data.cityName || undefined });
      }
    }
  } catch {
    // fall through to default
  }

  // 4. More IP geolocation providers
  for (const provider of [
    { url: "https://ipwho.is/", city: "city" },
    { url: "https://get.geojs.io/v1/ip/geo.json", city: "city" },
  ]) {
    try {
      const res = await fetch(provider.url);
      if (!res.ok) continue;
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return rememberIpLocation({ lat, lon, city: data[provider.city] || undefined });
      }
    } catch {
      // try the next one
    }
  }

  return lastIpLocation();
}

async function persistWeather(
  temp: number | null,
  condition: string,
  apparent: number | null,
  humidity: number | null,
): Promise<void> {
  if (temp !== null) {
    invoke("save_setting", {
      key: "nectar-weather-cached-temp",
      value: temp,
    }).catch(() => {});
  }
  if (condition) {
    invoke("save_setting", {
      key: "nectar-weather-cached-condition",
      value: condition,
    }).catch(() => {});
  }
  if (apparent !== null) {
    invoke("save_setting", {
      key: "nectar-weather-cached-apparent",
      value: apparent,
    }).catch(() => {});
  }
  if (humidity !== null) {
    invoke("save_setting", {
      key: "nectar-weather-cached-humidity",
      value: humidity,
    }).catch(() => {});
  }
}

export function useWeather(enabled: boolean, active = true, dashboardEnabled = false) {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [temperature, setTemperature] = useState<number | null>(() => {
    const cached = localStorage.getItem("nectar-weather-cached-temp");
    return cached !== null ? Number(cached) : null;
  });
  const [weatherCondition, setWeatherCondition] = useState<string>(
    () => localStorage.getItem("nectar-weather-cached-condition") || "",
  );
  const [apparentTemperature, setApparentTemperature] = useState<number | null>(() => {
    const cached = localStorage.getItem("nectar-weather-cached-apparent");
    return cached !== null ? Number(cached) : null;
  });
  const [humidity, setHumidity] = useState<number | null>(() => {
    const cached = localStorage.getItem("nectar-weather-cached-humidity");
    return cached !== null ? Number(cached) : null;
  });
  const [weatherIcon, setWeatherIcon] = useState<ComponentType<LucideProps>>(
    () => Thermometer,
  );
  const [cityName, setCityName] = useState<string>(
    () => localStorage.getItem("nectar-weather-city") || "",
  );
  const [tempUnit, setTempUnit] = useState<string>(
    () => localStorage.getItem("nectar-temp-unit") || "celsius",
  );

  const tempUnitRef = useRef(tempUnit);
  tempUnitRef.current = tempUnit;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const dashboardRef = useRef(dashboardEnabled);
  dashboardRef.current = dashboardEnabled;

  // Apply a full snapshot to the lightweight widget state so the pills and the
  // dashboard never disagree.
  const applySnapshot = useCallback((snap: WeatherSnapshot) => {
    setSnapshot(snap);
    const condition = conditionForCode(snap.current.weatherCode);
    setTemperature(Math.round(snap.current.temperature));
    setApparentTemperature(Math.round(snap.current.apparentTemperature));
    setHumidity(Math.round(snap.current.humidity));
    setWeatherCondition(condition);
    setWeatherIcon(() => getWeatherIcon(condition, snap.current.isDay));
    persistWeather(
      Math.round(snap.current.temperature),
      condition,
      Math.round(snap.current.apparentTemperature),
      Math.round(snap.current.humidity),
    );
  }, []);

  // Core fetch + refresh logic
  const doFetch = useCallback(
    async (showStaleOnError = true, coords?: { lat: number; lon: number }, city?: string) => {
      if (!enabledRef.current) return;

      try {
        const location = coords ? { ...coords, city: city } : await resolveLocation();
        if (!location) return;

        if (dashboardRef.current) {
          const snap = await fetchSnapshotForCoords(
            location.lat,
            location.lon,
            tempUnitRef.current,
          );
          try {
            localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
          } catch {
            // storage full or unavailable — the in-memory snapshot still works
          }
          applySnapshot(snap);
        } else {
          const result = await fetchWeatherForCoords(
            location.lat,
            location.lon,
            tempUnitRef.current,
          );

          setTemperature(result.temperature);
          setApparentTemperature(result.apparentTemperature);
          setHumidity(result.humidity);
          setWeatherCondition(result.weatherCondition);
          setWeatherIcon(() => result.weatherIcon);
          persistWeather(
            result.temperature,
            result.weatherCondition,
            result.apparentTemperature,
            result.humidity,
          );
        }

        // Update city name if resolved from IP geolocation
        if (location.city) {
          setCityName(location.city);
          localStorage.setItem("nectar-weather-city", location.city);
        }
      } catch (e) {
        console.warn("Weather fetch failed:", e);
        if (!showStaleOnError && import.meta.env.DEV) {
          const mockTemp = tempUnitRef.current === "fahrenheit" ? 72 : 22;
          setTemperature(mockTemp);
          setApparentTemperature(mockTemp - 1);
          setHumidity(64);
          setWeatherCondition("Partly Cloudy");
          setWeatherIcon(() => Cloud);
        }
      }
    },
    [applySnapshot],
  );

  // Load cached values from Tauri settings on mount
  useEffect(() => {
    invoke("load_settings")
      .then((settings: any) => {
        const cachedTemp =
          settings["nectar-weather-cached-temp"] ??
          localStorage.getItem("nectar-weather-cached-temp");
        if (cachedTemp !== undefined && cachedTemp !== null) {
          setTemperature(Number(cachedTemp));
        }
        const cachedCond =
          settings["nectar-weather-cached-condition"] ??
          localStorage.getItem("nectar-weather-cached-condition");
        if (cachedCond) {
          setWeatherCondition(String(cachedCond));
          setWeatherIcon(() => getWeatherIcon(String(cachedCond)));
        }
        const cachedApparent =
          settings["nectar-weather-cached-apparent"] ??
          localStorage.getItem("nectar-weather-cached-apparent");
        if (cachedApparent !== undefined && cachedApparent !== null && cachedApparent !== "") {
          setApparentTemperature(Number(cachedApparent));
        }
        const cachedHumidity =
          settings["nectar-weather-cached-humidity"] ??
          localStorage.getItem("nectar-weather-cached-humidity");
        if (cachedHumidity !== undefined && cachedHumidity !== null && cachedHumidity !== "") {
          setHumidity(Number(cachedHumidity));
        }
        const savedUnit =
          settings["nectar-temp-unit"] ?? localStorage.getItem("nectar-temp-unit");
        if (savedUnit) {
          setTempUnit(String(savedUnit));
        }
        const savedCity =
          settings["nectar-weather-city"] ??
          localStorage.getItem("nectar-weather-city");
        if (savedCity) {
          setCityName(String(savedCity));
        }
      })
      .catch(() => {});
  }, []);

  // Listen for temp unit changes
  useEffect(() => {
    const unlisten = listen<{ key: string; value: any }>(
      "settings-changed",
      (event) => {
        const { key, value } = event.payload;
        if (key === "nectar-temp-unit") {
          setTempUnit(String(value));
        }
      },
    );
    const unlistenExternal = listen<{ key: string; value: any }>(
      "settings-external-changed",
      (event) => {
        const { key, value } = event.payload;
        if (key === "nectar-temp-unit") {
          setTempUnit(String(value));
        }
      },
    );
    return () => {
      unlisten.then((fn) => fn());
      unlistenExternal.then((fn) => fn());
    };
  }, []);

  // Listen for instant refresh from Settings (direct Tauri event with coords)
  useEffect(() => {
    if (!enabled) return;

    const unlisten = listen<{ lat: number; lon: number; city?: string } | true>(
      "weather-refresh",
      (event) => {
        localStorage.removeItem(SNAPSHOT_KEY);
        const payload = event.payload;
        if (
          payload &&
          typeof payload === "object" &&
          "lat" in payload &&
          "lon" in payload
        ) {
          doFetch(false, { lat: (payload as any).lat, lon: (payload as any).lon }, (payload as any).city);
        } else {
          doFetch(false);
        }
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [enabled, doFetch]);

  // Listen for city changes from Settings. The saved coordinates are read again on every refresh.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unlisten = listen<{ key: string; value: any }>(
      "settings-changed",
      (event) => {
        const { key, value } = event.payload;
        if (key === "nectar-weather-city") {
          setCityName(String(value || ""));
        }
        if (key === "nectar-weather-city" || key === "nectar-weather-lat" || key === "nectar-weather-lon") {
          clearTimeout(timer);
          localStorage.removeItem(SNAPSHOT_KEY);
          timer = setTimeout(() => doFetch(false), 250);
        }
      },
    );
    return () => {
      clearTimeout(timer);
      unlisten.then((fn) => fn());
    };
  }, [doFetch]);

  // Initial fetch + 30-min interval; paused while the notch is off screen.
  useEffect(() => {
    if (!enabled || !active) return;

    if (dashboardEnabled) {
      const cached = readSnapshotCache();
      if (cached) {
        applySnapshot(cached);
      } else {
        doFetch(false);
      }
    } else {
      doFetch(false);
    }

    const interval = setInterval(
      () => doFetch(false),
      dashboardEnabled ? DASHBOARD_REFRESH_MS : REFRESH_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [enabled, active, dashboardEnabled, doFetch, applySnapshot]);

  // Re-fetch when temperature unit changes (without resetting interval). The
  // first run is skipped because the effect above already fetched on mount.
  const unitEffectReady = useRef(false);
  useEffect(() => {
    if (!unitEffectReady.current) {
      unitEffectReady.current = true;
      return;
    }
    if (!enabled) return;
    localStorage.removeItem(SNAPSHOT_KEY);
    doFetch(true);
  }, [tempUnit, enabled, doFetch]);

  const refresh = useCallback(() => {
    localStorage.removeItem(SNAPSHOT_KEY);
    return doFetch(false);
  }, [doFetch]);

  return {
    temperature,
    apparentTemperature,
    humidity,
    weatherCondition,
    weatherIcon,
    cityName,
    tempUnit,
    snapshot,
    refresh,
  };
}
