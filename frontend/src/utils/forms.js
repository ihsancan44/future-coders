import { apiError } from "../api/client";

/** API alan hatalarını antd Form alanlarına, genel hatayı geri döner. */
export function applyApiErrors(form, err) {
  const { message, fields } = apiError(err);
  const list = Object.entries(fields || {})
    .filter(([name]) => name !== "_")
    .map(([name, msg]) => ({ name: name.split("."), errors: [msg] }));
  if (list.length) form.setFields(list);
  return message;
}
