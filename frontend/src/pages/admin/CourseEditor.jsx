import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Radio, Switch, Table, Tabs } from "antd";
import { message } from "../../utils/feedback";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { api, apiError } from "../../api/client";
import FormSelect from "../../components/FormSelect";
import ImageUpload from "../../components/ImageUpload";
import VideoInput from "../../components/VideoInput";
import { ErrorState, Loading } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { formatDuration, videoLabel } from "../../utils/format";
import { applyApiErrors } from "../../utils/forms";
import { LANGUAGE_OPTIONS, languageByKey } from "../../utils/languages";

const levelOptions = [
  { value: "ALL", label: "Herkese açık" },
  { value: "ALPHA", label: "Alpha (başlangıç)" },
  { value: "BETA", label: "Beta (ileri)" },
];

const LETTERS = "ABCDE";
const emptyQuestion = { text: "", code: "", options: ["", ""], answerIndex: 0, explanation: "" };

const toForm = (lesson) => ({
  ...lesson,
  keyPoints: (lesson.keyPoints || []).join("\n"),
  practice: (lesson.practice || []).map(({ text, code, options, answerIndex, explanation }) => ({ text, code, options, answerIndex, explanation })),
});

const keyPointsRule = {
  validator: (_, v = "") => {
    const lines = v.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 8) return Promise.reject(new Error("En fazla 8 madde yazın."));
    if (lines.some((l) => l.length > 300)) return Promise.reject(new Error("Bir madde en fazla 300 karakter olabilir."));
    return Promise.resolve();
  },
};

function PracticeEditor() {
  return (
    <Form.List name="practice">
      {(fields, { add, remove }) => (
        <div className="practice-editor">
          {!fields.length && <p className="muted">Bu konunun pratik sorusu yok. Öğrenci kısa bilgiden sonra bu soruları çözer, cevabı hemen görür.</p>}
          {fields.map((field, qi) => (
            <Card
              key={field.key}
              size="small"
              title={`Soru ${qi + 1}`}
              extra={<Button size="small" danger type="text" icon={<Trash2 size={14} />} onClick={() => remove(field.name)} aria-label={`Soru ${qi + 1}'i sil`} />}
            >
              <Form.Item name={[field.name, "text"]} label="Soru" rules={[{ required: true, min: 3, message: "Soru metni girin." }]}>
                <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} maxLength={500} />
              </Form.Item>
              <Form.Item name={[field.name, "code"]} label="Kod (isteğe bağlı)">
                <Input.TextArea className="mono" autoSize={{ minRows: 1, maxRows: 8 }} maxLength={2000} />
              </Form.Item>
              <Form.List name={[field.name, "options"]}>
                {(opts, { add: addOpt, remove: removeOpt }) => (
                  <div className="practice-editor__options">
                    {opts.map((opt, oi) => (
                      <div key={opt.key} className="practice-editor__option">
                        <b>{LETTERS[oi]}</b>
                        <Form.Item name={opt.name} rules={[{ required: true, whitespace: true, message: "Boş seçenek bırakmayın." }]} className="practice-editor__input">
                          <Input maxLength={200} placeholder={`${LETTERS[oi]} seçeneği`} aria-label={`${LETTERS[oi]} seçeneği`} />
                        </Form.Item>
                        <Button type="text" icon={<Trash2 size={14} />} disabled={opts.length <= 2} onClick={() => removeOpt(opt.name)} aria-label={`${LETTERS[oi]} seçeneğini sil`} />
                      </div>
                    ))}
                    {opts.length < 5 && (
                      <Button size="small" icon={<Plus size={14} />} onClick={() => addOpt("")}>Seçenek ekle</Button>
                    )}
                  </div>
                )}
              </Form.List>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const count = (getFieldValue(["practice", field.name, "options"]) || []).length;
                  return (
                    <Form.Item
                      name={[field.name, "answerIndex"]}
                      label="Doğru cevap"
                      rules={[{ validator: (_, v) => (v < count ? Promise.resolve() : Promise.reject(new Error("Doğru cevabı seçin."))) }]}
                    >
                      <Radio.Group optionType="button" options={Array.from({ length: count }, (_, i) => ({ value: i, label: LETTERS[i] }))} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
              <Form.Item name={[field.name, "explanation"]} label="Açıklama (cevaptan sonra görünür)">
                <Input maxLength={500} />
              </Form.Item>
            </Card>
          ))}
          {fields.length < 10 && (
            <Button icon={<Plus size={15} />} onClick={() => add({ ...emptyQuestion, options: ["", ""] })}>Soru ekle</Button>
          )}
        </div>
      )}
    </Form.List>
  );
}

function LessonModal({ courseId, lesson, open, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) form.setFieldsValue(lesson ? toForm(lesson) : { title: "", content: "", videoUrl: "", durationMinutes: 10, keyPoints: "", codeExample: "", tip: "", language: null, practice: [] });
  }, [open, lesson, form]);

  const save = async (values) => {
    setSaving(true);
    const body = {
      ...values,
      language: values.language || "",
      keyPoints: (values.keyPoints || "").split("\n").map((l) => l.trim()).filter(Boolean),
      practice: values.practice || [],
    };
    try {
      const res = lesson
        ? await api.put(`/admin/courses/${courseId}/lessons/${lesson.id}`, body)
        : await api.post(`/admin/courses/${courseId}/lessons`, body);
      onSaved(res.data.lesson);
      onClose();
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={lesson ? "Dersi düzenle" : "Ders ekle"} open={open} onCancel={onClose} onOk={() => form.submit()} okText="Kaydet" cancelText="Vazgeç" confirmLoading={saving} destroyOnClose width={760}>
      <Form form={form} layout="vertical" onFinish={save} onFinishFailed={() => message.error("Eksik ya da hatalı alanlar var, sekmeleri kontrol edin.")}>
        <Tabs
          items={[
            {
              key: "general",
              label: "Genel",
              forceRender: true,
              children: (
                <>
                  <Form.Item name="title" label="Ders başlığı" rules={[{ required: true, message: "Başlık girin." }]}><Input /></Form.Item>
                  <Form.Item name="videoUrl" label="Ders videosu" extra="Reels akışında ilk video olarak gösterilir. Kısa videoları ders listesindeki 'Kısa videolar' düğmesinden ekleyin.">
                    <VideoInput />
                  </Form.Item>
                  <Form.Item name="durationMinutes" label="Süre (dakika)"><InputNumber min={0} max={1000} /></Form.Item>
                  <Form.Item name="content" label="Ders açıklaması" extra="Paragrafları boş bir satırla ayırın.">
                    <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "summary",
              label: "Kısa bilgi",
              forceRender: true,
              children: (
                <>
                  <Form.Item name="keyPoints" label="Kısa ve net maddeler" extra="Her satır bir madde (en fazla 8). Boş bırakılırsa ders açıklaması gösterilir." rules={[keyPointsRule]}>
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder={"Fonksiyon tekrar çağrılabilen kod bloğudur.\nreturn sonucu geri verir."} />
                  </Form.Item>
                  <Form.Item name="language" label="Derleyici dili" extra="Örnek kod ve videolardaki 'Derleyici' düğmesi bu dille açılır.">
                    <FormSelect options={LANGUAGE_OPTIONS} allowClear placeholder="Dil seçin" showSearch optionFilterProp="label" />
                  </Form.Item>
                  <Form.Item name="codeExample" label="Örnek kod">
                    <Input.TextArea className="mono" autoSize={{ minRows: 3, maxRows: 14 }} maxLength={4000} />
                  </Form.Item>
                  <Form.Item name="tip" label="Akılda kalsın notu">
                    <Input maxLength={500} />
                  </Form.Item>
                </>
              ),
            },
            { key: "practice", label: "Pratik", forceRender: true, children: <PracticeEditor /> },
          ]}
        />
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

/** Bir dersin kısa videoları (reels): ekle, düzenle, sırala, sil. */
function ReelsModal({ courseId, lesson, onClose, onChange }) {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(null); // null: liste, {}: yeni, reel: düzenleme
  const [saving, setSaving] = useState(false);
  const reels = lesson?.reels || [];
  const base = lesson && `/admin/courses/${courseId}/lessons/${lesson.id}/reels`;

  useEffect(() => {
    if (editing) form.setFieldsValue({ title: "", videoUrl: "", language: lesson?.language || null, starterCode: "", ...editing });
  }, [editing, form, lesson]);

  const save = async (values) => {
    setSaving(true);
    const body = { ...values, language: values.language || "" };
    try {
      if (editing.id) {
        const res = await api.put(`${base}/${editing.id}`, body);
        onChange(reels.map((r) => (r.id === editing.id ? res.data.reel : r)));
      } else {
        const res = await api.post(base, body);
        onChange([...reels, res.data.reel]);
      }
      setEditing(null);
    } catch (err) {
      message.error(applyApiErrors(form, err));
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn) => {
    try {
      await fn();
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  return (
    <Modal
      title={lesson ? `Kısa videolar: ${lesson.title}` : ""}
      open={Boolean(lesson)}
      onCancel={() => (editing ? setEditing(null) : onClose())}
      footer={
        editing ? (
          <>
            <Button onClick={() => setEditing(null)}>Vazgeç</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>Kaydet</Button>
          </>
        ) : (
          <Button onClick={onClose}>Kapat</Button>
        )
      }
      destroyOnClose
      width={720}
    >
      {editing ? (
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="title" label="Video başlığı" rules={[{ required: true, min: 2, message: "Başlık girin." }]}>
            <Input maxLength={150} placeholder="60 saniyede: return ne işe yarar?" />
          </Form.Item>
          <Form.Item name="videoUrl" label="Video" extra="Dikey (9:16) kısa videolar en iyi görünür. YouTube Shorts bağlantısı da olur." rules={[{ required: true, message: "Video yükleyin ya da bağlantı girin." }]}>
            <VideoInput />
          </Form.Item>
          <Form.Item name="language" label="Derleyici dili" extra="Boş bırakılırsa dersin dili kullanılır.">
            <FormSelect options={LANGUAGE_OPTIONS} allowClear placeholder="Dil seçin" showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="starterCode" label="Derleyicide açılacak kod" extra="Videoda yazılan kod; öğrenci 'Derleyici' düğmesine basınca bununla başlar.">
            <Input.TextArea className="mono" autoSize={{ minRows: 3, maxRows: 14 }} maxLength={8000} />
          </Form.Item>
        </Form>
      ) : (
        <>
          <Table
            rowKey="id"
            dataSource={reels}
            pagination={false}
            size="small"
            locale={{ emptyText: "Bu derse henüz kısa video eklenmedi." }}
            columns={[
              { title: "#", render: (_, __, i) => i + 1, width: 40 },
              { title: "Başlık", dataIndex: "title" },
              { title: "Video", dataIndex: "videoUrl", render: videoLabel },
              { title: "Dil", dataIndex: "language", render: (k) => languageByKey(k)?.label || "Dersin dili" },
              {
                title: "",
                render: (_, r, i) => (
                  <div className="row-actions">
                    <Button size="small" icon={<ArrowUp size={14} />} disabled={i === 0} aria-label="Yukarı taşı"
                      onClick={() => act(async () => onChange((await api.patch(`${base}/${r.id}/move`, { direction: "up" })).data.reels))} />
                    <Button size="small" icon={<ArrowDown size={14} />} disabled={i === reels.length - 1} aria-label="Aşağı taşı"
                      onClick={() => act(async () => onChange((await api.patch(`${base}/${r.id}/move`, { direction: "down" })).data.reels))} />
                    <Button size="small" onClick={() => setEditing(r)}>Düzenle</Button>
                    <Popconfirm title="Video silinsin mi?" okText="Sil" cancelText="Vazgeç" okButtonProps={{ danger: true }}
                      onConfirm={() => act(async () => { await api.delete(`${base}/${r.id}`); onChange(reels.filter((x) => x.id !== r.id)); })}>
                      <Button size="small" danger>Sil</Button>
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
          />
          {reels.length < 20 && (
            <Button className="mt-12" type="primary" icon={<Plus size={15} />} onClick={() => setEditing({})}>Kısa video ekle</Button>
          )}
        </>
      )}
    </Modal>
  );
}

ReelsModal.propTypes = {
  courseId: PropTypes.number.isRequired,
  lesson: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function CourseEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data, error, loading, reload, setData } = useApi(isNew ? null : `/admin/courses/${id}`);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, lesson: null });
  const [reelsFor, setReelsFor] = useState(null);

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
          <Form.Item name="level" label="Hangi sınıfa açık?" rules={[{ required: true }]}><FormSelect options={levelOptions} /></Form.Item>
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
              { title: "Video", dataIndex: "videoUrl", render: videoLabel },
              { title: "Kısa video", render: (_, l) => l.reels?.length || 0 },
              { title: "Pratik", render: (_, l) => l.practice?.length || 0 },
              { title: "Süre", dataIndex: "durationMinutes", render: (m) => formatDuration(m) },
              {
                title: "",
                render: (_, l, i) => (
                  <div className="row-actions">
                    <Button size="small" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yukarı taşı" />
                    <Button size="small" icon={<ArrowDown size={14} />} disabled={i === lessons.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı taşı" />
                    <Button size="small" onClick={() => setModal({ open: true, lesson: l })}>Düzenle</Button>
                    <Button size="small" onClick={() => setReelsFor(l.id)}>Kısa videolar</Button>
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

      {!isNew && (
        <ReelsModal
          courseId={course.id}
          lesson={lessons.find((l) => l.id === reelsFor)}
          onClose={() => setReelsFor(null)}
          onChange={(reels) => setData((d) => ({ course: { ...d.course, lessons: d.course.lessons.map((l) => (l.id === reelsFor ? { ...l, reels } : l)) } }))}
        />
      )}
      {!isNew && <LessonModal courseId={course.id} lesson={modal.lesson} open={modal.open} onClose={() => setModal({ open: false, lesson: null })} onSaved={onLessonSaved} />}
    </div>
  );
}
