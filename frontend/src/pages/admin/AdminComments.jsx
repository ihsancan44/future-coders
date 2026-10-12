import { Link } from "react-router-dom";
import { Button, Popconfirm, Table } from "antd";
import { message } from "../../utils/feedback";
import { api, apiError } from "../../api/client";
import { ErrorState } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { formatDate } from "../../utils/format";

export default function AdminComments() {
  const { data, error, loading, reload, setData } = useApi("/admin/comments");

  const remove = async (id) => {
    try {
      await api.delete(`/admin/comments/${id}`);
      setData((d) => ({ comments: d.comments.filter((c) => c.id !== id) }));
      message.success("Yorum silindi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="admin-page">
      <h1>Yorumlar</h1>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.comments || []}
        scroll={{ x: true }}
        columns={[
          { title: "Yorum", dataIndex: "content", width: "45%" },
          { title: "Yazan", dataIndex: "author" },
          { title: "Kurs", dataIndex: "course", render: (c) => <Link to={`/courses/${c.id}`}>{c.title}</Link> },
          { title: "Tarih", dataIndex: "createdAt", render: formatDate },
          {
            title: "",
            render: (_, c) => (
              <Popconfirm title="Yorum silinsin mi?" okText="Sil" okButtonProps={{ danger: true }} cancelText="Vazgeç" onConfirm={() => remove(c.id)}>
                <Button type="link" danger>Sil</Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </div>
  );
}
