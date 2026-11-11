"use client";

import { createWorker } from "tesseract.js";
import * as pdfjs from "pdfjs-dist";

const MAX_PDF_PAGES = 30;
const PDF_RENDER_SCALE = 1.75;

export type DocumentOcrResult = {
  trainingHours: number | null;
  totalUnits: number | null;
  confidence: number;
  recognizedText: string;
  certificate: CertificateOcrDetails;
};

export type CertificateOcrDetails = {
  type: string;
  typeNote: string;
  typeInferred: boolean;
  hours: number | null;
  cpdUnits: string | null;
  accreditation: string | null;
  issuer: string | null;
  awardedTo: string | null;
  activity: string | null;
  date: string | null;
  platform: string | null;
  signedBy: string | null;
  signerTitle: string | null;
  verificationCode: string | null;
};

const CERTIFICATE_TYPES = [
  [
    "certificate of participation",
    "Certificate of Participation",
    "Shows you attended an activity. It is not a certificate of completion, a training certificate, or a recognition award.",
  ],
  [
    "certificate of completion",
    "Certificate of Completion",
    "Shows you finished all requirements of a course or program.",
  ],
  [
    "certificate of recognition",
    "Certificate of Recognition",
    "An award given to honor an achievement or contribution.",
  ],
  [
    "certificate of appreciation",
    "Certificate of Appreciation",
    "Given to thank someone for help or service.",
  ],
  [
    "certificate of attendance",
    "Certificate of Attendance",
    "Confirms you were present at an event.",
  ],
  [
    "certificate of training",
    "Certificate of Training",
    "Confirms you underwent a training program.",
  ],
] as const;

const TYPE_HINTS = [
  [/\bparticipat(?:ion|ed|ing)\b/i, "Certificate of Participation"],
  [/\bcompleted\b|\bcompletion\b/i, "Certificate of Completion"],
  [/\battend(?:ed|ance)\b/i, "Certificate of Attendance"],
  [/\bappreciation\b/i, "Certificate of Appreciation"],
] as const;

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
} satisfies Record<string, number>;

const TENS_WORDS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
} satisfies Record<string, number>;

const SEPARATOR = "[\\s\\-\\u2010\\u2011\\u2012\\u2013\\u2014]*";
const NUMBER_WORD =
  `(?:(?:${Object.keys(TENS_WORDS).join("|")})(?:[\\s\\-\\u2010\\u2011\\u2013]+(?:one|two|three|four|five|six|seven|eight|nine))?|${Object.keys(NUMBER_WORDS).join("|")})`;
const HALF = "(?:[\\s\\-]+and[\\s\\-]+(?:a[\\s\\-]+|one[\\s-]+)?half)?";
const HOUR_UNIT = "(?:hours?|hrs?)\\b";
const PARENTHESIZED_NUMBER =
  "(?:\\(\\s*\\d+(?:\\.\\d+)?\\s*\\)" + SEPARATOR + ")?";
const CERTIFICATE_TITLE = /^(Vice President|President|Executive Director|Regional Director|Schools? Division Superintendent|Director|Chief|Head|Principal|Superintendent|Undersecretary|Assistant Secretary|Secretary|Dean|Chairperson|Manager|Coordinator|Registrar)\b(?:\s+(?:[IVX]{1,4}\b|of\s+\w+|[A-Z]\w+))?/;

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function wordsToNumber(phrase: string): number | null {
  let words = phrase.toLowerCase();
  let extra = 0;
  if (/\bhalf\b/.test(words)) {
    extra = 0.5;
    words = words.replace(/(?:\band\s+)?(?:\ba\s+|\bone[\s-]+)?\bhalf\b/, "");
  }

  let total = 0;
  let found = false;
  for (const word of words.split(/[^a-z]+/)) {
    if (Object.hasOwn(TENS_WORDS, word)) {
      total += TENS_WORDS[word as keyof typeof TENS_WORDS];
      found = true;
    } else if (Object.hasOwn(NUMBER_WORDS, word)) {
      total += NUMBER_WORDS[word as keyof typeof NUMBER_WORDS];
      found = true;
    }
  }
  return found ? total + extra : null;
}

function detectCertificateType(text: string) {
  const lower = text.toLowerCase();
  for (const [key, name, note] of CERTIFICATE_TYPES) {
    if (lower.includes(key)) return { name, note, inferred: false };
  }
  const match = lower.match(/certificate of \w+/);
  if (match) return { name: titleCase(match[0]), note: "", inferred: false };
  for (const [pattern, name] of TYPE_HINTS) {
    if (pattern.test(text)) {
      const note =
        CERTIFICATE_TYPES.find(([, typeName]) => typeName === name)?.[2] ?? "";
      return { name, note, inferred: true };
    }
  }
  return { name: "Unknown", note: "", inferred: false };
}

function detectCertificateHours(text: string): number | null {
  let match = text.match(new RegExp("(\\d+(?:\\.\\d+)?)" + SEPARATOR + HOUR_UNIT, "i"));
  if (match) return Number.parseFloat(match[1]);
  match = text.match(
    new RegExp("\\(\\s*(\\d+(?:\\.\\d+)?)\\s*\\)" + SEPARATOR + HOUR_UNIT, "i"),
  );
  if (match) return Number.parseFloat(match[1]);
  match = text.match(
    new RegExp(
      "\\b(" + NUMBER_WORD + HALF + ")" + SEPARATOR + PARENTHESIZED_NUMBER + HOUR_UNIT,
      "i",
    ),
  );
  return match ? wordsToNumber(match[1]) : null;
}

function detectCpdUnits(text: string): string | null {
  let match = text.match(
    /(\d+(?:\.\d+)?)\s*(?:\(\s*[A-Za-z\- ]+\s*\)\s*)?(CPD|CPE|PDU)\s*(units?|credits?|points?)/i,
  );
  if (match) return `${match[1]} ${match[2].toUpperCase()} ${match[3].toLowerCase()}`;
  match = text.match(
    new RegExp(
      "\\b(" + NUMBER_WORD + HALF + ")" + SEPARATOR + PARENTHESIZED_NUMBER + "(CPD|CPE|PDU)\\s*(units?|credits?|points?)",
      "i",
    ),
  );
  return match
    ? `${wordsToNumber(match[1])} ${match[2].toUpperCase()} ${match[3].toLowerCase()}`
    : null;
}

function detectAccreditation(text: string): string | null {
  const underMatch = text.match(/\bunder\s+([A-Z]{2,6}(?:[-\u2013]\d+){2,})/);
  if (underMatch) return underMatch[1];
  return text.match(/\b([A-Z]{2,6}(?:-\d+){2,})\b/)?.[1] ?? null;
}

function detectAwardedTo(lines: string[]): string | null {
  const lead =
    /^(?:(?:this\s+)?(?:certificate\s+)?(?:is\s+)?(?:proudly\s+|hereby\s+)?(?:awarded|presented|given|granted)\s+to|to)\s*:?$/i;
  for (let index = 0; index < lines.length; index += 1) {
    if (!lead.test(lines[index].trim())) continue;
    for (const raw of lines.slice(index + 1, index + 3)) {
      const candidate = raw.replace(/^[ _|-]+|[ _|-]+$/g, "");
      if (
        candidate.length > 2 &&
        candidate.split(/\s+/).length <= 6 &&
        !/\d/.test(candidate) &&
        !/^(for|in recognition)\b/i.test(candidate)
      ) {
        return candidate;
      }
    }
  }
  return null;
}

function detectIssuer(lines: string[], text: string): string | null {
  const by = text.match(
    /\b(?:conducted|organized|issued|offered|hosted|facilitated|sponsored)\s+by\s+(.+?)(?:\s+(?:on|in|at|via|from)\s+[A-Z0-9]|[;]|$)/,
  );
  if (by) return by[1].trim().replace(/[,;]+$/, "");

  const organizationWords =
    /academy|department|division|bureau|office|school|foundation|institute|university|college|association|council|commission|center|centre|company|corporation/i;
  let group: string[] = [];
  const flush = () => {
    const joined = group.join(" ");
    group = [];
    return organizationWords.test(joined)
      ? titleCase(joined).replace(/\bOf The\b/, "of the")
      : null;
  };
  for (const line of lines.slice(0, 14)) {
    if (/^[A-Z][A-Z .,&'-]{2,}$/.test(line)) {
      group.push(line);
      continue;
    }
    const issuer = flush();
    if (issuer) return issuer;
  }
  const issuer = flush();
  if (issuer) return issuer;
  return lines.find((line) => /academy|department of/i.test(line)) ?? null;
}

function detectActivity(text: string): string | null {
  const clean = (value: string) =>
    value.replace(/^[\s"\u201c\u201d\u2018\u2019'.,:;]+|[\s"\u201c\u201d\u2018\u2019'.,:;]+$/g, "");
  let match = text.match(
    /\b(?:entitled|titled|theme|topic)\s*:?\s*(.+?)\s+(?:conducted|held|organized|facilitated|delivered|on\s+[A-Za-z]+\s+\d)/i,
  );
  if (match) return clean(match[1]);
  match = text.match(
    /(?:the conduct of|participation in)\s+(.+?)\s+held\s+(?:on\s+)?[A-Z][a-z]+ \d/i,
  );
  if (match) return clean(match[1]);
  match = text.match(/for (?:his\/her )?(?:active )?participation\s+(.+?)\s+held\s/i);
  return match ? clean(match[1]) : null;
}

function detectCertificateDate(text: string): string | null {
  const patterns = [
    /held (?:on )?([A-Z][a-z]+ \d{1,2},? \d{4})/,
    /\bon\s+([A-Z][a-z]+ \d{1,2},? \d{4})/,
    /([A-Z][a-z]+ \d{1,2},? \d{4})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const dateParts = match[1].match(/^([A-Z][a-z]+) (\d{1,2}),? (\d{4})$/);
    if (!dateParts) continue;
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const month = months.findIndex((value) =>
      value.startsWith(dateParts[1].toLowerCase()),
    );
    const day = Number(dateParts[2]);
    const year = Number(dateParts[3]);
    if (month < 0) continue;
    const parsedDate = new Date(Date.UTC(year, month, day));
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month ||
      parsedDate.getUTCDate() !== day
    ) {
      continue;
    }
    return [
      year.toString().padStart(4, "0"),
      (month + 1).toString().padStart(2, "0"),
      day.toString().padStart(2, "0"),
    ].join("-");
  }
  return null;
}

function detectPlatform(text: string): string | null {
  const via = text.match(/\bvia\s+(.+?)(?:\s+platform|\.)/i);
  if (via) return via[1].trim();
  const match = text.match(/\b(online|virtual|face-to-face|hybrid|webinar|onsite|on-site)\b/i);
  return match ? titleCase(match[1]) : null;
}

function detectSignatory(lines: string[]): [string | null, string | null] {
  for (let index = 0; index < lines.length; index += 1) {
    const capitalizedWords: string[] = [];
    for (const word of lines[index].split(/\s+/)) {
      if (/^[A-Z][A-Z.,'-]*$/.test(word)) capitalizedWords.push(word);
      else break;
    }
    const name = capitalizedWords.join(" ");
    if (
      capitalizedWords.length >= 2 &&
      capitalizedWords.length <= 5 &&
      name.length >= 8 &&
      !/academy|department|republic|certificate|philippines|held|conduct/i.test(name)
    ) {
      for (const nextLine of lines.slice(index + 1, index + 3)) {
        const title = nextLine.match(CERTIFICATE_TITLE);
        if (title) return [titleCase(name), title[0].trim()];
      }
    }
  }
  for (let index = 1; index < lines.length; index += 1) {
    const title = lines[index].match(CERTIFICATE_TITLE);
    if (!title) continue;
    const name = lines[index - 1].match(
      /(?:(?:Dr|Engr|Atty|Prof|Mr|Ms|Mrs)\.\s+)?[A-Z][a-z'\u2019-]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'\u2019-]+){1,2}\s*$/,
    );
    if (name) return [name[0].trim(), title[0].trim()];
  }
  return [null, null];
}

function detectVerificationCode(lines: string[]): string | null {
  for (const line of lines.slice(-6).reverse()) {
    for (const token of line.split(/\s+/)) {
      if (
        token.length >= 8 &&
        token.length <= 14 &&
        /^[A-Za-z0-9]+$/.test(token) &&
        /[a-z]/.test(token) &&
        /[A-Z]/.test(token) &&
        !/^[A-Z][a-z]+$/.test(token)
      ) {
        return token;
      }
    }
  }
  return null;
}

export function parseCertificate(text: string): CertificateOcrDetails {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const flatText = lines.join(" ");
  const type = detectCertificateType(flatText);
  const [signedBy, signerTitle] = detectSignatory(lines);
  return {
    type: type.name,
    typeNote: type.note,
    typeInferred: type.inferred,
    hours: detectCertificateHours(flatText),
    cpdUnits: detectCpdUnits(flatText),
    accreditation: detectAccreditation(flatText),
    issuer: detectIssuer(lines, flatText),
    awardedTo: detectAwardedTo(lines),
    activity: detectActivity(flatText),
    date: detectCertificateDate(flatText),
    platform: detectPlatform(flatText),
    signedBy,
    signerTitle,
    verificationCode: detectVerificationCode(lines),
  };
}

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

export function extractDocumentValues(
  text: string,
): Pick<DocumentOcrResult, "trainingHours" | "totalUnits"> {
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

    const recognizedText = pagesText
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .trim();
    const extracted = extractDocumentValues(recognizedText);
    const certificate = parseCertificate(recognizedText);
    return {
      ...extracted,
      trainingHours: certificate.hours ?? extracted.trainingHours,
      recognizedText,
      certificate,
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
