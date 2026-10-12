import React from "react";
import { Collapse } from "antd";

const text = `
Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi, natus? Minima nam quis sapiente placeat, pariatur officia veritatis facere enim expedita id vitae harum, maxime eligendi perferendis sequi nobis nemo.
`;
const items = [
  {
    key: "1",
    label: "Amacımız Ne?",
    children: <p>{text}</p>,
  },
  {
    key: "2",
    label: "Hakkımızda?",
    children: <p>{text}</p>,
  },
  {
    key: "3",
    label: "Biz Kimiz?",
    children: <p>{text}</p>,
  },
];

const WhoAreWe = () => {
  return (
    <Collapse
      style={{ backgroundColor: "white", width: "100%" }}
      items={items}
      defaultActiveKey={["1"]}
    />
  );
};

export default WhoAreWe;
