const MAX_PDF_PAGES = 30;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MIN_NATIVE_TEXT_LENGTH = 80;

export async function extractPdfText(file: File) {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("Choose a PDF that is 20 MB or smaller.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  let nativeText = "";
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `This PDF has more than ${MAX_PDF_PAGES} pages. Upload a shorter document.`,
      );
    }

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => {
            if (!("str" in item)) return "";
            return item.str + (item.hasEOL ? "\n" : " ");
          })
          .filter(Boolean)
          .join("")
          .replace(/[ \t]+\n/g, "\n"),
      );
      page.cleanup();
    }
    nativeText = pages
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
  } finally {
    await loadingTask.destroy();
  }

  if (nativeText.length >= MIN_NATIVE_TEXT_LENGTH) return nativeText;

  const { readDocumentValues } = await import(
    "@/app/applicant/documents/ocr"
  );
  return (await readDocumentValues(file, () => undefined)).recognizedText;
}
