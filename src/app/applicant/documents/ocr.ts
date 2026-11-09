"use client";

import { createWorker } from "tesseract.js";
import * as pdfjs from "pdfjs-dist";

const MAX_PDF_PAGES = 30;
const PDF_RENDER_SCALE = 1.75;

export type DocumentOcrResult = {
  trainingHours: number | null;
  totalUnits: number | null;
  confidence: number;
};

function findNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(value) && value >= 0 && value <= 99999999.99) {
      return value;
    }
  }
  return null;
}

export function extractDocumentValues(text: string): Omit<
  DocumentOcrResult,
  "confidence"
> {
  return {
    trainingHours: findNumber(text, [
      /(?:training|contact|total)\s+hours?\s*(?:rendered|earned|of training)?\s*[:#=-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /([\d,]+(?:\.\d{1,2})?)\s*(?:training\s+)?(?:hours?|hrs?)\b/i,
    ]),
    totalUnits: findNumber(text, [
      /total\s+(?:academic\s+)?units?(?:\s+earned)?\s*[:#=-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /units?\s+earned\s*[:#=-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ]),
  };
}

export async function readDocumentValues(
  file: File,
  onProgress: (progress: number) => void,
): Promise<DocumentOcrResult> {
  let pdf: pdfjs.PDFDocumentProxy | null = null;
  let pdfLoadingTask: pdfjs.PDFDocumentLoadingTask | null = null;
  let currentPage = 0;
  let pageCount = 1;
  const pageConfidence: number[] = [];
  const pagesText: string[] = [];
  const worker = await createWorker("eng", undefined, {
    logger: (event) => {
      onProgress(
        Math.round(((currentPage + event.progress) / pageCount) * 100),
      );
    },
  });

  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      pdfLoadingTask = pdfjs.getDocument({
        data: await file.arrayBuffer(),
      });
      const loadedPdf = await pdfLoadingTask.promise;
      pdf = loadedPdf;
      if (loadedPdf.numPages > MAX_PDF_PAGES) {
        throw new Error(
          `This PDF has more than ${MAX_PDF_PAGES} pages. Enter the value manually or upload a shorter document.`,
        );
      }

      pageCount = loadedPdf.numPages;
      for (let pageNumber = 1; pageNumber <= loadedPdf.numPages; pageNumber += 1) {
        currentPage = pageNumber - 1;
        const page = await loadedPdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("This PDF page could not be prepared for OCR.");
        }

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const { data } = await worker.recognize(canvas, {}, { text: true });
        pagesText.push(data.text);
        pageConfidence.push(data.confidence);
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
        onProgress(Math.round((pageNumber / pdf.numPages) * 100));
      }
    } else if (file.type.startsWith("image/")) {
      const { data } = await worker.recognize(file, {}, { text: true });
      pagesText.push(data.text);
      pageConfidence.push(data.confidence);
    } else {
      throw new Error(
        "OCR supports image and PDF files. Enter values manually for Word documents.",
      );
    }

    const extracted = extractDocumentValues(pagesText.join("\n"));
    return {
      ...extracted,
      confidence: Math.round(
        pageConfidence.reduce((total, value) => total + value, 0) /
          Math.max(pageConfidence.length, 1),
      ),
    };
  } finally {
    await pdfLoadingTask?.destroy();
    await worker.terminate();
  }
}
