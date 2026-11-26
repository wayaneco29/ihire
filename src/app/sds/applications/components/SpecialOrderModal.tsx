"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, message, Modal } from "antd";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormDatePicker, FormInput } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { philippineToday } from "@/utils/philippine-time";
import { specialOrderSchema, type SpecialOrderValues } from "@/utils/special-order-schema";

type Props = { applicationId: string; applicantName: string; positionTitle: string; open: boolean; onClose: () => void };

export function SpecialOrderModal(props: Props) {
  return <Modal open={props.open} onCancel={props.onClose} title="Special Order" width={1100} footer={null} destroyOnHidden>
    {props.open && <SpecialOrderEditor {...props} />}
  </Modal>;
}

function SpecialOrderEditor({ applicationId, applicantName, positionTitle, onClose }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const form = useForm<SpecialOrderValues>({ resolver: yupResolver(specialOrderSchema), mode: "onChange",
    defaultValues: async () => {
      const defaults = { position: positionTitle, designation: "", orderNumber: "", date: philippineToday() };
      try {
        const response = await fetch(`/sds/applications/${applicationId}/special-order`, { cache: "no-store" });
        if (!response.ok) throw new Error((await response.json()).message);
        return (await response.json()).values ?? defaults;
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Saved details could not be loaded. Close and reopen to try again.");
        return defaults;
      }
    } });
  const initializing = form.formState.isLoading;
  const { position, designation, orderNumber, date } = useWatch({ control: form.control });

  useEffect(() => {
    if (initializing || loadError) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch(`/sds/applications/${applicationId}/special-order`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ position, designation, orderNumber, date, preview: true }),
        });
        if (!response.ok) throw new Error((await response.json()).message);
        const blob = await response.blob();
        const { renderAsync } = await import("docx-preview");
        const rendered = document.createElement("div");
        await renderAsync(blob, rendered, undefined, { useBase64URL: true, renderAltChunks: false, ignoreWidth: true });
        if (!controller.signal.aborted) container.current?.replaceChildren(...Array.from(rendered.childNodes));
      } catch (error) {
        if (!controller.signal.aborted) {
          container.current?.replaceChildren();
          setPreviewError(error instanceof Error ? error.message : "Preview could not be loaded.");
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [applicationId, position, designation, orderNumber, date, initializing, loadError]);

  async function save(values: SpecialOrderValues, download = false) {
    setDownloadError(null);
    try {
      const response = await fetch(`/sds/applications/${applicationId}/special-order`, {
        method: download ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error((await response.json()).message);
      messageApi.success("Special Order saved. The applicant can now download it.");
      if (!download) return;
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `special-order-${applicationId}.docx`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setDownloadError(error instanceof Error ? error.message : "Save failed. Try again."); }
  }

  return <div className="space-y-4">
    {contextHolder}
    <p className="text-sm text-muted">Conforme: <strong className="text-ink">{applicantName}</strong>. Save the completed Special Order to make it available for the applicant to download. Preview changes are not saved automatically.</p>
    {loadError && <Alert type="error" message={loadError} showIcon />}
    {initializing && <p role="status">Loading saved Special Order...</p>}
    <form onSubmit={form.handleSubmit(values => save(values))} className="space-y-4">
      <fieldset disabled={initializing || Boolean(loadError) || form.formState.isSubmitting}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput control={form.control} name="position" label="Appointment position" required maxLength={160} />
        <FormInput control={form.control} name="designation" label="Designation / assignment" placeholder="School, office, or assignment" required maxLength={300} />
        <FormInput control={form.control} name="orderNumber" label="Special Order number" maxLength={80} />
        <FormDatePicker control={form.control} name="date" label="Order date" format="MMMM DD, YYYY" valueFormat="YYYY-MM-DD" required />
      </div>
      </fieldset>
      {downloadError && <Alert type="error" message={downloadError} showIcon />}
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} disabled={form.formState.isSubmitting} variant="bordered">Close</Button>
        <Button type="submit" disabled={initializing || Boolean(loadError) || form.formState.isSubmitting} loading={form.formState.isSubmitting} variant="filled">Save Special Order</Button>
        <Button disabled={initializing || Boolean(loadError) || form.formState.isSubmitting} onClick={form.handleSubmit(values => save(values, true))} variant="bordered">Save &amp; download</Button>
      </div>
    </form>
    {loading && <p role="status" className="text-sm text-muted">Updating document preview…</p>}
    {previewError && <Alert type="error" message={previewError} showIcon />}
    <div ref={container} aria-label="Special Order document preview" aria-busy={loading} className="max-h-[65vh] overflow-auto rounded border border-line bg-white text-black [&_.docx-wrapper]:p-3" />
  </div>;
}
