import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button, Input, Select, Tag, Tooltip } from "antd";
import CodeMirror from "@uiw/react-codemirror";
import { Bot, ChevronDown, ChevronUp, Globe, Laptop, Play, RotateCcw, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { LANGUAGES, languageByKey } from "../../utils/languages";
import { editorLanguage } from "./editorLanguage";
import { runCode } from "./runCode";

/** available: sunucuda gerçekten derlenebilen diller (null: bilinmiyor, hepsi gösterilir). */
const languageOptions = (available) => [
  { label: "Tarayıcıda çalışır (internetsiz)", options: LANGUAGES.filter((l) => l.runtime === "browser").map((l) => ({ value: l.key, label: l.label })) },
  {
    label: "Derleme servisinde çalışır (internet gerekir)",
    options: LANGUAGES.filter((l) => l.runtime === "server").map((l) => {
      const off = Array.isArray(available) && !available.includes(l.key);
      return { value: l.key, label: off ? `${l.label} (şu an kullanılamıyor)` : l.label, disabled: off };
    }),
  },
];

function ResultTables({ tables }) {
  return tables.map((t, i) => (
    <div className="runner__table-wrap" key={i}>
      <table className="runner__table">
        <thead>
          <tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {t.rows.map((r, j) => (
            <tr key={j}>{r.map((v, k) => <td key={k}>{v === null ? "NULL" : String(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  ));
}

/**
 * Dil seçmeli kod editörü ve çalıştırıcı. Her dilin kodu ayrı tutulur: dil değiştirip geri gelince yazdığın kod durur.
 * `initialCode` verilirse başlangıç dilinin kodu odur (örn. bir videonun başlangıç kodu).
 */
export default function CodeRunner({ initialLanguage, initialCode, onClose, onAsk, onLanguageChange, title, compact = false }) {
  const { mode } = useTheme();
  const { user } = useAuth();
  const [language, setLanguage] = useState(languageByKey(initialLanguage) ? initialLanguage : "python");
  const [codes, setCodes] = useState(() => ({ [language]: initialCode || languageByKey(language).starter }));
  const [extensions, setExtensions] = useState([]);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const runId = useRef(0);
  const location = useLocation();
  const server = useApi("/code/languages");
  const options = useMemo(() => languageOptions(server.data?.enabled === false ? [] : server.data?.server), [server.data]);

  const lang = languageByKey(language);
  const code = codes[language] ?? lang.starter;

  // Yeni bir video ya da örnek kod açılınca editör o kodla yeniden başlar.
  useEffect(() => {
    if (!initialLanguage || !languageByKey(initialLanguage)) return;
    setLanguage(initialLanguage);
    setCodes((c) => ({ ...c, [initialLanguage]: initialCode || languageByKey(initialLanguage).starter }));
    setResult(null);
  }, [initialLanguage, initialCode]);

  useEffect(() => {
    let alive = true;
    editorLanguage(lang.editor).then((ext) => alive && setExtensions(ext));
    return () => {
      alive = false;
    };
  }, [lang.editor]);

  const choose = (key) => {
    setLanguage(key);
    setResult(null);
    onLanguageChange?.(key);
  };

  const run = useCallback(async () => {
    const id = ++runId.current;
    setRunning(true);
    setResult(null);
    const r = await runCode(language, code, stdin, { onStatus: (t) => id === runId.current && setStatus(t) });
    if (id !== runId.current) return;
    setResult(r);
    setRunning(false);
    setStatus("");
  }, [language, code, stdin]);

  const keymap = useMemo(
    () => (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running) run();
      }
    },
    [run, running],
  );

  const needsLogin = lang.runtime === "server" && !user;
  const output = result && !result.preview ? `${result.compileOutput || ""}${result.stdout || ""}${result.stderr || ""}` : "";

  return (
    <section className={`runner ${compact ? "runner--compact" : ""}`} aria-label="Derleyici">
      <div className="runner__bar">
        {title && <strong className="runner__title">{title}</strong>}
        <label htmlFor="runner-language" className="sr-only">Programlama dili</label>
        <Select
          id="runner-language"
          className="runner__select"
          value={language}
          onChange={choose}
          options={options}
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={260}
        />
        <Tooltip title={lang.runtime === "browser" ? "Bu dil senin tarayıcında çalışır, internet gerekmez." : "Kod derleme servisine gönderilip orada çalıştırılır."}>
          <Tag className="runner__where" icon={lang.runtime === "browser" ? <Laptop size={12} /> : <Globe size={12} />}>
            {lang.runtime === "browser" ? "Tarayıcıda" : "Sunucuda"}
          </Tag>
        </Tooltip>
        <span className="runner__spacer" />
        <Tooltip title="Başlangıç koduna dön">
          <Button
            icon={<RotateCcw size={15} />}
            aria-label="Başlangıç koduna dön"
            onClick={() => setCodes((c) => ({ ...c, [language]: language === initialLanguage && initialCode ? initialCode : lang.starter }))}
          />
        </Tooltip>
        <Tooltip title="Çalıştır (Ctrl + Enter)">
          <Button type="primary" icon={<Play size={15} />} loading={running} onClick={run} disabled={needsLogin || !code.trim()}>
            Çalıştır
          </Button>
        </Tooltip>
        {onAsk && (
          <Tooltip title="Kodunu ve çıktısını Codevia Asistan'a sor">
            <Button
              icon={<Bot size={16} />}
              aria-label="Kodu Asistan'a sor"
              disabled={!code.trim()}
              onClick={() => onAsk({ label: lang.label, editor: lang.editor, code, output })}
            />
          </Tooltip>
        )}
        {onClose && <Button type="text" icon={<X size={16} />} aria-label="Derleyiciyi kapat" onClick={onClose} />}
      </div>

      <div className="runner__editor" onKeyDown={keymap}>
        <CodeMirror
          value={code}
          onChange={(v) => setCodes((c) => ({ ...c, [language]: v }))}
          extensions={extensions}
          theme={mode === "dark" ? "dark" : "light"}
          basicSetup={{ foldGutter: false, highlightActiveLineGutter: true }}
          aria-label={`${lang.label} kodu`}
          height="100%"
        />
      </div>

      {lang.key !== "web" && lang.key !== "sql" && (
        <div className="runner__stdin">
          <button type="button" className="runner__toggle" onClick={() => setShowStdin((v) => !v)} aria-expanded={showStdin}>
            {showStdin ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Girdi (input) {stdin ? "· dolu" : ""}
          </button>
          {showStdin && (
            <Input.TextArea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Programın okuyacağı satırlar (her satır bir input)"
              autoSize={{ minRows: 2, maxRows: 5 }}
              aria-label="Program girdisi"
            />
          )}
        </div>
      )}

      <div className="runner__output" role="status" aria-live="polite">
        <div className="runner__output-head">
          <span>{lang.key === "web" ? "Önizleme" : "Çıktı"}</span>
          {result && result.exitCode !== undefined && result.exitCode !== null && !result.preview && (
            <span className={result.exitCode === 0 ? "ok" : "err"}>{result.exitCode === 0 ? "Başarıyla bitti" : `Hata ile bitti (kod ${result.exitCode})`}</span>
          )}
        </div>
        {needsLogin ? (
          <p className="runner__hint">
            {lang.label} kodu derleme servisinde çalışır. Çalıştırmak için <Link to="/login" state={{ from: location.pathname + location.search }}>giriş yap</Link>.
          </p>
        ) : status || running ? (
          <p className="runner__hint">{status || "Çalışıyor…"}</p>
        ) : result?.preview !== undefined ? (
          <iframe className="runner__preview" title="Web önizlemesi" sandbox="allow-scripts allow-modals" srcDoc={result.preview} />
        ) : result ? (
          <>
            {result.tables?.length ? <ResultTables tables={result.tables} /> : null}
            {output && (
              <pre className="runner__pre">
                {result.compileOutput && <span className="err">{result.compileOutput}</span>}
                {result.stdout}
                {result.stderr && <span className="err">{result.stderr}</span>}
              </pre>
            )}
            {!output && !result.tables?.length && <p className="runner__hint">Program bir şey yazdırmadı.</p>}
          </>
        ) : (
          <p className="runner__hint">Kodunu yaz ve <b>Çalıştır</b>'a bas.</p>
        )}
      </div>
    </section>
  );
}

CodeRunner.propTypes = {
  initialLanguage: PropTypes.string,
  initialCode: PropTypes.string,
  onClose: PropTypes.func,
  onAsk: PropTypes.func,
  onLanguageChange: PropTypes.func,
  title: PropTypes.node,
  compact: PropTypes.bool,
};
