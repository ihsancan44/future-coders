import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Tag } from "antd";
import { message } from "../../utils/feedback";
import { Plus, Trash2 } from "lucide-react";
import { api, apiError } from "../../api/client";
import FormSelect from "../../components/FormSelect";
import { ErrorState, Loading } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { applyApiErrors } from "../../utils/forms";

const blankQuestion = { text: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }] };

function QuestionModal({ examId, question, open, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) form.setFieldsValue(question ? { text: question.text, options: question.options.map(({ text, isCorrect }) => ({ text, isCorrect })) } : blankQuestion);
  }, [open, question, form]);

  const markCorrect = (index) => {
    const options = form.getFieldValue("options").map((o, i) => ({ ...o, isCorrect: i === index }));
    form.setFieldsValue({ options });
  };

  const save = async (values) => {
    setSaving(true);
    try {
      const res = question
        ? await api.put(`/admin/exams/${examId}/questions/${question.id}`, values)
        : await api.post(`/admin/exams/${examId}/questions`, values);
      onSaved(res.data.question);
      onClose();
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={question ? "Soruyu düzenle" : "Soru ekle"} open={open} onCancel={onClose} onOk={() => form.submit()} okText="Kaydet" cancelText="Vazgeç" confirmLoading={saving} destroyOnClose width={680}>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="text" label="Soru" rules={[{ required: true, message: "Soru metni girin." }]}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <span className="ant-form-item-label"><label>Şıklar (doğru olanı işaretleyin)</label></span>
        <Form.List name="options">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, i) => (
                <Space key={field.key} align="baseline" className="option-row">
                  <Form.Item name={[field.name, "isCorrect"]} valuePropName="checked" noStyle>
                    <Checkbox onChange={() => markCorrect(i)} aria-label={`${String.fromCharCode(65 + i)} şıkkı doğru`} />
                  </Form.Item>
                  <span className="exam__letter">{String.fromCharCode(65 + i)}</span>
                  <Form.Item name={[field.name, "text"]} rules={[{ required: true, message: "Şık boş olamaz." }]} className="option-row__input">
                    <Input />
                  </Form.Item>
                  <Button icon={<Trash2 size={14} />} disabled={fields.length <= 2} onClick={() => remove(field.name)} aria-label="Şıkkı sil" />
                </Space>
              ))}
              <Button icon={<Plus size={14} />} disabled={fields.length >= 8} onClick={() => add({ text: "", isCorrect: false })}>Şık ekle</Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
QuestionModal.propTypes = {
  examId: PropTypes.number.isRequired,
  question: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default function ExamEditor() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data, error, loading, reload, setData } = useApi(isNew ? null : `/admin/exams/${id}`);
  const courses = useApi("/admin/courses");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, question: null });

  useEffect(() => {
    if (data?.exam) form.setFieldsValue(data.exam);
  }, [data, form]);

  if (!isNew && loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const exam = data?.exam;
  const type = exam?.type || search.get("type") || "PLACEMENT";
  const questions = exam?.questions || [];

  const save = async (values) => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post("/admin/exams", { ...values, type });
        message.success("Sınav oluşturuldu. Şimdi soru ekleyin.");
        navigate(`/admin/exams/${res.data.exam.id}`, { replace: true });
      } else {
        const { published: _p, ...rest } = values;
        const res = await api.put(`/admin/exams/${id}`, rest);
        setData((d) => ({ exam: { ...d.exam, ...res.data.exam } }));
        message.success("Sınav kaydedildi.");
      }
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  const setPublished = async (published) => {
    try {
      await api.patch(`/admin/exams/${id}/publish`, { published });
      setData((d) => ({ exam: { ...d.exam, published } }));
      message.success(published ? "Sınav yayınlandı." : "Sınav gizlendi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const removeQuestion = async (qid) => {
    try {
      await api.delete(`/admin/exams/${id}/questions/${qid}`);
      setData((d) => ({ exam: { ...d.exam, questions: d.exam.questions.filter((q) => q.id !== qid) } }));
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const onSaved = (q) =>
    setData((d) => {
      const exists = d.exam.questions.some((x) => x.id === q.id);
      return { exam: { ...d.exam, questions: exists ? d.exam.questions.map((x) => (x.id === q.id ? q : x)) : [...d.exam.questions, q] } };
    });

  const initial = { passingScore: 60, durationMinutes: 20, description: "", courseId: search.get("courseId") ? Number(search.get("courseId")) : undefined };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <Link to="/admin/exams">← Sınavlar</Link>
          <h1>{isNew ? (type === "FINAL" ? "Yeni final sınavı" : "Yeni seviye sınavı") : exam.title}</h1>
          <Tag color={type === "PLACEMENT" ? "purple" : "blue"}>{type === "PLACEMENT" ? "Seviye sınavı" : "Final sınavı"}</Tag>
        </div>
        {!isNew && (
          <div className="row-actions">
            <span>Yayında</span>
            <Switch checked={exam.published} onChange={setPublished} aria-label="Yayın durumu" />
          </div>
        )}
      </div>

      <Card title="Sınav ayarları">
        {type === "PLACEMENT" && (
          <Alert type="info" showIcon message="Geçme notu ve üzeri alan öğrenci Beta, altında kalan Alpha sınıfına yerleşir." style={{ marginBottom: 16 }} />
        )}
        <Form form={form} layout="vertical" onFinish={save} initialValues={initial} className="form-grid">
          <Form.Item name="title" label="Başlık" className="span-2" rules={[{ required: true, min: 3, message: "Başlık girin." }]}><Input /></Form.Item>
          {type === "FINAL" && (
            <Form.Item name="courseId" label="Kurs" className="span-2" rules={[{ required: true, message: "Kurs seçin." }]}>
              <FormSelect
                loading={courses.loading}
                options={(courses.data?.courses || []).map((c) => ({ value: c.id, label: c.title, disabled: c.hasFinalExam && c.id !== exam?.courseId }))}
                placeholder="Kurs seçin"
              />
            </Form.Item>
          )}
          <Form.Item name="passingScore" label={type === "PLACEMENT" ? "Beta eşiği (%)" : "Geçme notu (%)"} rules={[{ required: true }]}>
            <InputNumber min={0} max={100} />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Süre (dakika, boş = süresiz)"><InputNumber min={1} max={600} /></Form.Item>
          <Form.Item name="description" label="Açıklama (öğrenci sınav öncesi görür)" className="span-2"><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>{isNew ? "Sınavı oluştur" : "Kaydet"}</Button>
        </Form>
      </Card>

      {!isNew && (
        <Card title={`Sorular (${questions.length})`} extra={<Button icon={<Plus size={15} />} onClick={() => setModal({ open: true, question: null })}>Soru ekle</Button>}>
          {exam._count?.attempts > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={`Bu sınava ${exam._count.attempts} deneme yapıldı. Soruları değiştirmek eski sonuçları etkilemez ama yeni girenler değişikliği görür.`} />
          )}
          {!questions.length && <Alert type="info" showIcon message="Sınavı yayınlamak için en az bir soru ekleyin." />}
          <ol className="question-list">
            {questions.map((q) => (
              <li key={q.id}>
                <div className="question-list__head">
                  <strong>{q.text}</strong>
                  <div className="row-actions">
                    <Button size="small" onClick={() => setModal({ open: true, question: q })}>Düzenle</Button>
                    <Popconfirm title="Soru silinsin mi?" okText="Sil" okButtonProps={{ danger: true }} cancelText="Vazgeç" onConfirm={() => removeQuestion(q.id)}>
                      <Button size="small" danger>Sil</Button>
                    </Popconfirm>
                  </div>
                </div>
                <ul>
                  {q.options.map((o, i) => (
                    <li key={o.id} className={o.isCorrect ? "is-correct" : ""}>
                      {String.fromCharCode(65 + i)}) {o.text} {o.isCorrect && <Tag color="green">Doğru</Tag>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {!isNew && <QuestionModal examId={exam.id} question={modal.question} open={modal.open} onClose={() => setModal({ open: false, question: null })} onSaved={onSaved} />}
    </div>
  );
}
