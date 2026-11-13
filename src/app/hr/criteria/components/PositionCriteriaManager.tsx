"use client";

import { useState } from "react";
import { Alert, Modal, Table, type TableColumnsType } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/form";
import { StatusTag } from "@/components/ui/StatusTag";
import { Button } from "@/components/ui/Button";
import {
  formatExperienceStandard,
  formatTrainingStandard,
} from "@/utils/format-position-standards";
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

type CriteriaTableRow = {
  key: string;
  kind: "group" | "position";
  title: string;
  count?: number;
  position?: Position;
  profile?: { version: number; weights: Record<string, number> };
  positionCriteria?: Criterion[];
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

  return (
    <>
      <Button
        className="!h-auto !px-2 text-xs!"
        size="sm"
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
        variant="ghost"
      >
        {position.base_qualification_level !== null ||
        position.base_training_increment_level !== null ||
        position.base_experience_increment_level !== null
          ? "Edit standards"
          : "Set standards"}
      </Button>
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
                label: `Level ${level.qualification_level} · ${level.description}`,
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
              variant="bordered"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={form.formState.isSubmitting}
              variant="filled"
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
          <Button
            disabled={form.formState.isSubmitting}
            onClick={close}
            variant="bordered"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            variant="filled"
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
        className="!px-3 text-xs!"
        size="sm"
        onClick={() => {
          form.reset({
            weights: criteria.map(
              (criterion) => currentWeights[criterion.id] ?? 0,
            ),
          });
          setMessage(null);
          setOpen(true);
        }}
        variant={currentVersion === null ? "filled" : "bordered"}
      >
        {currentVersion === null ? "Set up profile" : "Update profile"}
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
              variant="bordered"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !form.formState.isValid ||
                !hasValidTotal ||
                form.formState.isSubmitting
              }
              type="submit"
              loading={form.formState.isSubmitting}
              variant="filled"
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
  const [filter, setFilter] = useState<
    "all" | "teaching" | "non-teaching" | "needs-setup"
  >("all");
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
  const configuredCount = positions.filter(
    (position) => profileByPosition[position.id],
  ).length;
  const visibleGroups = groups
    .filter(
      (group) =>
        filter === "all" ||
        filter === "needs-setup" ||
        group.applicationType === filter,
    )
    .map((group) => ({
      ...group,
      positions: group.positions.filter(
        (position) =>
          filter !== "needs-setup" || !profileByPosition[position.id],
      ),
    }))
    .filter((group) => filter !== "needs-setup" || group.positions.length > 0);
  const rows: CriteriaTableRow[] = visibleGroups.flatMap((group) => [
    {
      key: `group-${group.applicationType}`,
      kind: "group" as const,
      title: group.title,
      count: group.positions.length,
    },
    ...group.positions.map((position) => ({
      key: position.id,
      kind: "position" as const,
      title: position.title,
      position,
      profile: profileByPosition[position.id],
      positionCriteria: criteria
        .filter((criterion) => criterion.position_id === position.id)
        .sort((a, b) => a.display_order - b.display_order),
    })),
  ]);
  const columns: TableColumnsType<CriteriaTableRow> = [
    {
      title: "Position",
      dataIndex: "title",
      key: "position",
      width: 190,
      fixed: "left",
      className: "pl-6!",
      onCell: (row) =>
        row.kind === "group"
          ? {
              colSpan: 6,
              className: "[&:after]:inset-0! py-2! bg-primary-light/50!",
            }
          : {},
      render: (title: string, row) =>
        row.kind === "group" ? (
          <span className="font-semibold text-ink sticky left-6">
            {title}{" "}
            <span className="ml-1 font-normal text-muted">
              {row.count} {row.count === 1 ? "position" : "positions"}
            </span>
          </span>
        ) : (
          <span className="font-semibold text-ink">{title}</span>
        ),
    },
    {
      title: "Education",
      key: "education",
      width: 230,
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) => {
        if (!row.position) return null;
        const level = educationLevels.find(
          (item) =>
            item.qualification_level === row.position?.base_qualification_level,
        );
        return (
          <StandardsValue
            level={level?.qualification_level}
            value={level?.description ?? "Not set"}
          />
        );
      },
    },
    {
      title: "Training",
      key: "training",
      width: 130,
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.position ? (
          <StandardsValue
            value={formatTrainingStandard(
              row.position.base_training_increment_level,
            )}
            level={row.position.base_training_increment_level}
          />
        ) : null,
    },
    {
      title: "Experience",
      key: "experience",
      width: 145,
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.position ? (
          <StandardsValue
            value={formatExperienceStandard(
              row.position.base_experience_increment_level,
            )}
            level={row.position.base_experience_increment_level}
          />
        ) : null,
    },
    {
      title: "Criteria profile",
      key: "profile",
      width: 145,
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.kind === "group" ? null : row.profile ? (
          <StatusTag className="border-primary/20 bg-primary-light text-primary-dark">
            Version {row.profile.version}
          </StatusTag>
        ) : (
          <StatusTag className="border-warning/30 bg-warning/10 text-warning">
            Not configured
          </StatusTag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 260,
      align: "right",
      fixed: "right",
      className: "pr-6!",
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.position ? (
          <div className="flex flex-wrap justify-end gap-2">
            <PositionScoringStandardsEditor
              educationLevels={educationLevels}
              position={row.position}
            />
            <PositionWeightEditor
              criteria={row.positionCriteria ?? []}
              currentVersion={row.profile?.version ?? null}
              currentWeights={row.profile?.weights ?? {}}
              position={row.position}
            />
          </div>
        ) : null,
    },
  ];
  const filterOptions = [
    { key: "all" as const, label: "All positions", count: positions.length },
    {
      key: "teaching" as const,
      label: "Teaching",
      count: groups[0].positions.length,
    },
    {
      key: "non-teaching" as const,
      label: "Non-teaching",
      count: groups[1].positions.length,
    },
    {
      key: "needs-setup" as const,
      label: "Needs setup",
      count: positions.length - configuredCount,
    },
  ];

  return (
    <section className="mt-7 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-panel px-5 py-4 shadow">
        <div className="flex items-baseline gap-3">
          <strong className="text-xl text-ink">
            {configuredCount} of {positions.length}
          </strong>
          <span className="text-sm text-muted">positions fully set up</span>
        </div>
        <div
          className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-panel-muted"
          role="progressbar"
          aria-label="Positions fully set up"
          aria-valuemin={0}
          aria-valuemax={positions.length}
          aria-valuenow={configuredCount}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{
              width: `${positions.length ? (configuredCount / positions.length) * 100 : 0}%`,
            }}
          />
        </div>
        <Button onClick={() => setIsAddingPosition(true)} variant="filled">
          Add position
        </Button>
      </div>
      <CreatePositionForm
        onCancel={() => setIsAddingPosition(false)}
        onCreated={() => setIsAddingPosition(false)}
        open={isAddingPosition}
      />
      <div className="rounded-sm bg-panel shadow px-5 py-4">
        <nav aria-label="Filter positions" className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              aria-pressed={filter === option.key}
              className={`min-h-10 rounded-full border px-6 text-sm! cursor-pointer transition-colors ${filter === option.key ? "border-primary/50 bg-primary-light text-ink" : "border-line bg-transparent text-muted hover:bg-panel"}`}
              key={option.key}
              onClick={() => setFilter(option.key)}
              type="button"
            >
              {option.label}{" "}
              <span className="font-semibold">{option.count}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-sm border border-line bg-panel shadow">
        <Table<CriteriaTableRow>
          className="criteria-table [&_.ant-table-thead>tr>th]:bg-panel [&_.ant-table-thead>tr>th]:px-4 [&_.ant-table-thead>tr>th]:py-3 [&_.ant-table-thead>tr>th]:text-muted [&_.ant-table-tbody>tr>td]:border-line-subtle [&_.ant-table-tbody>tr>td]:bg-panel [&_.ant-table-tbody>tr>td]:px-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr>td]:text-ink [&_.ant-table-tbody>tr.criteria-group-row>td]:bg-panel-muted"
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "No positions match this filter." }}
          pagination={false}
          rowClassName={(row) =>
            row.kind === "group"
              ? "criteria-group-row"
              : "criteria-position-row"
          }
          rowKey="key"
          scroll={{ x: 1085 }}
        />
      </div>
    </section>
  );
}

function StandardsValue({
  value,
  level,
}: {
  value: string;
  level?: number | null;
}) {
  if (value === "Not set") return <span className="text-warning">Not set</span>;
  return (
    <span className="inline-flex items-start gap-2 text-sm text-ink">
      {level != null && (
        <span className="rounded bg-primary-light px-1.5 py-0.5 text-xs font-semibold text-primary-dark">
          L{level}
        </span>
      )}
      <span>{value}</span>
    </span>
  );
}
