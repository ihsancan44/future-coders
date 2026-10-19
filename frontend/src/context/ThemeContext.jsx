import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import trTR from "antd/locale/tr_TR";

const STORAGE_KEY = "codevia-theme";
const ThemeContext = createContext({ mode: "light", toggle: () => {} });

function initialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Gizli sekmede localStorage kapalı olabilir; sistem tercihine düşülür.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const shared = {
  borderRadius: 8,
  fontFamily: '"Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontSize: 15,
};

const themes = {
  light: {
    algorithm: antTheme.defaultAlgorithm,
    token: {
      ...shared,
      colorPrimary: "#053471",
      colorLink: "#1b5fb8",
      colorError: "#d30e40",
      // Açıklama/ipucu metinleri beyaz zeminde WCAG AA kontrastına (4.5:1) ulaşsın.
      colorTextTertiary: "rgba(0, 0, 0, 0.65)",
      colorTextDescription: "rgba(0, 0, 0, 0.65)",
    },
    components: { Menu: { itemSelectedBg: "#e7eefa", itemSelectedColor: "#053471" } },
  },
  dark: {
    algorithm: antTheme.darkAlgorithm,
    token: {
      ...shared,
      colorPrimary: "#2563c9",
      // Üzerine gelince açılan ton beyaz yazıyla 4.5:1 kontrastı korusun.
      colorPrimaryHover: "#3a6dc0",
      colorLink: "#7fb0ff",
      colorError: "#ff5c7f",
      colorBgBase: "#0b1222",
      colorBgContainer: "#141e35",
      colorBgElevated: "#1a2542",
      colorBorder: "#2a3654",
      colorBorderSecondary: "#232f4b",
      colorTextTertiary: "rgba(255, 255, 255, 0.65)",
      colorTextDescription: "rgba(255, 255, 255, 0.65)",
    },
    components: {
      Menu: { itemSelectedBg: "#1d2b4d", itemSelectedColor: "#9cc2ff", darkItemBg: "#0f182c" },
      // Seçili sekme yazısı koyu zeminde okunsun (varsayılan mavi 2.7:1 kalıyordu).
      Tabs: { itemSelectedColor: "#9cc2ff", itemHoverColor: "#b8d3ff", itemActiveColor: "#9cc2ff", inkBarColor: "#9cc2ff" },
    },
  },
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Tercih kaydedilemese de tema bu oturumda çalışır.
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === "dark" ? "light" : "dark")), []);
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={trTR} theme={themes[mode]}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
ThemeProvider.propTypes = { children: PropTypes.node };

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
