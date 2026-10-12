import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, DatePicker, Form, Input } from "antd";
import dayjs from "dayjs";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";
import { applyApiErrors } from "../utils/forms";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ birthDate, ...values }) => {
    setError(null);
    setLoading(true);
    try {
      await register({ ...values, birthDate: birthDate.format("YYYY-MM-DD") });
      navigate("/placement", { replace: true, state: { welcome: true } });
    } catch (err) {
      setError(applyApiErrors(form, err));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      wide
      title="Öğrenci kaydı"
      subtitle="Kayıttan sonra seni doğru sınıfa yerleştirecek kısa bir seviye sınavına gireceksin."
      footer={<>Zaten hesabın var mı? <Link to="/login">Giriş yap</Link></>}
    >
      {error && <Alert type="error" showIcon message={error} />}
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="form-grid">
        <Form.Item name="firstName" label="İsim" rules={[{ required: true, min: 2, message: "İsminizi girin." }]}>
          <Input autoComplete="given-name" />
        </Form.Item>
        <Form.Item name="lastName" label="Soyisim" rules={[{ required: true, min: 2, message: "Soyisminizi girin." }]}>
          <Input autoComplete="family-name" />
        </Form.Item>
        <Form.Item name="email" label="E-posta" className="span-2" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta adresi girin." }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item name="birthDate" label="Doğum tarihi" rules={[{ required: true, message: "Doğum tarihinizi seçin." }]}>
          <DatePicker
            format="DD.MM.YYYY"
            placeholder="GG.AA.YYYY"
            style={{ width: "100%" }}
            disabledDate={(d) => d.isAfter(dayjs()) || d.year() < 1950}
            defaultPickerValue={dayjs().subtract(16, "year")}
          />
        </Form.Item>
        <Form.Item name="school" label="Okul" rules={[{ required: true, min: 2, message: "Okulunuzun adını girin." }]}>
          <Input autoComplete="organization" />
        </Form.Item>
        <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalı." }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Şifre tekrar"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Şifrenizi tekrar girin." },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || getFieldValue("password") === v ? Promise.resolve() : Promise.reject(new Error("Şifreler eşleşmiyor."))),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading} className="span-2">Kayıt ol</Button>
      </Form>
    </AuthCard>
  );
}
