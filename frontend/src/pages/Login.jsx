import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Checkbox, Form, Input } from "antd";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";
import { applyApiErrors } from "../utils/forms";
import { usePageMeta } from "../hooks/usePageMeta";
import { PAGES } from "../seo/pages";

export default function Login() {
  usePageMeta(PAGES["/login"]);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setError(null);
    setLoading(true);
    try {
      const user = await login(values);
      const fallback = user.role === "ADMIN" ? "/admin" : user.level ? "/courses" : "/placement";
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(applyApiErrors(form, err));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Tekrar hoş geldin"
      subtitle="Hesabına giriş yap ve kaldığın yerden devam et."
      footer={<>Hesabın yok mu? <Link to="/register">Kayıt ol</Link></>}
    >
      {error && <Alert type="error" showIcon message={error} />}
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ remember: true }} requiredMark={false}>
        <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta adresi girin." }]}>
          <Input autoComplete="email" size="large" />
        </Form.Item>
        <Form.Item name="password" label="Şifre" rules={[{ required: true, message: "Şifrenizi girin." }]}>
          <Input.Password autoComplete="current-password" size="large" />
        </Form.Item>
        <div className="auth__row">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Beni hatırla</Checkbox>
          </Form.Item>
          <Link to="/forgot-password">Şifremi unuttum</Link>
        </div>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>Giriş yap</Button>
      </Form>
    </AuthCard>
  );
}
