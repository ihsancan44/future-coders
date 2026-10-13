import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Button, Card, Descriptions, Drawer, Empty, Form, Input, Popconfirm, Progress, Table, Tag } from "antd";
import { message } from "../../utils/feedback";
import { api, apiError } from "../../api/client";
import { ErrorState, Loading } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { applyApiErrors } from "../../utils/forms";
import { LEVEL_COLOR, LEVEL_LABEL, formatDate, formatDay } from "../../utils/format";

/** Üyenin bilgileri, kurs ilerlemesi ve sınav sonuçları; bilgileri düzenleme ve üyeyi silme. */
export default function MemberDrawer({ userId, isSelf, onClose, onUpdated, onDeleted }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { data, error, loading, reload, setData } = useApi(userId ? `/admin/users/${userId}` : null);
  const user = data?.user;

  useEffect(() => {
    if (user) form.setFieldsValue({ firstName: user.firstName, lastName: user.lastName, school: user.school || "" });
  }, [user, form]);

  const save = async (values) => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/users/${userId}`, values);
      setData((d) => ({ ...d, user: { ...d.user, ...res.data.user } }));
      onUpdated(res.data.user);
      message.success("Üye bilgileri güncellendi.");
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/users/${userId}`);
      onDeleted(userId);
      message.success("Üye silindi.");
      onClose();
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  return (
    <Drawer open={Boolean(userId)} onClose={onClose} width={640} title={user ? `${user.firstName} ${user.lastName}` : "Üye"} destroyOnClose>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : user ? (
        <div className="admin-page">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="E-posta">{user.email}</Descriptions.Item>
            <Descriptions.Item label="Rol">{user.role === "ADMIN" ? "Admin" : "Öğrenci"}</Descriptions.Item>
            <Descriptions.Item label="Sınıf">{user.level ? <Tag color={LEVEL_COLOR[user.level]}>{LEVEL_LABEL[user.level]}</Tag> : "Seviye sınavına girmedi"}</Descriptions.Item>
            <Descriptions.Item label="Okul">{user.school || "—"}</Descriptions.Item>
            <Descriptions.Item label="Doğum tarihi">{user.birthDate ? formatDay(user.birthDate) : "—"}</Descriptions.Item>
            <Descriptions.Item label="Seçtiği alan">{user.careerTitle ? `${user.careerTitle} (${formatDate(user.careerChosenAt)})` : "—"}</Descriptions.Item>
            <Descriptions.Item label="Yorum sayısı">{user.commentCount}</Descriptions.Item>
            <Descriptions.Item label="Kayıt tarihi">{formatDate(user.createdAt)}</Descriptions.Item>
          </Descriptions>

          <Card title="Kurs ilerlemesi" size="small">
            {data.courses.length ? (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={data.courses}
                columns={[
                  { title: "Kurs", dataIndex: "title" },
                  { title: "İlerleme", render: (_, c) => <Progress percent={c.percent} size="small" format={() => `${c.completed}/${c.total}`} /> },
                  { title: "Kurs sonu testi", dataIndex: "finalPassed", render: (p) => (p ? <Tag color="green">Geçti</Tag> : "—") },
                ]}
              />
            ) : (
              <Empty description="Henüz bir derse başlamadı." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          <Card title="Sınav sonuçları" size="small">
            {data.attempts.length ? (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={data.attempts}
                columns={[
                  { title: "Sınav", render: (_, a) => a.exam.title },
                  { title: "Puan", render: (_, a) => `%${a.score} (${a.correctCount}/${a.totalCount})` },
                  {
                    title: "Sonuç",
                    render: (_, a) =>
                      a.exam.type === "PLACEMENT" ? (
                        <Tag color={LEVEL_COLOR[a.assignedLevel]}>{LEVEL_LABEL[a.assignedLevel]}</Tag>
                      ) : (
                        <Tag color={a.passed ? "green" : "red"}>{a.passed ? "Geçti" : "Kaldı"}</Tag>
                      ),
                  },
                  { title: "Tarih", dataIndex: "finishedAt", render: formatDate },
                ]}
              />
            ) : (
              <Empty description="Henüz sınava girmedi." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          <Card title="Bilgileri düzenle" size="small">
            <Form form={form} layout="vertical" onFinish={save}>
              <Form.Item name="firstName" label="İsim" rules={[{ required: true, min: 2, message: "İsim en az 2 karakter olmalı." }]}><Input /></Form.Item>
              <Form.Item name="lastName" label="Soyisim" rules={[{ required: true, min: 2, message: "Soyisim en az 2 karakter olmalı." }]}><Input /></Form.Item>
              <Form.Item name="school" label="Okul"><Input /></Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>Kaydet</Button>
            </Form>
          </Card>

          {!isSelf && (
            <Popconfirm
              title="Üye silinsin mi?"
              description="Hesabı, ilerlemesi, sınav sonuçları ve yorumları kalıcı olarak silinir."
              okText="Sil"
              cancelText="Vazgeç"
              okButtonProps={{ danger: true }}
              onConfirm={remove}
            >
              <Button danger>Üyeyi sil</Button>
            </Popconfirm>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

MemberDrawer.propTypes = {
  userId: PropTypes.number,
  isSelf: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onUpdated: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};
