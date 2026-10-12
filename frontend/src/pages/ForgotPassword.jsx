import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import AuthCard from "../components/AuthCard";
import { api } from "../api/client";
import { applyApiErrors } from "../utils/forms";

export default function ForgotPassword() {
  const [form] = Form.useForm();
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", values);
      setDone(res.data.message);
    } catch (err) {
      setError(applyApiErrors(form, err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Şifremi unuttum"
      subtitle="E-posta adresini yaz, sana şifre sıfırlama bağlantısı gönderelim."
      footer={<><Link to="/login">Girişe dön</Link></>}
    >
      {done ? (
        <Alert type="success" showIcon message={done} />
      ) : (
        <>
          {error && <Alert type="error" showIcon message={error} />}
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta adresi girin." }]}>
              <Input autoComplete="email" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>Bağlantı gönder</Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
