import { lazy, Suspense, useState } from "react";
import { Loading } from "../components/Status";
import { DEFAULT_LANGUAGE, languageByKey } from "../utils/languages";

const CodeRunner = lazy(() => import("../components/code/CodeRunner"));
const KEY = "codevia-compiler-language";

function savedLanguage() {
  try {
    const v = localStorage.getItem(KEY);
    return languageByKey(v) ? v : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export default function Compiler() {
  const [initial] = useState(savedLanguage);
  const remember = (key) => {
    try {
      localStorage.setItem(KEY, key);
    } catch {
      /* tercih kaydedilemese de derleyici çalışır */
    }
  };
  return (
    <div className="compiler-page">
      <header className="compiler-page__head">
        <h1>Derleyici</h1>
        <p className="muted">Listeden bir dil seç, kodunu yaz ve çalıştır. JavaScript, Python, HTML/CSS ve SQL internetsiz çalışır; diğer diller derleme servisine gönderilir.</p>
      </header>
      <Suspense fallback={<Loading />}>
        <CodeRunner initialLanguage={initial} onLanguageChange={remember} />
      </Suspense>
    </div>
  );
}
