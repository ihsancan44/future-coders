import { useCallback, useEffect, useState } from "react";
import { api, apiError } from "../api/client";

/** GET isteğini yükler; { data, error, loading, reload, setData } döndürür. url null ise istek atmaz. */
export function useApi(url, params) {
  const paramKey = JSON.stringify(params || {});
  const key = url ? `${url}?${paramKey}` : null;
  const [state, setState] = useState({ key: null, data: null, error: null, fetching: false });

  const load = useCallback(async () => {
    if (!key) return;
    setState((s) => ({ ...s, fetching: true, error: null }));
    try {
      const res = await api.get(url, { params: JSON.parse(paramKey) });
      setState({ key, data: res.data, error: null, fetching: false });
    } catch (err) {
      setState({ key, data: null, error: apiError(err), fetching: false });
    }
  }, [key, url, paramKey]);

  useEffect(() => {
    load();
  }, [load]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
  }, []);

  // Adres değiştiğinde eski adresin verisi asla döndürülmez.
  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== null && (!current || state.fetching),
    reload: load,
    setData,
  };
}
