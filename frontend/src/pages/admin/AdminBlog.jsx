import { Link, useNavigate } from "react-router-dom";
import { Button, Popconfirm, Switch, Table, Tag } from "antd";
import { message } from "../../utils/feedback";
import { Plus } from "lucide-react";
import { api, apiError } from "../../api/client";
import { ErrorState } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { formatDate } from "../../utils/format";

export default function AdminBlog() {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useApi("/admin/blog");

  const togglePublish = async (post, published) => {
    try {
      await api.patch(`/admin/blog/${post.id}/publish`, { published });
      setData((d) => ({ posts: d.posts.map((p) => (p.id === post.id ? { ...p, published } : p)) }));
      message.success(published ? "Yazı yayınlandı." : "Yazı gizlendi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/blog/${id}`);
      setData((d) => ({ posts: d.posts.filter((p) => p.id !== id) }));
      message.success("Yazı silindi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Yol haritası blog</h1>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate("/admin/blog/new")}>Yazı ekle</Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.posts || []}
        scroll={{ x: true }}
        columns={[
          { title: "Başlık", dataIndex: "title", render: (t, p) => <Link to={`/admin/blog/${p.id}`}>{t}</Link> },
          { title: "Etiket", dataIndex: "tag", render: (t) => <Tag>{t}</Tag> },
          { title: "Yazar", dataIndex: "author" },
          { title: "Tarih", dataIndex: "createdAt", render: formatDate },
          { title: "Yayında", dataIndex: "published", render: (v, p) => <Switch checked={v} onChange={(x) => togglePublish(p, x)} aria-label="Yayın durumu" /> },
          {
            title: "",
            render: (_, p) => (
              <div className="row-actions">
                <Link to={`/admin/blog/${p.id}`}>Düzenle</Link>
                <Popconfirm title="Yazı silinsin mi?" okText="Sil" okButtonProps={{ danger: true }} cancelText="Vazgeç" onConfirm={() => remove(p.id)}>
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
