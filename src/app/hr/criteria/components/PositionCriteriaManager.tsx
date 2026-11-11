"use client";

import { Fragment, useState } from "react";
import { Alert, Button, Modal } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/form";
import { StatusTag } from "@/components/ui/StatusTag";
import {
  positionSchema,
  positionScoringStandardsSchema,
  positionWeightFormSchema,
  type PositionScoringStandardsValues,
  type PositionValues,
  type PositionWeightValues,
} from "../schema";
import {
  createPosition,
  savePositionScoringStandards,
  savePositionWeights,
} from "../actions";

type Criterion = {
  id: string;
  position_id: string;
  title: string;
  display_order: number;
};

type Position = {
  id: string;
  title: string;
  applicationType: string;
  base_qualification_level: number | null;
  base_training_increment_level: number | null;
  base_experience_increment_level: number | null;
};

type EducationLevel = {
  qualification_level: number;
  description: string;
};

const TRAINING_INCREMENT_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const level = index + 1;
  const lowerHours = index * 8;
  const range =
    level === 31
      ? `${lowerHours}+ hours`
      : `${lowerHours} to <${lowerHours + 8} hours`;
  return {
    label: `Level ${level} · ${range}`,
    value: level.toString(),
  };
});

function formatExperienceMonths(months: number) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years ? `${years} year${years === 1 ? "" : "s"}` : "",
    remainingMonths
      ? `${remainingMonths} month${remainingMonths === 1 ? "" : "s"}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const EXPERIENCE_INCREMENT_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const level = index + 1;
  const lowerMonths = index * 6;
  const upperMonths = lowerMonths + 6;
  const range =
    level === 1
      ? "<6 months"
      : level === 31
        ? "15+ years"
        : `${formatExperienceMonths(lowerMonths)} to <${formatExperienceMonths(upperMonths)}`;
  return {
    label: `Level ${level} · ${range}`,
    value: level.toString(),
  };
});

function PositionScoringStandardsEditor({
  position,
  educationLevels,
}: {
  position: Position;
  educationLevels: EducationLevel[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const form = useForm<PositionScoringStandardsValues>({
    resolver: yupResolver(
      positionScoringStandardsSchema,
    ) as Resolver<PositionScoringStandardsValues>,
    defaultValues: {
      baseQualificationLevel:
        position.base_qualification_level?.toString() ?? "",
      baseTrainingIncrementLevel:
        position.base_training_increment_level?.toString() ?? "",
      baseExperienceIncrementLevel:
        position.base_experience_increment_level?.toString() ?? "",
    },
  });

  async function submit(values: PositionScoringStandardsValues) {
    setMessage(null);
    const result = await savePositionScoringStandards(position.id, values);
    setMessage({ text: result.message, isError: !result.success });
    if (result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  const currentLevel = educationLevels.find(
    (level) => level.qualification_level === position.base_qualification_level,
  );
  const currentTrainingLevel = TRAINING_INCREMENT_OPTIONS.find(
    (option) => Number(option.value) === position.base_training_increment_level,
  );
  const currentExperienceLevel = EXPERIENCE_INCREMENT_OPTIONS.find(
    (option) =>
      Number(option.value) === position.base_experience_increment_level,
  );

  return (
    <>
      <div>
        <p className="text-sm text-ink">
          Education: {currentLevel?.description ?? "Not set"}
        </p>
        <p className="mt-1 text-sm text-ink">
          Training: {currentTrainingLevel?.label ?? "Not set"}
        </p>
        <p className="mt-1 text-sm text-ink">
          Experience: {currentExperienceLevel?.label ?? "Not set"}
        </p>
        <Button
          className="mt-1 px-0"
          onClick={() => {
            form.reset({
              baseQualificationLevel:
                position.base_qualification_level?.toString() ?? "",
              baseTrainingIncrementLevel:
                position.base_training_increment_level?.toString() ?? "",
              baseExperienceIncrementLevel:
                position.base_experience_increment_level?.toString() ?? "",
            });
            setMessage(null);
            setOpen(true);
          }}
          type="link"
        >
          {currentLevel || currentTrainingLevel || currentExperienceLevel
            ? "Update standards"
            : "Set standards"}
        </Button>
      </div>
      <Modal
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => {
          if (!form.formState.isSubmitting) setOpen(false);
        }}
        open={open}
        title={`Set ${position.title} scoring standards`}
      >
        <p className="mb-5 text-sm leading-6 text-muted">
          Set the minimum Education, Training, and Experience standards for this
          position. Training increments use 8-hour ranges; Experience uses
          6-month ranges.
        </p>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormSelect
            control={form.control}
            label="Base education standard"
            name="baseQualificationLevel"
            options={[
              { label: "Not set", value: "" },
              ...educationLevels.map((level) => ({
                label: `${level.qualification_level}. ${level.description}`,
                value: level.qualification_level.toString(),
              })),
            ]}
          />
          <FormSelect
            control={form.control}
            label="Minimum training increment level"
            name="baseTrainingIncrementLevel"
            options={[
              { label: "Not set", value: "" },
              ...TRAINING_INCREMENT_OPTIONS,
            ]}
          />
          <FormSelect
            control={form.control}
            label="Minimum experience increment level"
            name="baseExperienceIncrementLevel"
            options={[
              { label: "Not set", value: "" },
              ...EXPERIENCE_INCREMENT_OPTIONS,
            ]}
          />
          {message && (
            <Alert
              message={message.text}
              showIcon
              type={message.isError ? "error" : "success"}
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              disabled={form.formState.isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              htmlType="submit"
              loading={form.formState.isSubmitting}
              type="primary"
            >
              Save standards
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function CreatePositionForm({
  open,
  onCreated,
  onCancel,
}: Readonly<{
  open: boolean;
  onCreated: () => void;
  onCancel: () => void;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const form = useForm<PositionValues>({
    resolver: yupResolver(positionSchema) as Resolver<PositionValues>,
    defaultValues: { applicationType: "TEACHING", title: "" },
  });

  async function submit(values: PositionValues) {
    setMessage(null);
    const result = await createPosition(values);
    setMessage({ text: result.message, isError: !result.success });
    if (result.success) {
      form.reset({ applicationType: values.applicationType, title: "" });
      router.refresh();
      onCreated();
    }
  }

  function close() {
    if (form.formState.isSubmitting) return;
    form.reset({ applicationType: "TEACHING", title: "" });
    setMessage(null);
    onCancel();
  }

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      onCancel={close}
      open={open}
      title="Add a position"
    >
      <p className="mb-5 text-sm leading-6 text-muted">
        Choose a hiring type. The position will use that type’s criteria.
      </p>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
        <FormSelect
          control={form.control}
          label="Hiring type"
          name="applicationType"
          options={[
            { label: "Teaching", value: "TEACHING" },
            { label: "Non-teaching", value: "NON_TEACHING" },
          ]}
          required
        />
        <FormInput
          autoComplete="off"
          control={form.control}
          label="Position title"
          maxLength={160}
          name="title"
          placeholder="e.g. Teacher I"
          required
        />
        {message && (
          <Alert
            message={message.text}
            showIcon
            type={message.isError ? "error" : "success"}
          />
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button disabled={form.formState.isSubmitting} onClick={close}>
            Cancel
          </Button>
          <Button
            htmlType="submit"
            loading={form.formState.isSubmitting}
            type="primary"
          >
            Add position
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PositionWeightEditor({
  position,
  criteria,
  currentVersion,
  currentWeights,
}: {
  position: Position;
  criteria: Criterion[];
  currentVersion: number | null;
  currentWeights: Record<string, number>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const form = useForm<PositionWeightValues>({
    resolver: yupResolver(
      positionWeightFormSchema,
    ) as Resolver<PositionWeightValues>,
    mode: "onChange",
    defaultValues: {
      weights: criteria.map((criterion) => currentWeights[criterion.id] ?? 0),
    },
  });
  const weights = useWatch({ control: form.control, name: "weights" }) ?? [];
  const [open, setOpen] = useState(false);
  const total = weights.reduce(
    (sum, value) => sum + (Number.isFinite(Number(value)) ? Number(value) : 0),
    0,
  );
  const hasValidTotal = Math.round(total * 100) === 10000;

  async function submit(values: PositionWeightValues) {
    setMessage(null);
    const result = await savePositionWeights(position.id, {
      criterionIds: criteria.map((criterion) => criterion.id),
      weights: values.weights,
    });
    setMessage({ text: result.message, isError: !result.success });
    if (result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          form.reset({
            weights: criteria.map(
              (criterion) => currentWeights[criterion.id] ?? 0,
            ),
          });
          setMessage(null);
          setOpen(true);
        }}
        type="link"
      >
        Update
      </Button>
      <Modal
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => setOpen(false)}
        open={open}
        title={`Update ${position.title} criteria`}
        width={720}
      >
        <div className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusTag className="border-primary/20 bg-primary-light text-primary-dark">
                {position.applicationType === "teaching"
                  ? "Teaching"
                  : "Non-teaching"}
              </StatusTag>
              {currentVersion !== null && (
                <span className="text-xs text-muted">
                  Profile version {currentVersion}
                </span>
              )}
            </div>
            <p
              aria-live="polite"
              className={`text-sm font-semibold ${
                hasValidTotal ? "text-primary-dark" : "text-ink"
              }`}
            >
              {Number.isInteger(total) ? total : total.toFixed(2)} / 100 points
            </p>
          </div>
          <div
            aria-label={`Points assigned for ${position.title}`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.min(Math.max(total, 0), 100)}
            className="h-1.5 overflow-hidden rounded-full bg-panel-muted"
            role="progressbar"
          >
            <div
              className={`h-full rounded-full ${
                hasValidTotal ? "bg-primary" : "bg-line-strong"
              }`}
              style={{ width: `${Math.min(Math.max(total, 0), 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Set each criterion’s share. The allocation must total 100 points.
          </p>
        </div>
        <form onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-x-5 sm:grid-cols-2">
            {criteria.map((criterion, index) => (
              <FormInput
                control={form.control}
                key={criterion.id}
                label={criterion.title}
                max={100}
                min={0}
                name={`weights.${index}`}
                required
                step="0.01"
                type="number"
              />
            ))}
          </div>
          <p className="mb-4 text-xs leading-5 text-muted">
            Saving creates a new profile version; existing postings keep their
            saved version.
          </p>
          {message && (
            <Alert
              className="mb-4"
              message={message.text}
              showIcon
              type={message.isError ? "error" : "success"}
            />
          )}
          <div className="flex justify-end gap-3">
            <Button
              disabled={form.formState.isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !form.formState.isValid ||
                !hasValidTotal ||
                form.formState.isSubmitting
              }
              htmlType="submit"
              loading={form.formState.isSubmitting}
              type="primary"
            >
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PositionCriteriaManager({
  positions,
  criteria,
  educationLevels,
  profileByPosition,
}: {
  positions: Position[];
  criteria: Criterion[];
  educationLevels: EducationLevel[];
  profileByPosition: Record<
    string,
    { version: number; weights: Record<string, number> }
  >;
}) {
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const groups = [
    {
      title: "Teaching",
      applicationType: "teaching",
      positions: positions.filter(
        (position) => position.applicationType === "teaching",
      ),
    },
    {
      title: "Non-teaching",
      applicationType: "non-teaching",
      positions: positions.filter(
        (position) => position.applicationType === "non-teaching",
      ),
    },
  ];

  return (
    <section className="mt-7 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Position criteria
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Each position has its own criteria and a separate 100-point profile.
          </p>
        </div>
        <Button onClick={() => setIsAddingPosition(true)} type="primary">
          Add position
        </Button>
      </div>

      <CreatePositionForm
        onCancel={() => setIsAddingPosition(false)}
        onCreated={() => setIsAddingPosition(false)}
        open={isAddingPosition}
      />

      <div className="overflow-hidden rounded-md border border-line bg-panel shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-panel-muted text-xs font-semibold text-muted">
                <th className="px-5 py-3 w-30" scope="col">
                  Hiring type
                </th>
                <th className="px-5 py-3" scope="col">
                  Position
                </th>
                <th className="px-5 py-3" scope="col">
                  Minimum standards
                </th>
                <th className="px-5 py-3" scope="col">
                  Criteria profile
                </th>
                <th className="px-5 py-3 text-right" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                return (
                  <Fragment key={group.applicationType}>
                    <tr className="border-y border-line-subtle bg-panel-muted/70">
                      <th
                        className="px-5 py-3 text-sm font-semibold text-ink"
                        colSpan={5}
                        scope="rowgroup"
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span>{group.title}</span>
                          <span className="text-xs font-normal text-muted">
                            {group.positions.length}{" "}
                            {group.positions.length === 1
                              ? "position"
                              : "positions"}
                            {" · "}
                            separate criteria per position
                          </span>
                        </span>
                      </th>
                    </tr>
                    {group.positions.length ? (
                      group.positions.map((position) => {
                        const profile = profileByPosition[position.id];
                        const positionCriteria = criteria
                          .filter(
                            (criterion) =>
                              criterion.position_id === position.id,
                          )
                          .sort(
                            (left, right) =>
                              left.display_order - right.display_order,
                          );
                        return (
                          <Fragment key={position.id}>
                            <tr className="border-b border-line-subtle">
                              <td className="px-5 py-4 align-top text-sm text-muted" />
                              <th
                                className="px-5 py-4 text-left align-top text-sm font-semibold text-ink"
                                scope="row"
                              >
                                {position.title}
                              </th>
                              <td className="px-5 py-4 align-top">
                                <PositionScoringStandardsEditor
                                  educationLevels={educationLevels}
                                  position={position}
                                />
                              </td>
                              <td className="px-5 py-4 align-top">
                                {profile ? (
                                  <StatusTag className="border-primary/20 bg-primary-light text-primary-dark">
                                    Version {profile.version}
                                  </StatusTag>
                                ) : (
                                  <StatusTag className="border-warning/30 bg-warning/10 text-warning">
                                    Not configured
                                  </StatusTag>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right align-top">
                                <PositionWeightEditor
                                  criteria={positionCriteria}
                                  currentVersion={profile?.version ?? null}
                                  currentWeights={profile?.weights ?? {}}
                                  position={position}
                                />
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })
                    ) : (
                      <tr className="border-b border-line">
                        <td
                          className="px-5 py-5 text-sm text-muted"
                          colSpan={5}
                        >
                          No {group.title.toLowerCase()} positions yet. Use Add
                          position to create one and set its criteria.
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
