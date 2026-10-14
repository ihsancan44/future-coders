import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { AuthProvider } from "./context/AuthContext";
import FeedbackBridge from "./components/FeedbackBridge";
import { router } from "./routes";
import "./styles/global.css";

dayjs.locale("tr");

const theme = {
  token: {
    colorPrimary: "#053471",
    colorLink: "#1b5fb8",
    colorError: "#d30e40",
    borderRadius: 8,
    fontFamily: '"Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 15,
    // Açıklama/ipucu metinleri beyaz zeminde WCAG AA kontrastına (4.5:1) ulaşsın.
    colorTextTertiary: "rgba(0, 0, 0, 0.65)",
    colorTextDescription: "rgba(0, 0, 0, 0.65)",
  },
  components: {
    Menu: { itemSelectedBg: "#e7eefa", itemSelectedColor: "#053471" },
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider locale={trTR} theme={theme}>
      <AntApp>
        <FeedbackBridge />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
