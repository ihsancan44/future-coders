import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export default function PageBanner({ title, crumb, children }) {
  return (
    <section className="page-banner">
      <div className="page-banner__inner">
        <h1>{title}</h1>
        <nav aria-label="Konum" className="crumbs">
          <Link to="/">Ana Sayfa</Link> / <span>{crumb || title}</span>
        </nav>
        {children}
      </div>
    </section>
  );
}
PageBanner.propTypes = { title: PropTypes.string.isRequired, crumb: PropTypes.string, children: PropTypes.node };
