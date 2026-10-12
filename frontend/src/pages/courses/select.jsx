import { Select } from "antd";

const Selection = ({ defaultValue }) => {
  return (
    <Select
      defaultValue={defaultValue}
      style={{
        width: 120,
      }}
      options={[
        {
          value: "Alpha",
          label: "Alpha",
        },
        {
          value: "Beta",
          label: "Beta",
        },
      ]}
    />
  );
};

export default Selection;
