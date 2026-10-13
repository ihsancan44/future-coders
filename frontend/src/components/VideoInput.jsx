import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Button, Input, Progress, Segmented, Upload } from "antd";
import { message } from "../utils/feedback";
import { Trash2, Upload as UploadIcon } from "lucide-react";
import { api, apiError, assetUrl } from "../api/client";
import { isVideoFile } from "../utils/format";

export const VIDEO_MAX_MB = 1024;

/**
 * antd Form ile kullanılır: value = video adresi. Bilgisayardan video yüklenebilir
 * (/uploads/... yolu kaydedilir) ya da YouTube / Vimeo bağlantısı yapıştırılabilir.
 */
export default function VideoInput({ value, onChange }) {
  const uploaded = Boolean(value) && value.startsWith("/uploads/");
  const [mode, setMode] = useState(value && !uploaded ? "link" : "file");
  const [percent, setPercent] = useState(null);
  // Düzenleme penceresi değeri sonradan doldurur: kayıtlı bir bağlantı varsa "bağlantı" sekmesi açılsın.
  useEffect(() => {
    if (value && !value.startsWith("/uploads/")) setMode("link");
  }, [value]);

  const customRequest = async ({ file, onSuccess, onError }) => {
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      message.error(`Video en fazla ${VIDEO_MAX_MB} MB olabilir.`);
      return onError(new Error("too large"));
    }
    const body = new FormData();
    body.append("file", file);
    setPercent(0);
    try {
      const res = await api.post("/admin/uploads/video", body, {
        timeout: 0,
        onUploadProgress: (e) => e.total && setPercent(Math.round((e.loaded / e.total) * 100)),
      });
      onChange?.(res.data.url);
      onSuccess(res.data);
      message.success("Video yüklendi. Kaydetmeyi unutmayın.");
    } catch (err) {
      message.error(apiError(err).message);
      onError(err);
    } finally {
      setPercent(null);
    }
  };

  const busy = percent !== null;

  return (
    <div className="video-input">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { label: "Bilgisayardan yükle", value: "file" },
          { label: "YouTube / Vimeo bağlantısı", value: "link" },
        ]}
      />

      {mode === "link" ? (
        <Input
          value={uploaded ? "" : value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          allowClear
        />
      ) : (
        <>
          {uploaded && <video key={value} src={assetUrl(value)} controls preload="metadata" />}
          <div className="image-upload__actions">
            <Upload accept="video/mp4,video/webm,video/ogg" showUploadList={false} customRequest={customRequest} disabled={busy}>
              <Button icon={<UploadIcon size={15} />} loading={busy}>{uploaded ? "Videoyu değiştir" : "Video yükle"}</Button>
            </Upload>
            {uploaded && !busy && <Button icon={<Trash2 size={15} />} onClick={() => onChange?.(null)}>Videoyu kaldır</Button>}
          </div>
          {busy && <Progress percent={percent} size="small" status="active" />}
          <span className="muted small">MP4, WEBM veya OGG, en fazla {VIDEO_MAX_MB / 1024} GB.</span>
        </>
      )}
      {value && !uploaded && mode === "file" && (
        <span className="muted small">Şu an bağlantı kullanılıyor{isVideoFile(value) ? "" : " (YouTube / Vimeo)"}. Yeni video yüklerseniz bağlantının yerini alır.</span>
      )}
    </div>
  );
}

VideoInput.propTypes = { value: PropTypes.string, onChange: PropTypes.func };
