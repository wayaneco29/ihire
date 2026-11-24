"use client";
import { ScoringProfileEditor } from "@/components/scoring/ScoringProfileEditor";
import type { ScoringRule } from "@/types/scoring";
import { saveScoringProfile } from "../actions";

import { useState } from "react";
import { Alert, Modal, Table, type TableColumnsType } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/form";
import { StatusTag } from "@/components/ui/StatusTag";
import { Button } from "@/components/ui/Button";
import {
  formatExperienceStandard,
  formatTrainingStandard,
} from "@/utils/format-position-standards";
import {
  positionSchema,
  type PositionValues,
} from "../schema";
import {
  createPosition,
} from "../actions";

type Criterion = {
  criterion_key: string;
  id: string;
  position_id: string;
  title: string;
  display_order: number;
};

type Position = {
  id: string;
  title: string;
  is_active: boolean;
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
  profile?: { version: number; weights: Record<string, number>; rules: ScoringRule[] };
  positionCriteria?: Criterion[];
};

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
    { version: number; weights: Record<string, number>; rules: ScoringRule[] }
  >;
}) {
  const router = useRouter();
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "teaching" | "non-teaching" | "needs-setup" | "archived"
  >("all");
  const activePositions = positions.filter((position) => position.is_active);
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
  const configuredCount = activePositions.filter(
    (position) => profileByPosition[position.id],
  ).length;
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      positions: group.positions.filter((position) => {
        if (filter === "needs-setup") {
          return position.is_active && !profileByPosition[position.id];
        }
        if (filter === "archived") return !position.is_active;
        return filter === "all" || group.applicationType === filter;
      }),
    }))
    .filter((group) => group.positions.length > 0);
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
          <span className="flex items-center gap-2 font-semibold text-ink">
            {title}
            {!row.position?.is_active && (
              <StatusTag className="border-line bg-panel-muted text-muted">
                Archived
              </StatusTag>
            )}
          </span>
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
      width: 280,
      align: "right",
      fixed: "right",
      className: "pr-6!",
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.position ? (
          <div className="flex flex-wrap justify-end gap-2">
            <ScoringProfileEditor
              title={`${row.position.title} scoring profile`}
              educationLevels={educationLevels}
              requireComplete
              rules={row.profile?.rules ?? (row.positionCriteria ?? []).map((criterion) => ({ criterion_id: criterion.id, criterion_key: criterion.criterion_key, title: criterion.title, points: 0, minimum_level: null, bands: [{ threshold: 0, points: 0 }] }))}
              onSave={async (rules) => { const result = await saveScoringProfile(row.position!.id, rules); if (result.success) router.refresh(); return result; }}
              label={row.profile ? "Edit scoring profile" : "Set up profile"}
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
      count: activePositions.length - configuredCount,
    },
    {
      key: "archived" as const,
      label: "Archived",
      count: positions.length - activePositions.length,
    },
  ];

  return (
    <section className="mt-7 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-panel px-5 py-4 shadow">
        <div className="flex items-baseline gap-3">
          <strong className="text-xl text-ink">
            {configuredCount} of {activePositions.length}
          </strong>
          <span className="text-sm text-muted">
            active positions fully set up
          </span>
        </div>
        <div
          className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-panel-muted"
          role="progressbar"
          aria-label="Positions fully set up"
          aria-valuemin={0}
          aria-valuemax={activePositions.length}
          aria-valuenow={configuredCount}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{
              width: `${activePositions.length ? (configuredCount / activePositions.length) * 100 : 0}%`,
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
              className={`inline-flex min-h-11 items-center justify-center rounded-full border px-6 text-sm font-semibold cursor-pointer transition-colors ${filter === option.key ? "border-primary/50 bg-primary-light text-ink" : "border-line bg-transparent text-muted hover:bg-panel"}`}
              key={option.key}
              onClick={() => setFilter(option.key)}
              type="button"
            >
              <span className="text-sm!">{option.label} </span>
              <span className="ml-2 font-semibold">{option.count}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-sm border border-line bg-panel shadow">
        <Table<CriteriaTableRow>
          className="criteria-table [&_.ant-table-thead>tr>th]:bg-panel-muted [&_.ant-table-thead>tr>th]:px-4 [&_.ant-table-thead>tr>th]:py-3 [&_.ant-table-thead>tr>th]:text-ink [&_.ant-table-tbody>tr>td]:border-line-subtle [&_.ant-table-tbody>tr>td]:bg-panel [&_.ant-table-tbody>tr>td]:px-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr>td]:text-ink [&_.ant-table-tbody>tr.criteria-group-row>td]:bg-panel-muted"
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
          scroll={{ x: 1230 }}
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
