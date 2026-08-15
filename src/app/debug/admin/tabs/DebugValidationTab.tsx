import { useMemo, useState } from "react";
import { validateContent } from "../../../../game/validation/contentValidator";
import { DebugButton } from "../components/DebugButton";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

export function DebugValidationTab(_props: DebugTabProps) {
  const [runId, setRunId] = useState(0);
  const issues = useMemo(() => validateContent(), [runId]);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return <div className="debug-tab-content debug-column"><DebugSection title="Content/Data Validator" subtitle="Pure read-only validation of canonical catalogues and references."><div className="debug-button-row"><DebugButton action="run-content-validation" onClick={() => setRunId((value) => value + 1)}>RUN VALIDATION</DebugButton><span className="debug-badge">{errors.length} errors / {warnings.length} warnings</span></div></DebugSection><DebugSection title="Issues"><div className="debug-validation-list">{issues.length === 0 ? <p className="debug-note">No validation issues found.</p> : issues.map((issue, index) => <div key={`${issue.code}-${issue.entityId}-${index}`} data-debug-kind="content-validation-issue" data-debug-severity={issue.severity} data-debug-code={issue.code} data-debug-entity-type={issue.entityType} data-debug-entity-id={issue.entityId}><strong>{issue.severity.toUpperCase()} · {issue.code}</strong><span>{issue.entityType}:{issue.entityId} — {issue.message}</span></div>)}</div></DebugSection></div>;
}
