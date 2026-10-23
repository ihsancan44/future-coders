import { Link } from "react-router-dom";
import { Result } from "antd";
import { usePageMeta } from "../hooks/usePageMeta";

export default function NotFound() {
  usePageMeta({ title: "Sayfa bulunamadı", noindex: true });
  return (
    <Result
      status="404"
      title="Sayfa bulunamadı"
      subTitle="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
      extra={<Link to="/" className="btn btn--primary">Ana sayfaya dön</Link>}
    />
  );
}
