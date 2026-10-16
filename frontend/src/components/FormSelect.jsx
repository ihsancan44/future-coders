import { Select } from "antd";

/**
 * Zorunlu Form.Item alanlarında kullanılır: antd, aria-required'ı Select'in kapsayıcı div'ine koyuyor
 * (bu öğede geçersiz bir ARIA özelliği, ekran okuyucular hata veriyor). Alanın zorunlu olduğu zaten etikette yıldızla görünür.
 */
// eslint-disable-next-line react/prop-types
export default function FormSelect({ "aria-required": _required, ...props }) {
  return <Select {...props} />;
}
