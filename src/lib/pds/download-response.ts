import "server-only";

import { Buffer } from "node:buffer";

export function pdsWorkbookDownloadResponse(
  workbook: Uint8Array,
  versionNumber: number,
) {
  return new Response(Buffer.from(workbook), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PDS-version-${versionNumber}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
