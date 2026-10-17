import PropTypes from "prop-types";

/** `kod` ve **kalın** biçimlerini satır içinde gösterir. */
function inline(text, keyBase) {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

/**
 * Asistan cevaplarındaki basit Markdown'ı (kod blokları, satır içi kod, kalın yazı, listeler) güvenle gösterir.
 * HTML olarak eklenmez: metin React öğelerine bölünür, böylece cevaptaki etiketler çalışmaz.
 */
export default function RichText({ text }) {
  const blocks = text.split(/```[\w+#-]*\n?([\s\S]*?)```/g);
  return (
    <div className="rich">
      {blocks.map((block, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="rich__code">
            <code>{block.replace(/\n$/, "")}</code>
          </pre>
        ) : (
          block
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, j) =>
              /^([-*]|\d+\.)\s/.test(p) ? (
                <ul key={`${i}-${j}`}>
                  {p.split("\n").map((li, k) => (
                    <li key={k}>{inline(li.replace(/^([-*]|\d+\.)\s+/, ""), `${i}-${j}-${k}`)}</li>
                  ))}
                </ul>
              ) : (
                <p key={`${i}-${j}`}>
                  {p.split("\n").map((line, k) => (
                    <span key={k}>
                      {k > 0 && <br />}
                      {inline(line, `${i}-${j}-${k}`)}
                    </span>
                  ))}
                </p>
              ),
            )
        ),
      )}
    </div>
  );
}

RichText.propTypes = { text: PropTypes.string.isRequired };
