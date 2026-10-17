import { apiError } from "../api/client";

/** API alan hatalarını antd Form alanlarına, genel hatayı geri döner. */
export function applyApiErrors(form, err) {
  const { message, fields } = apiError(err);
  const list = Object.entries(fields || {})
    .filter(([name]) => name !== "_")
    // "practice.0.text" → ["practice", 0, "text"]: antd liste alanlarında sıra numarası sayı olmalı.
    .map(([name, msg]) => ({ name: name.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)), errors: [msg] }));
  if (list.length) form.setFields(list);
  return message;
}
