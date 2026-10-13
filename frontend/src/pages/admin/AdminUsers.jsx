import { useState } from "react";
import { Input, Popconfirm, Segmented, Select, Table } from "antd";
import { message } from "../../utils/feedback";
import { api, apiError } from "../../api/client";
import { ErrorState } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/format";
import MemberDrawer from "./MemberDrawer";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [level, setLevel] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const { data, error, loading, reload, setData } = useApi("/admin/users", { level: level || undefined, role: role || undefined, search: search || undefined });

  const replace = (user) => setData((d) => ({ users: d.users.map((u) => (u.id === user.id ? user : u)) }));

  const remove = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setData((d) => ({ users: d.users.filter((u) => u.id !== id) }));
      message.success("Üye silindi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const update = async (id, body) => {
    try {
      const res = await api.patch(`/admin/users/${id}`, body);
      setData((d) => ({ users: d.users.map((u) => (u.id === id ? res.data.user : u)) }));
      message.success("Kullanıcı güncellendi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const resetPlacement = async (id) => {
    try {
      const res = await api.post(`/admin/users/${id}/reset-placement`);
      setData((d) => ({ users: d.users.map((u) => (u.id === id ? res.data.user : u)) }));
      message.success("Seviye sınavı sıfırlandı; öğrenci sınava yeniden girebilir.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Üyeler</h1>
        <span className="muted">{data ? `${data.users.length} üye` : ""}</span>
      </div>
      <div className="filters">
        <Input.Search placeholder="İsim, e-posta veya okul ara" allowClear onSearch={(v) => setSearch(v.trim())} className="filters__search" />
        <Segmented
          value={level}
          onChange={setLevel}
          options={[{ label: "Tümü", value: "" }, { label: "Alpha", value: "ALPHA" }, { label: "Beta", value: "BETA" }, { label: "Sınava girmedi", value: "NONE" }]}
        />
        <Select
          value={role}
          onChange={setRole}
          className="filters__select"
          style={{ minWidth: 130 }}
          options={[{ value: "", label: "Tüm roller" }, { value: "STUDENT", label: "Öğrenciler" }, { value: "ADMIN", label: "Adminler" }]}
          aria-label="Rol filtresi"
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.users || []}
        scroll={{ x: true }}
        columns={[
          { title: "Ad soyad", render: (_, u) => <a onClick={() => setSelected(u.id)}>{u.firstName} {u.lastName}</a> },
          { title: "E-posta", dataIndex: "email" },
          { title: "Okul", dataIndex: "school", render: (s) => s || "—" },
          { title: "Kayıt", dataIndex: "createdAt", render: formatDate },
          {
            title: "Sınıf",
            dataIndex: "level",
            render: (l, u) =>
              u.role === "ADMIN" ? "—" : (
                <Select
                  size="small"
                  value={l || ""}
                  style={{ width: 130 }}
                  onChange={(v) => update(u.id, { level: v || null })}
                  options={[{ value: "", label: "Sınava girmedi" }, { value: "ALPHA", label: "Alpha" }, { value: "BETA", label: "Beta" }]}
                  aria-label="Sınıf"
                />
              ),
          },
          {
            title: "Rol",
            dataIndex: "role",
            render: (r, u) => (
              <Select
                size="small"
                value={r}
                disabled={u.id === me.id}
                style={{ width: 110 }}
                onChange={(v) => update(u.id, { role: v })}
                options={[{ value: "STUDENT", label: "Öğrenci" }, { value: "ADMIN", label: "Admin" }]}
                aria-label="Rol"
              />
            ),
          },
          {
            title: "",
            render: (_, u) => (
              <div className="row-actions">
                <a onClick={() => setSelected(u.id)}>Detay</a>
                {u.role === "STUDENT" && u.level && (
                  <Popconfirm title="Seviye sınavı sıfırlansın mı?" description="Öğrencinin sınıfı silinir ve sınava yeniden girer." okText="Sıfırla" cancelText="Vazgeç" onConfirm={() => resetPlacement(u.id)}>
                    <a>Sınavı sıfırla</a>
                  </Popconfirm>
                )}
                {u.id !== me.id && (
                  <Popconfirm title="Üye silinsin mi?" description="Hesabı, ilerlemesi, sınav sonuçları ve yorumları kalıcı olarak silinir." okText="Sil" cancelText="Vazgeç" okButtonProps={{ danger: true }} onConfirm={() => remove(u.id)}>
                    <a className="danger-link">Sil</a>
                  </Popconfirm>
                )}
              </div>
            ),
          },
        ]}
      />
      <MemberDrawer
        userId={selected}
        isSelf={selected === me.id}
        onClose={() => setSelected(null)}
        onUpdated={replace}
        onDeleted={(id) => setData((d) => ({ users: d.users.filter((u) => u.id !== id) }))}
      />
    </div>
  );
}
