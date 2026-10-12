import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Upload } from "antd";
import { message } from "../utils/feedback";
import { ImagePlus, Trash2 } from "lucide-react";
import { api, apiError, assetUrl } from "../api/client";

/** antd Form ile kullanılır: value = görsel yolu (/uploads/...), onChange ile güncellenir. */
export default function ImageUpload({ value, onChange }) {
  const [loading, setLoading] = useState(false);

  const customRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await api.post("/admin/uploads", body);
      onChange?.(res.data.url);
      onSuccess(res.data);
    } catch (err) {
      message.error(apiError(err).message);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-upload">
      {value && <img src={assetUrl(value)} alt="Kapak görseli önizleme" />}
      <div className="image-upload__actions">
        <Upload accept="image/png,image/jpeg,image/webp,image/gif" showUploadList={false} customRequest={customRequest}>
          <Button icon={<ImagePlus size={15} />} loading={loading}>{value ? "Görseli değiştir" : "Görsel yükle"}</Button>
        </Upload>
        {value && <Button icon={<Trash2 size={15} />} onClick={() => onChange?.(null)}>Görseli kaldır</Button>}
      </div>
      <span className="muted small">JPG, PNG, WEBP veya GIF, en fazla 5 MB. Görsel yoksa otomatik renkli kapak gösterilir.</span>
    </div>
  );
}
ImageUpload.propTypes = { value: PropTypes.string, onChange: PropTypes.func };
