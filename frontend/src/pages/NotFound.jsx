import { Link } from "react-router-dom";
import { Result } from "antd";

export default function NotFound() {
  return (
    <Result
      status="404"
      title="Sayfa bulunamadı"
      subTitle="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
      extra={<Link to="/" className="btn btn--primary">Ana sayfaya dön</Link>}
    />
  );
}
