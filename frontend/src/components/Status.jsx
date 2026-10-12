import PropTypes from "prop-types";
import { Button, Result, Spin } from "antd";

export function Loading({ tip = "Yükleniyor..." }) {
  return (
    <div className="state-box" role="status">
      <Spin />
      <span>{tip}</span>
    </div>
  );
}
Loading.propTypes = { tip: PropTypes.string };

export function ErrorState({ message, onRetry }) {
  return (
    <Result
      status="warning"
      title={message || "Bir şeyler ters gitti."}
      extra={onRetry ? <Button onClick={onRetry}>Tekrar dene</Button> : null}
    />
  );
}
ErrorState.propTypes = { message: PropTypes.string, onRetry: PropTypes.func };
