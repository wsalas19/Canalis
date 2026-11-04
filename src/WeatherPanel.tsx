import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CloudRain,
  Droplets,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
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

const TREND_HOURS = 12;
const TREND_INSET = 4; // percent of horizontal padding so edge labels don't clip
const TREND_WIDTH = 100 - TREND_INSET * 2;

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
  // UV is meaningless after dark; the API reports 0 because the sun is down,
  // not because the day is mild. Open-Meteo's is_day follows sunrise/sunset.
  const showUv = current.isDay && current.uvIndex !== null;
  const hours = snapshot.hourly.slice(0, TREND_HOURS);
  const rainChance = hours[0]?.precipProbability ?? 0;
  const sunrise = snapshot.daily[0]?.sunrise ?? "";
  const sunset = snapshot.daily[0]?.sunset ?? "";

  const temps = hours.map((hour) => hour.temperature);
  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTemp = temps.length ? Math.max(...temps) : 0;
  const tempPad = Math.max(1, (maxTemp - minTemp) * 0.18);
  const tempFloor = minTemp - tempPad;
  const tempCeil = maxTemp + tempPad;
  const xAt = (index: number) =>
    TREND_INSET + (hours.length <= 1 ? 0 : (index / (hours.length - 1)) * TREND_WIDTH);
  const yAt = (temperature: number) =>
    76 - ((temperature - tempFloor) / (tempCeil - tempFloor)) * 54;
  const linePoints = hours.map((hour, index) => `${xAt(index)},${yAt(hour.temperature)}`).join(" ");
  const areaPoints = `${TREND_INSET},100 ${linePoints} ${100 - TREND_INSET},100`;

  const trendStart = hours.length ? new Date(hours[0].time).getTime() : 0;
  const trendEnd = hours.length ? new Date(hours[hours.length - 1].time).getTime() : 0;
  const sunsetMs = sunset ? new Date(sunset).getTime() : Number.NaN;
  const sunsetAt =
    Number.isFinite(sunsetMs) && trendEnd > trendStart && sunsetMs > trendStart && sunsetMs < trendEnd
      ? TREND_INSET + ((sunsetMs - trendStart) / (trendEnd - trendStart)) * TREND_WIDTH
      : null;

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

      <div className="weather-trend">
        <div className="weather-trend-chart">
          <div className="weather-trend-rain" aria-hidden="true">
            {hours.map((hour, index) => (
              <span
                key={hour.time}
                style={{
                  left: `${xAt(index)}%`,
                  height: `${Math.max(2, hour.precipProbability * 0.4)}%`,
                }}
              />
            ))}
          </div>

          <svg
            className="weather-trend-line"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="weather-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.16)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </linearGradient>
            </defs>
            <polygon points={areaPoints} fill="url(#weather-trend-fill)" />
            <polyline
              points={linePoints}
              fill="none"
              stroke="rgba(255, 255, 255, 0.72)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {hours.map((hour, index) => (
            <div
              className="weather-trend-point"
              key={hour.time}
              style={{ left: `${xAt(index)}%`, top: `${yAt(hour.temperature)}%` }}
            >
              <span className="weather-trend-value">{round(hour.temperature)}°</span>
              <span className="weather-trend-dot" />
            </div>
          ))}

          {sunsetAt !== null && (
            <div className="weather-trend-sunset" style={{ left: `${sunsetAt}%` }}>
              <span className="weather-trend-sunset-label">
                <Sunset size={9} strokeWidth={2} />
                {clock(sunset)}
              </span>
            </div>
          )}
        </div>

        <div className="weather-trend-times" aria-hidden="true">
          {hours.map((hour, index) =>
            index % 2 === 0 ? (
              <span key={hour.time} style={{ left: `${xAt(index)}%` }}>
                {clock(hour.time)}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <div className="weather-metrics">
        <div className="weather-metric">
          <CloudRain size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.rain")}</span>
          <span className="weather-metric-value">{round(rainChance)}%</span>
        </div>
        {showUv && (
          <div className={`weather-metric weather-metric--uv weather-metric--${band}`}>
            <Sun size={11} strokeWidth={2} />
            <span className="weather-metric-label">{t("weather.dashboard.uv")}</span>
            <span className="weather-metric-value">
              {round(uv)} · {t(`weather.uv.${band}`)}
            </span>
          </div>
        )}
        <div className="weather-metric">
          <Sunrise size={11} strokeWidth={2} />
          <span className="weather-metric-label">{t("weather.dashboard.sun")}</span>
          <span className="weather-metric-value">
            {clock(sunrise)} / {clock(sunset)}
          </span>
        </div>
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
