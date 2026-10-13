import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Button, Form, Input, Modal, Popconfirm, Segmented, Select, Table, Tag, Typography } from "antd";
import { message } from "../../utils/feedback";
import { api, apiError, assetUrl } from "../../api/client";
import VideoInput from "../../components/VideoInput";
import { ErrorState } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { embedUrl, formatDuration, isVideoFile, videoLabel } from "../../utils/format";

function VideoModal({ lesson, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (lesson) form.setFieldsValue({ videoUrl: lesson.videoUrl || "" });
  }, [lesson, form]);

  const save = async ({ videoUrl }) => {
    setSaving(true);
    try {
      const res = await api.put(`/admin/courses/${lesson.courseId}/lessons/${lesson.id}`, { videoUrl: videoUrl || null });
      onSaved(res.data.lesson);
      message.success("Video kaydedildi.");
      onClose();
    } catch (err) {
      message.error(apiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={lesson ? `Video: ${lesson.title}` : ""} open={Boolean(lesson)} onCancel={onClose} onOk={() => form.submit()} okText="Kaydet" cancelText="Vazgeç" confirmLoading={saving} destroyOnClose width={640}>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="videoUrl"><VideoInput /></Form.Item>
      </Form>
    </Modal>
  );
}
VideoModal.propTypes = { lesson: PropTypes.object, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired };

function PreviewModal({ lesson, onClose }) {
  const url = lesson?.videoUrl;
  return (
    <Modal title={lesson?.title} open={Boolean(lesson)} onCancel={onClose} footer={null} destroyOnClose width={760}>
      <div className="player">
        {url && isVideoFile(url) ? (
          <video src={assetUrl(url)} controls autoPlay />
        ) : url ? (
          <iframe src={embedUrl(url)} title={lesson.title} allow="encrypted-media; picture-in-picture" allowFullScreen />
        ) : null}
      </div>
    </Modal>
  );
}
PreviewModal.propTypes = { lesson: PropTypes.object, onClose: PropTypes.func.isRequired };

export default function AdminVideos() {
  const [courseId, setCourseId] = useState();
  const [video, setVideo] = useState("");
  const [search, setSearch] = useState("");
  const { data: coursesData } = useApi("/admin/courses");
  const { data, error, loading, reload, setData } = useApi("/admin/videos", { courseId, video: video || undefined, search: search || undefined });
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);

  const replace = (lesson) =>
    setData((d) => ({ lessons: d.lessons.map((l) => (l.id === lesson.id ? { ...l, ...lesson } : l)) }));

  const update = async (lesson, body, done) => {
    try {
      const res = await api.put(`/admin/courses/${lesson.courseId}/lessons/${lesson.id}`, body);
      replace(res.data.lesson);
      message.success(done);
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  const remove = async (lesson) => {
    try {
      await api.delete(`/admin/courses/${lesson.courseId}/lessons/${lesson.id}`);
      setData((d) => ({ lessons: d.lessons.filter((l) => l.id !== lesson.id) }));
      message.success("Ders silindi.");
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Videolar</h1>
      </div>
      <p className="muted">Tüm kursların ders videoları. Başlığa tıklayarak adını değiştirebilir, video yükleyebilir, değiştirebilir veya silebilirsiniz. Yeni ders eklemek için kursun sayfasına gidin.</p>
      <div className="filters">
        <Input.Search placeholder="Ders başlığı ara" allowClear onSearch={(v) => setSearch(v.trim())} className="filters__search" />
        <Select
          allowClear
          placeholder="Tüm kurslar"
          value={courseId}
          onChange={setCourseId}
          options={(coursesData?.courses || []).map((c) => ({ value: c.id, label: c.title }))}
          className="filters__select"
          style={{ minWidth: 200 }}
          aria-label="Kurs"
        />
        <Segmented
          value={video}
          onChange={setVideo}
          options={[
            { label: "Tümü", value: "" },
            { label: "Yüklenen", value: "UPLOADED" },
            { label: "Bağlantı", value: "LINK" },
            { label: "Videosuz", value: "NONE" },
          ]}
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.lessons || []}
        scroll={{ x: true }}
        columns={[
          { title: "Kurs", render: (_, l) => <Link to={`/admin/courses/${l.course.id}`}>{l.course.title}</Link> },
          { title: "#", dataIndex: "order", width: 50 },
          {
            title: "Ders başlığı",
            dataIndex: "title",
            render: (t, l) => (
              <Typography.Text
                editable={{
                  tooltip: "Başlığı düzenle",
                  onChange: (v) => {
                    const title = v.trim();
                    if (title.length < 2) return message.error("Ders başlığı en az 2 karakter olmalı.");
                    if (title !== t) update(l, { title }, "Başlık güncellendi.");
                  },
                }}
              >
                {t}
              </Typography.Text>
            ),
          },
          {
            title: "Video",
            dataIndex: "videoUrl",
            render: (v, l) =>
              v ? (
                <Button type="link" size="small" onClick={() => setPreview(l)}>
                  <Tag color={v.startsWith("/uploads/") ? "blue" : "purple"}>{videoLabel(v)}</Tag> İzle
                </Button>
              ) : (
                <Tag>Yok</Tag>
              ),
          },
          { title: "Süre", dataIndex: "durationMinutes", render: (m) => formatDuration(m) },
          {
            title: "",
            render: (_, l) => (
              <div className="row-actions">
                <Button size="small" type={l.videoUrl ? "default" : "primary"} onClick={() => setEditing(l)}>
                  {l.videoUrl ? "Videoyu değiştir" : "Video yükle"}
                </Button>
                {l.videoUrl && (
                  <Popconfirm title="Video silinsin mi?" description="Ders kalır, sadece videosu kaldırılır." okText="Sil" cancelText="Vazgeç" okButtonProps={{ danger: true }} onConfirm={() => update(l, { videoUrl: null }, "Video silindi.")}>
                    <Button size="small">Videoyu sil</Button>
                  </Popconfirm>
                )}
                <Popconfirm title="Ders silinsin mi?" description="Ders, videosu ve öğrencilerin bu dersteki ilerlemesi silinir." okText="Sil" cancelText="Vazgeç" okButtonProps={{ danger: true }} onConfirm={() => remove(l)}>
                  <Button size="small" danger>Dersi sil</Button>
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />
      <VideoModal lesson={editing} onClose={() => setEditing(null)} onSaved={replace} />
      <PreviewModal lesson={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
