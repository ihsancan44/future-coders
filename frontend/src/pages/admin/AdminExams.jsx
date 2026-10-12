import { Link, useNavigate } from "react-router-dom";
import { Button, Popconfirm, Switch, Table, Tag } from "antd";
import { message } from "../../utils/feedback";
import { Plus } from "lucide-react";
import { api, apiError } from "../../api/client";
import { ErrorState } from "../../components/Status";
import { useApi } from "../../hooks/useApi";

export default function AdminExams() {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useApi("/admin/exams");

  const togglePublish = async (exam, published) => {
    try {
      await api.patch(`/admin/exams/${exam.id}/publish`, { published });
      message.success(published ? "Sınav yayınlandı." : "Sınav gizlendi.");
      reload(); // Seviye sınavı yayınlanınca diğerleri gizlenir.
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/exams/${id}`);
      setData((d) => ({ exams: d.exams.filter((e) => e.id !== id) }));
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Sınavlar</h1>
        <div className="row-actions">
          <Button icon={<Plus size={16} />} onClick={() => navigate("/admin/exams/new?type=PLACEMENT")}>Seviye sınavı</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate("/admin/exams/new?type=FINAL")}>Final sınavı</Button>
        </div>
      </div>
      <p className="muted">Aynı anda tek bir seviye sınavı yayında olabilir. Yeni bir seviye sınavı yayınlandığında eskisi otomatik gizlenir.</p>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.exams || []}
        scroll={{ x: true }}
        columns={[
          { title: "Sınav", dataIndex: "title", render: (t, e) => <Link to={`/admin/exams/${e.id}`}>{t}</Link> },
          { title: "Tür", dataIndex: "type", render: (t) => (t === "PLACEMENT" ? <Tag color="purple">Seviye</Tag> : <Tag color="blue">Final</Tag>) },
          { title: "Kurs", dataIndex: ["course", "title"], render: (t) => t || "—" },
          { title: "Soru", dataIndex: ["_count", "questions"], align: "right" },
          { title: "Deneme", dataIndex: ["_count", "attempts"], align: "right" },
          { title: "Geçme", dataIndex: "passingScore", render: (s) => `%${s}` },
          { title: "Yayında", dataIndex: "published", render: (v, e) => <Switch checked={v} onChange={(x) => togglePublish(e, x)} aria-label="Yayın durumu" /> },
          {
            title: "",
            render: (_, e) => (
              <div className="row-actions">
                <Link to={`/admin/exams/${e.id}`}>Düzenle</Link>
                <Popconfirm title="Sınav silinsin mi?" description="Sorular ve öğrenci denemeleri de silinir." okText="Sil" okButtonProps={{ danger: true }} cancelText="Vazgeç" onConfirm={() => remove(e.id)}>
                  <Button type="link" danger>Sil</Button>
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
