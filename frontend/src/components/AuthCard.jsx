import PropTypes from "prop-types";

export default function AuthCard({ title, subtitle, children, footer, wide }) {
  return (
    <section className="auth">
      <div className={`auth__card ${wide ? "auth__card--wide" : ""}`}>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <div className="auth__footer">{footer}</div>}
      </div>
    </section>
  );
}
AuthCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  wide: PropTypes.bool,
};
