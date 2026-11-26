import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { formatDate } from "@/utils/format-date";
import type { SpecialOrderValues } from "@/utils/special-order-schema";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function generateSpecialOrder(applicantName: string, values: SpecialOrderValues) {
  const template = await readFile(path.join(process.cwd(), "src/templates/special_order/so-template.docx"));
  const zip = await JSZip.loadAsync(template);
  const document = zip.file("word/document.xml");
  if (!document) throw new Error("Special Order template is unavailable.");
  const xml = await document.async("string");
  let appointment = false;
  let assignment = false;
  let assignmentFilled = false;
  let nameFilled = false;
  let conformeFilled = false;
  let positionFilled = false;
  const result = xml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (node, text: string) => {
    const value = (content: string) => `<w:t xml:space="preserve">${escapeXml(content)}</w:t>`;
    if (text === "NEIL C. BOBIS") { nameFilled = true; return value(applicantName); }
    if (text === "CONFORME:") {
      conformeFilled = true;
      return `${node}<w:br/><w:br/>${value(applicantName)}`;
    }
    if (text === "Teacher II") return value(values.position || "______________________");
    if (text === "______________________") return value(formatDate(values.date, "MMMM DD, YYYY"));
    if (text === "No. ________, s. 2026") return value(`No. ${values.orderNumber || "________"}, s. ${values.date.slice(0, 4)}`);
    if (text.includes("In view of the approval of your appointment as")) { appointment = true; return node; }
    if (appointment && /^\s+$/.test(text)) {
      appointment = false;
      positionFilled = true;
      return value(` ${values.position || "______________________"} `);
    }
    if (text.includes("you are hereby advised of your assignment at")) { assignment = true; return node; }
    if (assignment && /^[\s_]+$/.test(text)) {
      if (assignmentFilled) return value("");
      assignmentFilled = true;
      return value(` ${values.designation || "____________________________"} `);
    }
    if (assignment && text === ",") assignment = false;
    return node;
  });
  if (!nameFilled || !conformeFilled || !positionFilled || !assignmentFilled) {
    throw new Error("The Special Order template fields could not be located.");
  }
  zip.file("word/document.xml", result, { createFolders: false });
  return zip.generateAsync({ type: "uint8array" });
}
