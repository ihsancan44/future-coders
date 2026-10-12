import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Form, Input, Switch } from "antd";
import { message } from "../../utils/feedback";
import { api } from "../../api/client";
import ImageUpload from "../../components/ImageUpload";
import { ErrorState, Loading } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { applyApiErrors } from "../../utils/forms";

export default function BlogEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data, error, loading, reload } = useApi(isNew ? null : `/admin/blog/${id}`);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.post) form.setFieldsValue(data.post);
  }, [data, form]);

  if (!isNew && loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const save = async (values) => {
    setSaving(true);
    try {
      if (isNew) await api.post("/admin/blog", values);
      else await api.put(`/admin/blog/${id}`, values);
      message.success("Yazı kaydedildi.");
      navigate("/admin/blog");
    } catch (err) {
      message.error(applyApiErrors(form, err));
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <Link to="/admin/blog">← Yazılar</Link>
          <h1>{isNew ? "Yeni yazı" : "Yazıyı düzenle"}</h1>
        </div>
      </div>
      <Card>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ tag: "Yol Haritası", published: false }} className="form-grid">
          <Form.Item name="title" label="Başlık" className="span-2" rules={[{ required: true, min: 3, message: "Başlık en az 3 karakter olmalı." }]}><Input /></Form.Item>
          <Form.Item name="tag" label="Etiket" rules={[{ required: true, min: 2, message: "Etiket girin." }]}><Input placeholder="Yol Haritası, Kariyer, Duyuru..." /></Form.Item>
          <Form.Item name="published" label="Yayında" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="summary" label="Özet" className="span-2" rules={[{ required: true, message: "Özet girin." }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={400} showCount /></Form.Item>
          <Form.Item name="content" label="Metin" className="span-2" extra="Paragrafları boş bir satırla ayırın." rules={[{ required: true, message: "Yazı içeriği girin." }]}>
            <Input.TextArea autoSize={{ minRows: 10, maxRows: 30 }} />
          </Form.Item>
          <Form.Item name="coverImage" label="Görsel" className="span-2"><ImageUpload /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Kaydet</Button>
        </Form>
      </Card>
    </div>
  );
}
