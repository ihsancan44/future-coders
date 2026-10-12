import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import AuthCard from "../components/AuthCard";
import { api } from "../api/client";
import { applyApiErrors } from "../utils/forms";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form] = Form.useForm();
  const [done, setDone] = useState(null);
  const [error, setError] = useState(token ? null : "Bağlantı eksik. Lütfen e-postadaki bağlantıyı açın.");
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { ...values, token });
      setDone(res.data.message);
    } catch (err) {
      setError(applyApiErrors(form, err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Yeni şifre belirle" footer={<Link to="/forgot-password">Yeni bağlantı iste</Link>}>
      {done ? (
        <>
          <Alert type="success" showIcon message={done} />
          <Link to="/login" className="btn btn--primary">Giriş yap</Link>
        </>
      ) : (
        <>
          {error && <Alert type="error" showIcon message={error} />}
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} disabled={!token}>
            <Form.Item name="password" label="Yeni şifre" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalı." }]}>
              <Input.Password autoComplete="new-password" size="large" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Yeni şifre tekrar"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Şifrenizi tekrar girin." },
                ({ getFieldValue }) => ({
                  validator: (_, v) => (!v || getFieldValue("password") === v ? Promise.resolve() : Promise.reject(new Error("Şifreler eşleşmiyor."))),
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>Şifreyi güncelle</Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
