import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, Table, Tag } from "antd";
import { message } from "../utils/feedback";
import dayjs from "dayjs";
import { api } from "../api/client";
import PageBanner from "../components/PageBanner";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { LEVEL_COLOR, LEVEL_DESC, LEVEL_LABEL, formatDate } from "../utils/format";
import { applyApiErrors } from "../utils/forms";

export default function Profile() {
  const { user, setUser, isAdmin } = useAuth();
  const attempts = useApi(isAdmin ? null : "/exams/my-attempts");
  const [profileForm] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async ({ birthDate, ...values }) => {
    setSaving(true);
    try {
      const res = await api.patch("/auth/me", { ...values, birthDate: birthDate?.format("YYYY-MM-DD") });
      setUser(res.data.user);
      message.success("Bilgilerin güncellendi.");
    } catch (err) {
      message.error(applyApiErrors(profileForm, err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (values) => {
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", values);
      pwForm.resetFields();
      message.success("Şifren değiştirildi.");
    } catch (err) {
      message.error(applyApiErrors(pwForm, err));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <>
      <PageBanner title="Profilim" />
      <section className="section profile">
        <Card title="Sınıf bilgisi">
          {isAdmin ? (
            <p>Admin hesabısın. <Link to="/admin">Admin paneline git</Link></p>
          ) : user.level ? (
            <Descriptions column={1} items={[
              { key: "l", label: "Sınıfın", children: <Tag color={LEVEL_COLOR[user.level]}>{LEVEL_LABEL[user.level]}</Tag> },
              { key: "d", label: "Açıklama", children: LEVEL_DESC[user.level] },
            ]} />
          ) : (
            <Alert type="info" showIcon message="Henüz seviye sınavına girmedin." action={<Link to="/placement" className="btn btn--primary btn--sm">Sınava başla</Link>} />
          )}
        </Card>

        {!isAdmin && (
          <Card title="Sınav geçmişi">
            <Table
              size="small"
              rowKey="id"
              loading={attempts.loading}
              dataSource={attempts.data?.attempts || []}
              pagination={false}
              locale={{ emptyText: "Henüz tamamlanmış sınavın yok." }}
              scroll={{ x: true }}
              columns={[
                { title: "Sınav", dataIndex: ["exam", "title"], render: (t, a) => (a.exam.courseId ? <Link to={`/courses/${a.exam.courseId}`}>{t}</Link> : t) },
                { title: "Tarih", dataIndex: "finishedAt", render: formatDate },
                { title: "Puan", dataIndex: "score", render: (s) => `%${s}` },
                {
                  title: "Sonuç",
                  render: (_, a) =>
                    a.assignedLevel ? <Tag color={LEVEL_COLOR[a.assignedLevel]}>{LEVEL_LABEL[a.assignedLevel]}</Tag> : a.passed ? <Tag color="green">Geçti</Tag> : <Tag color="red">Kaldı</Tag>,
                },
              ]}
            />
          </Card>
        )}

        <Card title="Kişisel bilgiler">
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={saveProfile}
            initialValues={{ ...user, birthDate: user.birthDate ? dayjs(user.birthDate) : null }}
            className="form-grid"
          >
            <Form.Item name="firstName" label="İsim" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
            <Form.Item name="lastName" label="Soyisim" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
            <Form.Item label="E-posta" className="span-2"><Input value={user.email} disabled /></Form.Item>
            <Form.Item name="birthDate" label="Doğum tarihi"><DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="school" label="Okul"><Input /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Kaydet</Button>
          </Form>
        </Card>

        <Card title="Şifre değiştir">
          <Form form={pwForm} layout="vertical" onFinish={changePassword} className="form-grid">
            <Form.Item name="currentPassword" label="Mevcut şifre" rules={[{ required: true, message: "Mevcut şifreni gir." }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item name="newPassword" label="Yeni şifre" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalı." }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button htmlType="submit" loading={pwSaving}>Şifreyi değiştir</Button>
          </Form>
        </Card>
      </section>
    </>
  );
}
