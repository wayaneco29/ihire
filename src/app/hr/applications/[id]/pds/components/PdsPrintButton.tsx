"use client";

import { PrinterOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";

export function PdsPrintButton() {
  return (
    <Button icon={<PrinterOutlined />} onClick={() => window.print()} variant="filled">
      Print PDS
    </Button>
  );
}
