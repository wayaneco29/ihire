"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import { Alert, Upload } from "antd";
import type { UploadProps } from "antd";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
  DocumentArrowUpIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  useFieldArray,
  type Control,
  type FieldPath,
  type UseFormGetValues,
  useFormState,
} from "react-hook-form";
import { FormTextArea } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { extractPdfText } from "@/utils/extract-pdf-text";
import type { PostingValues } from "../schema";

type RequirementsEditorProps = {
  control: Control<PostingValues>;
  getValues: UseFormGetValues<PostingValues>;
  existingPdfUrl: string | null;
  removeExistingPdf: boolean;
  onPdfChange: (file: File | null) => void;
  onRemoveExistingPdf: (remove: boolean) => void;
};

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function RequirementDropPlaceholder({
  height,
}: Readonly<{ height: number | null }>) {
  return (
    <div
      aria-hidden="true"
      className="flex gap-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary-light/30 p-3 sm:p-4"
      style={height ? { height: `${height}px` } : undefined}
    >
      <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        <div className="h-7 w-7 rounded bg-primary/10" />
        <div className="h-3 w-5 rounded bg-primary/10" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <div className="h-3 w-28 rounded bg-primary/10" />
        <div className="h-10 rounded border border-dashed border-primary/20" />
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <div className="h-8 w-8 rounded bg-primary/10" />
        <div className="h-8 w-8 rounded bg-primary/10" />
        <div className="h-8 w-8 rounded bg-primary/10" />
      </div>
    </div>
  );
}

export function RequirementsEditor({
  control,
  getValues,
  existingPdfUrl,
  removeExistingPdf,
  onPdfChange,
  onRemoveExistingPdf,
}: Readonly<RequirementsEditorProps>) {
  const { fields, append, move, remove, replace } = useFieldArray({
    control,
    name: "requirements",
  });
  const { errors } = useFormState({ control, name: "requirements" });
  const requirementsError = errors.requirements?.message;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const [draggedHeight, setDraggedHeight] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    setError(null);
    setNotice(null);
    setSuggestions(null);

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Upload a PDF file.");
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("Choose a PDF that is 20 MB or smaller.");
      return Upload.LIST_IGNORE;
    }

    setPdfName(file.name);
    onPdfChange(file);
    onRemoveExistingPdf(false);
    void extractRequirements(file);
    return Upload.LIST_IGNORE;
  };

  async function extractRequirements(file: File) {
    setIsExtracting(true);
    setError(null);
    setNotice("Reading the PDF, then asking AI to identify its requirements.");

    try {
      const text = await extractPdfText(file);
      if (!text.trim()) {
        throw new Error(
          "No readable text was found in this PDF. Enter the requirements manually.",
        );
      }

      const response = await fetch("/api/hr/postings/extract-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Requirements could not be extracted. Try again or add them manually.";
        throw new Error(message);
      }

      const extracted =
        result &&
        typeof result === "object" &&
        "requirements" in result &&
        Array.isArray(result.requirements)
          ? result.requirements.filter(
              (item): item is string =>
                typeof item === "string" && item.trim().length > 0,
            )
          : [];

      if (!extracted.length) {
        throw new Error(
          "No specific requirements were found. Review the PDF or add requirements manually.",
        );
      }

      const existing = (getValues("requirements") ?? [])
        .map((item) => item.trim())
        .filter(Boolean);
      if (!existing.length) {
        replace(extracted);
        setNotice(
          `${extracted.length} draft ${extracted.length === 1 ? "requirement was" : "requirements were"} added. Review and edit them before saving.`,
        );
      } else {
        setSuggestions(extracted);
        setNotice(
          `AI found ${extracted.length} possible ${extracted.length === 1 ? "requirement" : "requirements"}. Choose how to apply them.`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Requirements could not be extracted. Try again or add them manually.",
      );
      setNotice(null);
    } finally {
      setIsExtracting(false);
    }
  }

  function getDropPosition(index: number, event: DragEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? index : index + 1;
  }

  function clearDragState() {
    setDraggedIndex(null);
    setDropPosition(null);
    setDraggedHeight(null);
  }

  function dropOn(index: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (draggedIndex !== null) {
      const insertionIndex = getDropPosition(index, event);
      const targetIndex =
        insertionIndex > draggedIndex ? insertionIndex - 1 : insertionIndex;
      if (targetIndex !== draggedIndex) {
        move(draggedIndex, targetIndex);
      }
    }
    clearDragState();
  }

  function addSuggestions() {
    if (!suggestions) return;
    const current = (getValues("requirements") ?? [])
      .map((item) => item.trim())
      .filter(Boolean);
    const existing = new Set(
      current.map((item) => item.toLocaleLowerCase()),
    );
    const additions = suggestions
      .filter((item) => !existing.has(item.trim().toLocaleLowerCase()))
      .slice(0, Math.max(0, 50 - fields.length));
    if (additions.length) {
      append(additions);
      setNotice(`${additions.length} new AI suggestion${additions.length === 1 ? " was" : "s were"} added.`);
    } else {
      setNotice(
        fields.length >= 50
          ? "The list already has the maximum of 50 requirements."
          : "These AI suggestions are already in the requirements list.",
      );
    }
    setSuggestions(null);
  }

  const isDropPositionCurrent =
    draggedIndex !== null &&
    (dropPosition === draggedIndex || dropPosition === draggedIndex + 1);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">
        Add at least one requirement. Drag items to sort them, or use the move
        buttons. Upload a PDF to create an editable draft list with AI.
      </p>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-3">
            {draggedIndex !== null &&
              !isDropPositionCurrent &&
              dropPosition === index && (
                <RequirementDropPlaceholder height={draggedHeight} />
              )}

            <div
              data-requirement-row
              className={`flex gap-3 rounded-lg border p-3 transition-colors sm:p-4 ${
                draggedIndex === index
                  ? "border-dashed border-primary/60 bg-primary-light/30 opacity-40"
                  : "border-line bg-panel"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedIndex !== null) {
                  setDropPosition(getDropPosition(index, event));
                }
              }}
              onDrop={(event) => dropOn(index, event)}
            >
              <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                <button
                  aria-label={`Drag to reorder requirement ${index + 1}`}
                  className="cursor-grab rounded-sm p-1 text-muted hover:bg-panel-muted hover:text-ink active:cursor-grabbing"
                  draggable
                  onDragEnd={clearDragState}
                  onDragStart={(event) => {
                    const row = event.currentTarget.closest<HTMLElement>(
                      "[data-requirement-row]",
                    );
                    if (row) {
                      const bounds = row.getBoundingClientRect();
                      setDraggedHeight(row.offsetHeight);
                      event.dataTransfer.setDragImage(
                        row,
                        event.clientX - bounds.left,
                        event.clientY - bounds.top,
                      );
                    }
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedIndex(index);
                    setDropPosition(index);
                  }}
                  type="button"
                >
                  <Bars3Icon aria-hidden="true" className="h-5 w-5" />
                </button>
                <span className="text-xs font-semibold text-muted">
                  {index + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <FormTextArea
                  control={control}
                  label={`Requirement ${index + 1}`}
                  maxLength={10000}
                  name={`requirements.${index}` as FieldPath<PostingValues>}
                  required
                  rows={2}
                  showCount
                />
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  aria-label={`Move requirement ${index + 1} up`}
                  className="min-h-9 px-2 py-1"
                  disabled={index === 0}
                  icon={<ArrowUpIcon aria-hidden="true" className="h-4 w-4" />}
                  onClick={() => move(index, index - 1)}
                  variant="ghost"
                />
                <Button
                  aria-label={`Move requirement ${index + 1} down`}
                  className="min-h-9 px-2 py-1"
                  disabled={index === fields.length - 1}
                  icon={<ArrowDownIcon aria-hidden="true" className="h-4 w-4" />}
                  onClick={() => move(index, index + 1)}
                  variant="ghost"
                />
                <Button
                  aria-label={`Remove requirement ${index + 1}`}
                  className="min-h-9 px-2 py-1"
                  icon={<TrashIcon aria-hidden="true" className="h-4 w-4" />}
                  onClick={() => remove(index)}
                  variant="danger"
                />
              </div>
            </div>
          </div>
        ))}
        {draggedIndex !== null &&
          !isDropPositionCurrent &&
          dropPosition === fields.length && (
            <RequirementDropPlaceholder height={draggedHeight} />
          )}
      </div>

      {fields.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
          No requirements added yet. Add an item or upload a PDF to get started.
        </p>
      )}
      {requirementsError && (
        <p className="text-sm text-danger" role="alert">
          {requirementsError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={fields.length >= 50}
          icon={<PlusIcon aria-hidden="true" className="h-4 w-4" />}
          onClick={() => append("")}
          variant="bordered"
        >
          Add requirement
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">Extract from a PDF</p>
        <Upload.Dragger
          accept="application/pdf,.pdf"
          beforeUpload={beforeUpload}
          className="rounded-sm"
          disabled={isExtracting}
          maxCount={1}
          multiple={false}
          showUploadList={false}
        >
          <div className="px-4 py-5">
            <DocumentArrowUpIcon
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-primary"
            />
            <p className="mt-2 text-sm font-semibold text-ink">
              {isExtracting
                ? "Reading PDF and finding requirements"
                : "Drop a PDF here or browse"}
            </p>
            <p className="mt-1 text-xs text-muted">
              PDF only, up to 20 MB and 30 pages
            </p>
          </div>
        </Upload.Dragger>
        {pdfName && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="break-all text-xs text-muted">
              Selected: {pdfName}
              {existingPdfUrl ? " (will replace current attachment on save)" : ""}
            </p>
            <Button
              className="min-h-9 px-2 py-1 text-sm"
              onClick={() => {
                setPdfName(null);
                onPdfChange(null);
              }}
              variant="ghost"
            >
              Clear selection
            </Button>
          </div>
        )}
        {!pdfName && existingPdfUrl && !removeExistingPdf && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
            <a
              className="break-all text-sm font-medium text-primary underline"
              href={existingPdfUrl}
              rel="noreferrer"
              target="_blank"
            >
              View attached requirements PDF
            </a>
            <Button
              className="min-h-9 px-2 py-1 text-sm"
              onClick={() => onRemoveExistingPdf(true)}
              variant="danger"
            >
              Remove attachment
            </Button>
          </div>
        )}
        {removeExistingPdf && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
            <p className="text-sm text-ink">
              The attached PDF will be removed when you save.
            </p>
            <Button
              className="min-h-9 px-2 py-1 text-sm"
              onClick={() => onRemoveExistingPdf(false)}
              variant="bordered"
            >
              Undo
            </Button>
          </div>
        )}
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <SparklesIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          The PDF is saved with the posting for applicants to view. Its text is
          sent to the configured AI service for extraction. Review the draft
          list before saving.
        </p>
        {error && <Alert message={error} showIcon type="error" />}
        {notice && (
          <Alert
            message={notice}
            showIcon
            type={isExtracting || suggestions ? "info" : "success"}
          />
        )}
      </div>

      {suggestions && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary-light p-4">
          <div>
            <h4 className="font-semibold text-ink">AI draft requirements</h4>
            <p className="mt-1 text-sm leading-6 text-muted">
              Check these against the PDF. Applying by replacement removes the
              current list; adding keeps existing items.
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-ink">
            {suggestions.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                replace(suggestions);
                setSuggestions(null);
                setNotice(`${suggestions.length} AI draft requirements replaced the current list.`);
              }}
              variant="filled"
            >
              Replace current list
            </Button>
            <Button onClick={addSuggestions} variant="bordered">
              Add to current list
            </Button>
            <Button onClick={() => setSuggestions(null)} variant="ghost">
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
