import type { WidgetConfig } from "../components/StatusWidgetConfig";

export interface WifiStatus {
  enabled: boolean;
  connected: boolean;
}

export interface LanStatus {
  present: boolean;
  connected: boolean;
  name: string;
}

export interface MediaInfo {
  title: string;
  artist: string;
  album?: string;
  is_playing: boolean;
  has_media: boolean;
  artwork?: string[];
  position_ms?: number;
  duration_ms?: number;
  seek_enabled?: boolean;
  position_updated_at?: number;
}

export interface MediaSession {
  id: string;
  name: string;
  title: string;
  is_playing: boolean;
  active: boolean;
}

export type NectarMode = "music" | "calendar" | "command-center" | "status" | "shelf" | "tour" | "weather";
export type CcView = "main" | "wifi" | "bluetooth" | "audio";
export type InteractionState = "active" | "grace" | "none";

export interface MediaState {
  isPlaying: boolean;
  mediaInfo: MediaInfo;
  albumArtUrl: string | null;
  albumArtKey: number;
  volume: number;
  isMuted: boolean;
  mediaSessions: MediaSession[];
}

export interface SystemState {
  batteryLevel: number;
  isCharging: boolean;
  batterySecondsLeft: number | null;
  hasBattery: boolean;
  batterySaverEnabled: boolean;
  currentBrightness: number;
  cpuUsage: number;
  ramUsage: number;
  diskSpace: number;
  netUpSpeed: number;
  netDownSpeed: number;
  wifiStatus: WifiStatus | null;
  bluetoothEnabled: boolean;
  lanStatus: LanStatus | null;
  statusWidgets: WidgetConfig;
}

export interface UiState {
  isHovered: boolean;
  isNotchHovered: boolean;
  isVisible: boolean;
  isImpacted: boolean;
  isExpanded: boolean;
  isFullscreen: boolean;
  isOverlapped: boolean;
  isEdgeHovered: boolean;
  interactionState: InteractionState;
  nectarMode: NectarMode;
  ccView: CcView;
  isReady: boolean;
}

// A setter keeps the useState call sites unchanged while the actual update logic
// lives in the reducer below.
export type Settable<T> = T | ((prev: T) => T);

export type MediaAction = {
  [K in keyof MediaState]: { key: K; value: Settable<MediaState[K]> };
}[keyof MediaState];

export type SystemAction = {
  [K in keyof SystemState]: { key: K; value: Settable<SystemState[K]> };
}[keyof SystemState];

export type UiAction = {
  [K in keyof UiState]: { key: K; value: Settable<UiState[K]> };
}[keyof UiState];

function applyUpdate<T>(prev: T, next: Settable<T>): T {
  return typeof next === "function" ? (next as (p: T) => T)(prev) : next;
}

export function mediaReducer(state: MediaState, action: MediaAction): MediaState {
  const current = state[action.key];
  const next = applyUpdate(current, action.value as Settable<typeof current>);
  return { ...state, [action.key]: next } as MediaState;
}

export function systemReducer(state: SystemState, action: SystemAction): SystemState {
  const current = state[action.key];
  const next = applyUpdate(current, action.value as Settable<typeof current>);
  return { ...state, [action.key]: next } as SystemState;
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  const current = state[action.key];
  const next = applyUpdate(current, action.value as Settable<typeof current>);
  return { ...state, [action.key]: next } as UiState;
}

export const initialMediaState: MediaState = {
  isPlaying: false,
  mediaInfo: { title: "", artist: "", is_playing: false, has_media: false },
  albumArtUrl: null,
  albumArtKey: 0,
  volume: 0.5,
  isMuted: false,
  mediaSessions: [],
};

export const initialSystemState: SystemState = {
  batteryLevel: 100,
  isCharging: false,
  batterySecondsLeft: null,
  hasBattery: localStorage.getItem("nectar-has-battery") !== "false",
  batterySaverEnabled: false,
  currentBrightness: 50,
  cpuUsage: 0,
  ramUsage: 0,
  diskSpace: 0,
  netUpSpeed: 0,
  netDownSpeed: 0,
  wifiStatus: null,
  bluetoothEnabled: true,
  lanStatus: null,
  statusWidgets: { left: ["weather"], right: ["battery"] },
};

export const initialUiState: UiState = {
  isHovered: false,
  isNotchHovered: false,
  isVisible: true,
  isImpacted: false,
  isExpanded: false,
  isFullscreen: false,
  isOverlapped: false,
  isEdgeHovered: false,
  interactionState: "none",
  nectarMode: "status",
  ccView: "main",
  isReady: false,
};
