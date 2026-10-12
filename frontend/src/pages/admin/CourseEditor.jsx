import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table } from "antd";
import { message } from "../../utils/feedback";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { api, apiError } from "../../api/client";
import ImageUpload from "../../components/ImageUpload";
import { ErrorState, Loading } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { formatDuration } from "../../utils/format";
import { applyApiErrors } from "../../utils/forms";

const levelOptions = [
  { value: "ALL", label: "Herkese açık" },
  { value: "ALPHA", label: "Alpha (başlangıç)" },
  { value: "BETA", label: "Beta (ileri)" },
];

function LessonModal({ courseId, lesson, open, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) form.setFieldsValue(lesson || { title: "", content: "", videoUrl: "", durationMinutes: 10 });
  }, [open, lesson, form]);

  const save = async (values) => {
    setSaving(true);
    try {
      const res = lesson
        ? await api.put(`/admin/courses/${courseId}/lessons/${lesson.id}`, values)
        : await api.post(`/admin/courses/${courseId}/lessons`, values);
      onSaved(res.data.lesson);
      onClose();
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={lesson ? "Dersi düzenle" : "Ders ekle"} open={open} onCancel={onClose} onOk={() => form.submit()} okText="Kaydet" cancelText="Vazgeç" confirmLoading={saving} destroyOnClose width={640}>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="title" label="Ders başlığı" rules={[{ required: true, message: "Başlık girin." }]}><Input /></Form.Item>
        <Form.Item name="videoUrl" label="Video adresi" extra="YouTube veya Vimeo bağlantısı yapıştırın.">
          <Input placeholder="https://www.youtube.com/watch?v=..." />
        </Form.Item>
        <Form.Item name="durationMinutes" label="Süre (dakika)"><InputNumber min={0} max={1000} /></Form.Item>
        <Form.Item name="content" label="Ders açıklaması" extra="Paragrafları boş bir satırla ayırın.">
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

LessonModal.propTypes = {
  courseId: PropTypes.number.isRequired,
  lesson: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default function CourseEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data, error, loading, reload, setData } = useApi(isNew ? null : `/admin/courses/${id}`);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, lesson: null });

  useEffect(() => {
    if (data?.course) form.setFieldsValue(data.course);
  }, [data, form]);

  if (!isNew && loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const course = data?.course;
  const lessons = course?.lessons || [];

  const save = async (values) => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post("/admin/courses", values);
        message.success("Kurs oluşturuldu. Şimdi ders ekleyebilirsiniz.");
        navigate(`/admin/courses/${res.data.course.id}`, { replace: true });
      } else {
        const { published: _p, ...rest } = values;
        const res = await api.put(`/admin/courses/${id}`, rest);
        setData((d) => ({ course: { ...d.course, ...res.data.course } }));
        message.success("Kurs kaydedildi.");
      }
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  const setPublished = async (published) => {
    try {
      await api.patch(`/admin/courses/${id}/publish`, { published });
      setData((d) => ({ course: { ...d.course, published } }));
      message.success(published ? "Kurs yayınlandı." : "Kurs gizlendi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const move = async (index, dir) => {
    const ids = lessons.map((l) => l.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    try {
      const res = await api.put(`/admin/courses/${id}/lessons-order`, { lessonIds: ids });
      setData((d) => ({ course: { ...d.course, lessons: res.data.lessons } }));
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const removeLesson = async (lessonId) => {
    try {
      await api.delete(`/admin/courses/${id}/lessons/${lessonId}`);
      setData((d) => ({ course: { ...d.course, lessons: d.course.lessons.filter((l) => l.id !== lessonId) } }));
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const onLessonSaved = (lesson) =>
    setData((d) => {
      const exists = d.course.lessons.some((l) => l.id === lesson.id);
      return { course: { ...d.course, lessons: exists ? d.course.lessons.map((l) => (l.id === lesson.id ? lesson : l)) : [...d.course.lessons, lesson] } };
    });

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <Link to="/admin/courses">← Kurslar</Link>
          <h1>{isNew ? "Yeni kurs" : course.title}</h1>
        </div>
        {!isNew && (
          <div className="row-actions">
            <span>Yayında</span>
            <Switch checked={course.published} onChange={setPublished} aria-label="Yayın durumu" />
            {course.published && <Link to={`/courses/${course.id}`} target="_blank">Sitede gör</Link>}
          </div>
        )}
      </div>

      <Card title="Kurs bilgileri">
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ level: "ALL", category: "Frontend" }} className="form-grid">
          <Form.Item name="title" label="Başlık" className="span-2" rules={[{ required: true, min: 3, message: "Başlık en az 3 karakter olmalı." }]}><Input /></Form.Item>
          <Form.Item name="category" label="Kategori" rules={[{ required: true, message: "Kategori girin." }]}><Input placeholder="Frontend, Programlama, Backend..." /></Form.Item>
          <Form.Item name="level" label="Hangi sınıfa açık?" rules={[{ required: true }]}><Select options={levelOptions} /></Form.Item>
          <Form.Item name="summary" label="Kısa açıklama (kartlarda görünür)" className="span-2" rules={[{ required: true, message: "Kısa açıklama girin." }]}>
            <Input maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="description" label="Kurs açıklaması" className="span-2" rules={[{ required: true, message: "Açıklama girin." }]}>
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 14 }} />
          </Form.Item>
          <Form.Item name="coverImage" label="Kapak görseli" className="span-2"><ImageUpload /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>{isNew ? "Kursu oluştur" : "Kaydet"}</Button>
        </Form>
      </Card>

      {!isNew && (
        <Card
          title={`Dersler (${lessons.length})`}
          extra={<Button icon={<Plus size={15} />} onClick={() => setModal({ open: true, lesson: null })}>Ders ekle</Button>}
        >
          {!lessons.length && <Alert type="info" showIcon message="Kursu yayınlamak için en az bir ders ekleyin." />}
          <Table
            rowKey="id"
            dataSource={lessons}
            pagination={false}
            size="small"
            scroll={{ x: true }}
            columns={[
              { title: "#", dataIndex: "order", width: 50 },
              { title: "Başlık", dataIndex: "title" },
              { title: "Video", dataIndex: "videoUrl", render: (v) => (v ? "Var" : "Yok") },
              { title: "Süre", dataIndex: "durationMinutes", render: (m) => formatDuration(m) },
              {
                title: "",
                render: (_, l, i) => (
                  <div className="row-actions">
                    <Button size="small" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yukarı taşı" />
                    <Button size="small" icon={<ArrowDown size={14} />} disabled={i === lessons.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı taşı" />
                    <Button size="small" onClick={() => setModal({ open: true, lesson: l })}>Düzenle</Button>
                    <Popconfirm title="Ders silinsin mi?" okText="Sil" cancelText="Vazgeç" okButtonProps={{ danger: true }} onConfirm={() => removeLesson(l.id)}>
                      <Button size="small" danger>Sil</Button>
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {!isNew && (
        <Card title="Final sınavı">
          {course.finalExam ? (
            <p>Bu kursun final sınavı var ({course.finalExam.published ? "yayında" : "gizli"}). <Link to={`/admin/exams/${course.finalExam.id}`}>Sınavı düzenle</Link></p>
          ) : (
            <p>Bu kursun final sınavı yok. <Link to={`/admin/exams/new?type=FINAL&courseId=${course.id}`}>Final sınavı oluştur</Link></p>
          )}
        </Card>
      )}

      {!isNew && <LessonModal courseId={course.id} lesson={modal.lesson} open={modal.open} onClose={() => setModal({ open: false, lesson: null })} onSaved={onLessonSaved} />}
    </div>
  );
}
