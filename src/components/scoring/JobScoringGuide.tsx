"use client";

import { Tabs } from "antd";
import type { EducationLevel, ScoringRule } from "@/types/scoring";
import {
  QualificationReference,
  ScoringRulesTable,
} from "./ScoringRulesTable";

export function JobScoringGuide({
  positions,
  educationLevels,
}: {
  positions: {
    id: string;
    title: string;
    scoringRules: ScoringRule[];
  }[];
  educationLevels: EducationLevel[];
}) {
  return (
    <section className="space-y-4 border-t border-line-subtle py-6">
      <h2 className="text-lg font-semibold text-ink">How scoring works</h2>
      <p className="text-sm leading-6 text-muted">
        Your qualification level is compared with the position’s minimum. The
        highest comparison threshold you meet determines your points. These are
        the rules saved for this posting. Meeting the minimum may earn zero
        comparative points; qualification decisions are assessed separately.
        Estimated scores remain subject to review of your records.
      </p>
      <Tabs
        items={positions.map((position) => ({
          key: position.id,
          label: position.title,
          children: (
            <ScoringRulesTable
              educationLevels={educationLevels}
              rules={position.scoringRules}
            />
          ),
        }))}
      />
      <QualificationReference educationLevels={educationLevels} />
    </section>
  );
}
