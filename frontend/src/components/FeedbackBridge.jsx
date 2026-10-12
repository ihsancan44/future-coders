import { App } from "antd";
import { setFeedback } from "../utils/feedback";

export default function FeedbackBridge() {
  const { message, modal } = App.useApp();
  setFeedback(message, modal);
  return null;
}
