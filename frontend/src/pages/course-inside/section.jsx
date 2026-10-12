import React from "react";
import { Tabs } from "antd";
const onChange = (key) => {
  console.log(key);
};
const items = [
  {
    key: "1",
    label: "Tab 1",
    children:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Maxime adipisci dolores commodi iste velit modi, architecto hic soluta voluptatum cumque cupiditate debitis facilis placeat facere optio ipsam perspiciatis temporibus eos?",
  },
  {
    key: "2",
    label: "Tab 2",
    children: "Content of Tab Pane 2",
  },
  {
    key: "3",
    label: "Tab 3",
    children: "Content of Tab Pane 3",
  },
];
const Section = () => (
  <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
);
export default Section;
