import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CloudRain,
  Droplets,
  Eye,
  Gauge,
  RefreshCw,
  Sun,
  Sunrise,
  Thermometer,
  Wind,
} from "lucide-react";
import { useT } from "./i18n";
import {
  conditionForCode,
  getWeatherIcon,
  type WeatherDay,
  type WeatherSnapshot,
} from "./hooks/useWeather";
import "./WeatherPanel.css";

interface WeatherPanelProps {
  snapshot: WeatherSnapshot | null;
  cityName: string;
  tempUnit: string;
  hour12: boolean;
  onRefresh: () => void;
}

const compass = (degrees: number) => {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(degrees / 45) % 8];
};

const uvBand = (index: number) =>
  index < 3 ? "low" : index < 6 ? "moderate" : index < 8 ? "high" : index < 11 ? "veryhigh" : "extreme";

export function WeatherPanel({ snapshot, cityName, tempUnit, hour12, onRefresh }: WeatherPanelProps) {
  const t = useT();
  const unit = tempUnit === "fahrenheit" ? "F" : "C";
  const round = (value: number) => Math.round(value);

  const conditionLabel = (condition: string) => {
    const key = `weather.condition.${condition.toLowerCase().replace(/ /g, "")}`;
    const label = t(key);
    return label === key ? condition : label;
  };

  const clock = (iso: string) => {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso.slice(11, 16);
    return date.toLocaleTimeString(undefined, { hour: "numeric", hour12 });
  };

  const dayName = (day: WeatherDay, index: number) => {
    if (index === 0) return t("weather.dashboard.today");
    const date = new Date(`${day.date}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? day.date
      : date.toLocaleDateString(undefined, { weekday: "short" });
  };

  if (!snapshot) {
    return (
      <div className="weather-panel weather-panel--empty">
        <span>{t("weather.dashboard.loading")}</span>
      </div>
    );
  }

  const current = snapshot.current;
  const condition = conditionForCode(current.weatherCode);
  const HeroIcon = getWeatherIcon(condition, current.isDay);
  const uv = current.uvIndex ?? 0;
  const band = uvBand(uv);
  const nowHour = snapshot.hourly[0];
  const rainChance = nowHour?.precipProbability ?? 0;
  const visibility =
    current.visibility === null ? "—" : `${(current.visibility / 1000).toFixed(1)} km`;
  const sunrise = snapshot.daily[0]?.sunrise ?? "";
  const sunset = snapshot.daily[0]?.sunset ?? "";

  return (
    <div className="weather-panel">
      <div className="weather-head">
        <div className="weather-head-main">
          <span className="weather-city">{cityName || t("weather.dashboard.location")}</span>
          <span className="weather-condition">{conditionLabel(condition)}</span>
        </div>
        <button
          className="weather-refresh"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          title={t("weather.dashboard.refresh")}
          aria-label={t("weather.dashboard.refresh")}
        >
          <RefreshCw size={12} strokeWidth={2} />
        </button>
      </div>

      <div className="weather-hero">
        <HeroIcon size={34} strokeWidth={1.5} className="weather-hero-icon" />
        <span className="weather-temp">{round(current.temperature)}°</span>
        <span className="weather-unit">{unit}</span>
        <div className="weather-hero-side">
          <span>
            <Thermometer size={10} strokeWidth={2} />
            {t("weather.dashboard.feels")} {round(current.apparentTemperature)}°
          </span>
          <span>
            <Droplets size={10} strokeWidth={2} />
            {t("weather.dashboard.humidity")} {round(current.humidity)}%
          </span>
        </div>
      </div>

      <div className="weather-metrics">
        <div className="weather-metric">
          <Wind size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.wind")}</span>
          <span className="weather-metric-value">
            {round(current.windSpeed)} km/h {compass(current.windDirection)}
          </span>
        </div>
        <div className="weather-metric">
          <CloudRain size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.rain")}</span>
          <span className="weather-metric-value">{round(rainChance)}%</span>
        </div>
        <div className={`weather-metric weather-metric--uv weather-metric--${band}`}>
          <Sun size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.uv")}</span>
          <span className="weather-metric-value">
            {round(uv)} · {t(`weather.uv.${band}`)}
          </span>
        </div>
        <div className="weather-metric">
          <Gauge size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.pressure")}</span>
          <span className="weather-metric-value">{round(current.pressure)} hPa</span>
        </div>
        <div className="weather-metric">
          <Eye size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.visibility")}</span>
          <span className="weather-metric-value">{visibility}</span>
        </div>
        <div className="weather-metric">
          <Sunrise size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.sun")}</span>
          <span className="weather-metric-value">
            {clock(sunrise)} / {clock(sunset)}
          </span>
        </div>
      </div>

      <div className="weather-hours">
        {snapshot.hourly.slice(0, 10).map((hour) => {
          const HourIcon = getWeatherIcon(conditionForCode(hour.weatherCode), hour.isDay);
          return (
            <div className="weather-hour" key={hour.time}>
              <span className="weather-hour-time">{clock(hour.time)}</span>
              <HourIcon size={13} strokeWidth={1.8} className="weather-hour-icon" />
              <span className="weather-hour-temp">{round(hour.temperature)}°</span>
              <span
                className="weather-hour-rain"
                style={{ opacity: 0.15 + (hour.precipProbability / 100) * 0.85 }}
              >
                {round(hour.precipProbability)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="weather-days">
        {snapshot.daily.map((day, index) => {
          const DayIcon = getWeatherIcon(conditionForCode(day.weatherCode), true);
          return (
            <div className="weather-day" key={day.date}>
              <span className="weather-day-name">{dayName(day, index)}</span>
              <DayIcon size={13} strokeWidth={1.8} className="weather-day-icon" />
              <span className="weather-day-temp">
                {round(day.tempMax)}° / {round(day.tempMin)}°
              </span>
              <span className="weather-day-rain">{round(day.precipProbabilityMax)}%</span>
            </div>
          );
        })}
      </div>

      <div className="weather-panel-credit">
        <span>{t("notch.weather.credit")}</span>{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.preventDefault();
            openUrl("https://open-meteo.com/").catch(() => {});
          }}
        >
          Open-Meteo.com
        </a>
      </div>
    </div>
  );
}
