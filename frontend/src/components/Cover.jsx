import PropTypes from "prop-types";
import { assetUrl } from "../api/client";

const palettes = [
  ["#053471", "#1b5fb8"],
  ["#d30e40", "#f0566f"],
  ["#0f6b5b", "#22a38a"],
  ["#4b2a86", "#7c58c4"],
  ["#8a4b0f", "#d38a2f"],
];

/** Görseli yoksa başlığa göre renkli bir kapak çizer; dışarıdan görsel çekmez. */
export default function Cover({ image, title, label, className = "" }) {
  const src = assetUrl(image);
  if (src) return <img className={`cover ${className}`} src={src} alt="" loading="lazy" />;
  const sum = [...(title || "")].reduce((s, c) => s + c.charCodeAt(0), 0);
  const [a, b] = palettes[sum % palettes.length];
  return (
    <div className={`cover cover--generated ${className}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} aria-hidden="true">
      <span className="cover__glyph">{"</>"}</span>
      {label && <span className="cover__label">{label}</span>}
    </div>
  );
}
Cover.propTypes = { image: PropTypes.string, title: PropTypes.string, label: PropTypes.string, className: PropTypes.string };
