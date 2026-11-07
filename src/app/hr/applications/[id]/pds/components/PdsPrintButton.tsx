"use client";

import { Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";

export function PdsPrintButton() {
  return <Button icon={<PrinterOutlined />} onClick={() => window.print()} type="primary">Print PDS</Button>;
}
