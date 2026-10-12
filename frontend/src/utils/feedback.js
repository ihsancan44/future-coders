// antd'nin message/modal fonksiyonlarını tema ve dil ayarlarıyla kullanabilmek için
// <AntApp> içindeki FeedbackBridge bu nesneleri doldurur.
import { message as staticMessage, Modal } from "antd";

const holder = { message: staticMessage, modal: Modal };

export const setFeedback = (message, modal) => {
  holder.message = message;
  holder.modal = modal;
};

export const message = {
  success: (...a) => holder.message.success(...a),
  error: (...a) => holder.message.error(...a),
  info: (...a) => holder.message.info(...a),
  warning: (...a) => holder.message.warning(...a),
};

export const confirm = (config) => holder.modal.confirm(config);
