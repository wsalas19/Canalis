import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  initialMediaState,
  initialSystemState,
  initialUiState,
  mediaReducer,
  systemReducer,
  uiReducer,
  type CcView,
  type InteractionState,
  type LanStatus,
  type MediaInfo,
  type MediaSession,
  type MediaState,
  type NectarMode,
  type Settable,
  type SystemState,
  type UiState,
  type WifiStatus,
} from "./appReducer";
import type { WidgetConfig } from "../components/StatusWidgetConfig";

export interface MediaActions {
  setIsPlaying: (value: Settable<boolean>) => void;
  setMediaInfo: (value: Settable<MediaInfo>) => void;
  setAlbumArtUrl: (value: Settable<string | null>) => void;
  setAlbumArtKey: (value: Settable<number>) => void;
  setVolume: (value: Settable<number>) => void;
  setIsMuted: (value: Settable<boolean>) => void;
  setMediaSessions: (value: Settable<MediaSession[]>) => void;
}

export interface SystemActions {
  setBatteryLevel: (value: Settable<number>) => void;
  setIsCharging: (value: Settable<boolean>) => void;
  setBatterySecondsLeft: (value: Settable<number | null>) => void;
  setHasBattery: (value: Settable<boolean>) => void;
  setBatterySaverEnabled: (value: Settable<boolean>) => void;
  setCurrentBrightness: (value: Settable<number>) => void;
  setCpuUsage: (value: Settable<number>) => void;
  setRamUsage: (value: Settable<number>) => void;
  setDiskSpace: (value: Settable<number>) => void;
  setNetUpSpeed: (value: Settable<number>) => void;
  setNetDownSpeed: (value: Settable<number>) => void;
  setWifiStatus: (value: Settable<WifiStatus | null>) => void;
  setBluetoothEnabled: (value: Settable<boolean>) => void;
  setLanStatus: (value: Settable<LanStatus | null>) => void;
  setStatusWidgets: (value: Settable<WidgetConfig>) => void;
}

export interface UiActions {
  setIsHovered: (value: Settable<boolean>) => void;
  setIsNotchHovered: (value: Settable<boolean>) => void;
  setIsVisible: (value: Settable<boolean>) => void;
  setIsImpacted: (value: Settable<boolean>) => void;
  setIsExpanded: (value: Settable<boolean>) => void;
  setIsFullscreen: (value: Settable<boolean>) => void;
  setIsOverlapped: (value: Settable<boolean>) => void;
  setIsEdgeHovered: (value: Settable<boolean>) => void;
  setInteractionState: (value: Settable<InteractionState>) => void;
  setNectarMode: (value: Settable<NectarMode>) => void;
  setCcView: (value: Settable<CcView>) => void;
  setIsReady: (value: Settable<boolean>) => void;
}

const MediaStateContext = createContext<MediaState | null>(null);
const MediaActionsContext = createContext<MediaActions | null>(null);
const SystemStateContext = createContext<SystemState | null>(null);
const SystemActionsContext = createContext<SystemActions | null>(null);
const UiStateContext = createContext<UiState | null>(null);
const UiActionsContext = createContext<UiActions | null>(null);

function required<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`${name} must be used inside its provider`);
  return value;
}

export function useMediaState(): MediaState {
  return required(useContext(MediaStateContext), "useMediaState");
}

export function useMediaActions(): MediaActions {
  return required(useContext(MediaActionsContext), "useMediaActions");
}

export function useSystemState(): SystemState {
  return required(useContext(SystemStateContext), "useSystemState");
}

export function useSystemActions(): SystemActions {
  return required(useContext(SystemActionsContext), "useSystemActions");
}

export function useUiState(): UiState {
  return required(useContext(UiStateContext), "useUiState");
}

export function useUiActions(): UiActions {
  return required(useContext(UiActionsContext), "useUiActions");
}

export function MediaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(mediaReducer, initialMediaState);
  const actions = useMemo<MediaActions>(
    () => ({
      setIsPlaying: (value) => dispatch({ key: "isPlaying", value }),
      setMediaInfo: (value) => dispatch({ key: "mediaInfo", value }),
      setAlbumArtUrl: (value) => dispatch({ key: "albumArtUrl", value }),
      setAlbumArtKey: (value) => dispatch({ key: "albumArtKey", value }),
      setVolume: (value) => dispatch({ key: "volume", value }),
      setIsMuted: (value) => dispatch({ key: "isMuted", value }),
      setMediaSessions: (value) => dispatch({ key: "mediaSessions", value }),
    }),
    [],
  );
  return (
    <MediaStateContext.Provider value={state}>
      <MediaActionsContext.Provider value={actions}>{children}</MediaActionsContext.Provider>
    </MediaStateContext.Provider>
  );
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(systemReducer, initialSystemState);
  const actions = useMemo<SystemActions>(
    () => ({
      setBatteryLevel: (value) => dispatch({ key: "batteryLevel", value }),
      setIsCharging: (value) => dispatch({ key: "isCharging", value }),
      setBatterySecondsLeft: (value) => dispatch({ key: "batterySecondsLeft", value }),
      setHasBattery: (value) => dispatch({ key: "hasBattery", value }),
      setBatterySaverEnabled: (value) => dispatch({ key: "batterySaverEnabled", value }),
      setCurrentBrightness: (value) => dispatch({ key: "currentBrightness", value }),
      setCpuUsage: (value) => dispatch({ key: "cpuUsage", value }),
      setRamUsage: (value) => dispatch({ key: "ramUsage", value }),
      setDiskSpace: (value) => dispatch({ key: "diskSpace", value }),
      setNetUpSpeed: (value) => dispatch({ key: "netUpSpeed", value }),
      setNetDownSpeed: (value) => dispatch({ key: "netDownSpeed", value }),
      setWifiStatus: (value) => dispatch({ key: "wifiStatus", value }),
      setBluetoothEnabled: (value) => dispatch({ key: "bluetoothEnabled", value }),
      setLanStatus: (value) => dispatch({ key: "lanStatus", value }),
      setStatusWidgets: (value) => dispatch({ key: "statusWidgets", value }),
    }),
    [],
  );
  return (
    <SystemStateContext.Provider value={state}>
      <SystemActionsContext.Provider value={actions}>{children}</SystemActionsContext.Provider>
    </SystemStateContext.Provider>
  );
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialUiState);
  const actions = useMemo<UiActions>(
    () => ({
      setIsHovered: (value) => dispatch({ key: "isHovered", value }),
      setIsNotchHovered: (value) => dispatch({ key: "isNotchHovered", value }),
      setIsVisible: (value) => dispatch({ key: "isVisible", value }),
      setIsImpacted: (value) => dispatch({ key: "isImpacted", value }),
      setIsExpanded: (value) => dispatch({ key: "isExpanded", value }),
      setIsFullscreen: (value) => dispatch({ key: "isFullscreen", value }),
      setIsOverlapped: (value) => dispatch({ key: "isOverlapped", value }),
      setIsEdgeHovered: (value) => dispatch({ key: "isEdgeHovered", value }),
      setInteractionState: (value) => dispatch({ key: "interactionState", value }),
      setNectarMode: (value) => dispatch({ key: "nectarMode", value }),
      setCcView: (value) => dispatch({ key: "ccView", value }),
      setIsReady: (value) => dispatch({ key: "isReady", value }),
    }),
    [],
  );
  return (
    <UiStateContext.Provider value={state}>
      <UiActionsContext.Provider value={actions}>{children}</UiActionsContext.Provider>
    </UiStateContext.Provider>
  );
}
