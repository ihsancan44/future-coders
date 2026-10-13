import { Link, useNavigate } from "react-router-dom";
import { Button, Popconfirm, Switch, Table, Tag, Typography } from "antd";
import { message } from "../../utils/feedback";
import { Plus } from "lucide-react";
import { api, apiError } from "../../api/client";
import { ErrorState } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { LEVEL_COLOR, LEVEL_LABEL, formatDate } from "../../utils/format";

export default function AdminCourses() {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useApi("/admin/courses");

  const togglePublish = async (course, published) => {
    try {
      await api.patch(`/admin/courses/${course.id}/publish`, { published });
      setData((d) => ({ courses: d.courses.map((c) => (c.id === course.id ? { ...c, published } : c)) }));
      message.success(published ? "Kurs yayınlandı." : "Kurs gizlendi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const rename = async (course, value) => {
    const title = value.trim();
    if (title === course.title) return;
    if (title.length < 3) return message.error("Başlık en az 3 karakter olmalı.");
    try {
      await api.put(`/admin/courses/${course.id}`, { title });
      setData((d) => ({ courses: d.courses.map((c) => (c.id === course.id ? { ...c, title } : c)) }));
      message.success("Kurs başlığı güncellendi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/courses/${id}`);
      setData((d) => ({ courses: d.courses.filter((c) => c.id !== id) }));
      message.success("Kurs silindi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Kurslar</h1>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate("/admin/courses/new")}>Kurs ekle</Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.courses || []}
        scroll={{ x: true }}
        columns={[
          {
            title: "Başlık",
            dataIndex: "title",
            render: (t, c) => (
              <Typography.Text editable={{ text: t, tooltip: "Başlığı düzenle", onChange: (v) => rename(c, v) }}>
                <Link to={`/admin/courses/${c.id}`}>{t}</Link>
              </Typography.Text>
            ),
          },
          { title: "Kategori", dataIndex: "category" },
          { title: "Sınıf", dataIndex: "level", render: (l) => <Tag color={LEVEL_COLOR[l]}>{LEVEL_LABEL[l]}</Tag> },
          { title: "Ders", dataIndex: "lessonCount", align: "right" },
          { title: "Final", dataIndex: "hasFinalExam", render: (v) => (v ? "Var" : "Yok") },
          { title: "Oluşturma", dataIndex: "createdAt", render: formatDate },
          {
            title: "Yayında",
            dataIndex: "published",
            render: (p, c) => <Switch checked={p} onChange={(v) => togglePublish(c, v)} aria-label="Yayın durumu" />,
          },
          {
            title: "",
            render: (_, c) => (
              <div className="row-actions">
                <Link to={`/admin/courses/${c.id}`}>Düzenle</Link>
                <Popconfirm
                  title="Kurs silinsin mi?"
                  description="Dersler, yorumlar ve final sınavı da silinir."
                  okText="Sil"
                  okButtonProps={{ danger: true }}
                  cancelText="Vazgeç"
                  onConfirm={() => remove(c.id)}
                >
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
