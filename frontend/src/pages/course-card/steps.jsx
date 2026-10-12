import React from "react";
import { Collapse } from "antd";

const text1 = `
JS kütüphanesi olarak geçen yapıları componentlere bölerek kullanım kolaylığı ve hızlı çalışmasını sağlayan JS kütüphanesidir.
`;
const text2 = `
Componentler reactin asıl çalışma mantığına dayanır componentler her parçayı ayrı ayrı kodlayıp o kodları sonrasında istediğimiz yerde kullanabilmemizi sağlar.`;
const text3 = `
Componentleri kullanarak genel bir yapıyı oluşturup onun üzerine HTML, CSS ve JS kodları yazarak genel hatlarını oluşturduğumuz kodları istenilen hale getirmemizi sağlayan JS kütüphanesidir.
`;

const items = [
  {
    key: "1",
    label: "React ne demek ?",
    children: <p>{text1}</p>,
  },
  {
    key: "2",
    label: "Component yapısı nedir?",
    children: <p>{text2}</p>,
  },
  {
    key: "3",
    label: "Genel mantığı",
    children: <p>{text3}</p>,
  },
];

const Steps = () => {
  return (
    <Collapse
      style={{ backgroundColor: "white", width: "100%" }}
      items={items}
      defaultActiveKey={["1"]}
    />
  );
};

export default Steps;
