import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useT } from "../i18n";
import "./WindowControls.css";

const glyphProps = {
  width: 10,
  height: 10,
  viewBox: "0 0 10 10",
  "aria-hidden": true,
};

function MinimizeGlyph() {
  return (
    <svg {...glyphProps}>
      <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MaximizeGlyph({ restored }: { restored: boolean }) {
  return restored ? (
    <svg {...glyphProps}>
      <path d="M2.5 2.5v-1.5h6v6h-1.5M1.5 3.5h5v5h-5z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ) : (
    <svg {...glyphProps}>
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg {...glyphProps}>
      <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function WindowControls() {
  const t = useT();
  const [focused, setFocused] = useState(true);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWebviewWindow();
    const syncMaximized = () => {
      win.isMaximized().then(setMaximized).catch(() => {});
    };
    syncMaximized();
    const unlistenFocus = win.onFocusChanged(({ payload }) => setFocused(payload));
    const unlistenResize = win.onResized(syncMaximized);
    return () => {
      unlistenFocus.then((fn) => fn());
      unlistenResize.then((fn) => fn());
    };
  }, []);

  const win = getCurrentWebviewWindow();
  const toggleMaximize = () => {
    (maximized ? win.unmaximize() : win.maximize()).catch(() => {});
  };

  return (
    <div className={`wc${focused ? "" : " blurred"}`}>
      <button
        className="wc-btn minimize"
        aria-label={t("window.minimize")}
        onClick={() => win.minimize().catch(() => {})}
      >
        <MinimizeGlyph />
      </button>
      <button
        className="wc-btn maximize"
        aria-label={maximized ? t("window.restore") : t("window.maximize")}
        onClick={toggleMaximize}
      >
        <MaximizeGlyph restored={maximized} />
      </button>
      <button className="wc-btn close" aria-label={t("window.close")} onClick={() => win.hide().catch(() => {})}>
        <CloseGlyph />
      </button>
    </div>
  );
}
