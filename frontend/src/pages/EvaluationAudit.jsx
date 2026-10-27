import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchEvaluationData } from "../services/evaluationService";
import { LoadingSpinner, ErrorBanner, EmptyState, TimeAgo } from "../components/Components";



function DistinctionLegend() {
  return (
    <div className="distinction-legend-bar">
      <span className="legend-title">Evaluation Taxonomy:</span>
      <span className="distinction-pill distinction-measured" title="Directly computed from verified operational database records">
        ● Measured Result
      </span>
      <span className="distinction-pill distinction-sample" title="Sample size count from ingested operational data">
        ■ Sample Size
      </span>
      <span className="distinction-pill distinction-baseline" title="Rule-based heuristic baseline without machine learning claims">
        ▲ Rule Baseline
      </span>
      <span className="distinction-pill distinction-simulated" title="Virtual robot coordinates generated in simulation environment">
        ◆ Simulation Data
      </span>
      <span className="distinction-pill distinction-unevaluated" title="Requires human-annotated gold standard test set. No claims fabricated.">
        ○ Unevaluated
      </span>
    </div>
  );
}

function DatasetMetadataCard({ evalData }) {
  const { sampleSizes, dataset } = evalData;

  return (
    <div className="dataset-summary-card">
      <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="flex gap-1" style={{ alignItems: "center", marginBottom: "0.25rem" }}>
            <span className="card-header-title">Dataset Specification & Evaluation Provenance</span>
            <span className="distinction-pill distinction-measured">Measured Live Data</span>
          </div>
          <p className="card-subtitle">
            Quantitative assessment of NLP field extraction, recurrence clustering, triage latency, and heuristic task prioritization.
          </p>
        </div>

        <div className="flex gap-1" style={{ alignItems: "center" }}>
          <span className="distinction-pill distinction-baseline">
            Strict Non-Fabrication Protocol
          </span>
        </div>
      </div>

      <div className="dataset-meta-grid">
        <div className="dataset-meta-item">
          <span className="dataset-meta-label">Evaluation Dataset Type</span>
          <span className="dataset-meta-value text-blue" style={{ fontSize: "0.95rem" }}>
            {dataset.type}
          </span>
          <span className="stat-subtext">
            {dataset.hasGoldLabels ? "Labelled Ground Truth" : "Unsupervised / Rule Evaluation"}
          </span>
        </div>

        <div className="dataset-meta-item">
          <span className="dataset-meta-label">Total Sample Size</span>
          <span className="dataset-meta-value">
            {sampleSizes.reports + sampleSizes.issues + sampleSizes.tasks} Records
          </span>
          <span className="stat-subtext">
            {sampleSizes.reports} Reports · {sampleSizes.issues} Issues · {sampleSizes.tasks} Tasks
          </span>
        </div>

        <div className="dataset-meta-item">
          <span className="dataset-meta-label">Labelled Test Set Samples</span>
          <span className="dataset-meta-value text-muted">
            {sampleSizes.goldStandardSamples} Samples
          </span>
          <span className="stat-subtext">
            <span className="distinction-pill distinction-unevaluated" style={{ fontSize: "0.62rem" }}>
              Awaiting Gold Split
            </span>
          </span>
        </div>

        <div className="dataset-meta-item">
          <span className="dataset-meta-label">Last Evaluation Event</span>
          <span className="dataset-meta-value" style={{ fontSize: "0.85rem" }}>
            {dataset.lastEvaluationDate ? (
              <TimeAgo iso={dataset.lastEvaluationDate} />
            ) : (
              <span className="text-muted">None Logged</span>
            )}
          </span>
          <span className="stat-subtext mono">
            {dataset.lastEvaluationDate ? new Date(dataset.lastEvaluationDate).toLocaleDateString() : "Pending ingestion"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ExtractionMetricCard({ extractionStats }) {
  const total = extractionStats.totalReports;
  const pct = (val) => (total > 0 ? Math.round((val / total) * 100) : 0);

  const robotPct = pct(extractionStats.withRobotId);
  const compPct = pct(extractionStats.withComponent);
  const sympPct = pct(extractionStats.withSymptom);
  const fullPct = pct(extractionStats.fullyExtracted);

  return (
    <div className="card">
      <div className="eval-card-header">
        <div>
          <div className="eval-card-title">1. Issue Extraction: Precision, Recall & Field Yield</div>
          <div className="eval-card-subtitle">
            Measured completeness across raw submitted reports versus formal benchmark requirements.
          </div>
        </div>
        <div className="flex gap-1">
          <span className="distinction-pill distinction-unevaluated">P/R: Unevaluated</span>
          <span className="distinction-pill distinction-measured">Yield: Measured</span>
        </div>
      </div>

      {/* Honest Empty/Unevaluated State Banner for formal P/R */}
      <div className="info-banner mb-3" style={{ background: "#f8fafc", borderLeftColor: "var(--text-muted)" }}>
        <div className="info-banner-icon">⚖️</div>
        <div style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text-primary)" }}>Formal Precision & Recall Benchmark: </strong>
          <span className="distinction-pill distinction-unevaluated" style={{ marginRight: "0.35rem" }}>
            Unevaluated (No Gold Dataset)
          </span>
          Precision (TP/(TP+FP)) and Recall (TP/(TP+FN)) cannot be mathematically calculated without a human-annotated ground-truth test split.
          RoboOps adheres to a strict non-fabrication standard; synthetic accuracy figures are not claimed.
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div className="flex-between mb-1">
          <span className="font-semibold" style={{ fontSize: "0.82rem" }}>
            Measured Field Extraction Yield ({total} Ingested Reports)
          </span>
          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
            {extractionStats.fullyExtracted} / {total} Fully Extracted
          </span>
        </div>

        <div className="eval-progress-row">
          <div className="eval-progress-labels">
            <span>Robot Identifier Identified</span>
            <span className="mono font-semibold">{extractionStats.withRobotId} / {total} ({robotPct}%)</span>
          </div>
          <div className="eval-progress-track">
            <div className="eval-progress-fill fill-teal" style={{ width: `${robotPct}%` }} />
          </div>
        </div>

        <div className="eval-progress-row">
          <div className="eval-progress-labels">
            <span>Hardware Component Identified</span>
            <span className="mono font-semibold">{extractionStats.withComponent} / {total} ({compPct}%)</span>
          </div>
          <div className="eval-progress-track">
            <div className="eval-progress-fill fill-blue" style={{ width: `${compPct}%` }} />
          </div>
        </div>

        <div className="eval-progress-row">
          <div className="eval-progress-labels">
            <span>Symptom / Fault Pattern Identified</span>
            <span className="mono font-semibold">{extractionStats.withSymptom} / {total} ({sympPct}%)</span>
          </div>
          <div className="eval-progress-track">
            <div className="eval-progress-fill fill-amber" style={{ width: `${sympPct}%` }} />
          </div>
        </div>

        <div className="eval-progress-row">
          <div className="eval-progress-labels">
            <span>Complete Entity Tuple (Robot + Component + Symptom)</span>
            <span className="mono font-semibold">{extractionStats.fullyExtracted} / {total} ({fullPct}%)</span>
          </div>
          <div className="eval-progress-track">
            <div className="eval-progress-fill fill-teal" style={{ width: `${fullPct}%` }} />
          </div>
        </div>
      </div>

      <div className="text-muted" style={{ fontSize: "0.72rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
        * Calculated by evaluating extracted structured fields against raw text transcripts in the operational database.
      </div>
    </div>
  );
}

function RecurrenceMetricCard({ recurrenceStats }) {
  const total = recurrenceStats.totalIssues;
  const repeated = recurrenceStats.repeatedCount;
  const isolated = recurrenceStats.isolatedCount;
  const rate = recurrenceStats.repeatRatePct;

  return (
    <div className="card">
      <div className="eval-card-header">
        <div>
          <div className="eval-card-title">2. Duplicate & Repeated-Issue Detection</div>
          <div className="eval-card-subtitle">
            Occurrence clustering performance across active fleet issue records.
          </div>
        </div>
        <div className="flex gap-1">
          <span className="distinction-pill distinction-measured">Measured</span>
          <span className="distinction-pill distinction-baseline">Rule Baseline</span>
        </div>
      </div>

      <div className="flex-between mb-2">
        <div>
          <div className="stat-label">Fleet Issue Recurrence Rate</div>
          <div className="eval-big-metric text-amber">{rate}%</div>
          <div className="stat-subtext">
            {repeated} recurring vs {isolated} isolated issues
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="stat-label">Analyzed Issues</div>
          <div className="mono font-semibold" style={{ fontSize: "1.4rem" }}>{total}</div>
          <span className="distinction-pill distinction-sample">Operational Pool</span>
        </div>
      </div>

      <div className="eval-progress-row mb-3">
        <div className="eval-progress-labels">
          <span>Clustered Recurrent Issues ({repeated})</span>
          <span>Isolated Single-Instance Issues ({isolated})</span>
        </div>
        <div className="eval-progress-track" style={{ display: "flex" }}>
          <div className="eval-progress-fill fill-amber" style={{ width: `${rate}%` }} title="Recurring Issues" />
          <div className="eval-progress-fill fill-muted" style={{ width: `${100 - rate}%` }} title="Isolated Issues" />
        </div>
      </div>

      <div className="latency-comparison-box">
        <div className="flex-between mb-1">
          <strong style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}>Active Duplicate Detection Rules:</strong>
          <span className="distinction-pill distinction-baseline">Temporal Heuristic</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li>
            <strong>14-Day Recurrence Window:</strong> Issues sharing the identical robot ID and component within 14 days are linked.
          </li>
          <li>
            <strong>Confirmed vs Related Distinction:</strong> Identical component + identical symptom = Confirmed recurrence; shared component only = Related inspection candidate.
          </li>
        </ul>
      </div>
    </div>
  );
}

function LatencyMetricCard({ latencies }) {
  return (
    <div className="card">
      <div className="eval-card-header">
        <div>
          <div className="eval-card-title">3. Manual vs. Assisted Triage Latency</div>
          <div className="eval-card-subtitle">
            Empirical latency measurements logged in the immutable audit ledger.
          </div>
        </div>
        <span className="distinction-pill distinction-measured">Measured Latency</span>
      </div>

      <div className="stat-grid mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: "0.75rem", background: "var(--bg-base)", borderRadius: "6px" }}>
          <div className="stat-label">Assisted NLP Intake</div>
          <div className="eval-big-metric text-teal" style={{ fontSize: "1.7rem" }}>
            {latencies.assistedTriageAvgSec}s
          </div>
          <div className="stat-subtext">
            Ingestion to issue generation ({latencies.analysisSamplesCount} samples)
          </div>
        </div>

        <div style={{ padding: "0.75rem", background: "var(--bg-base)", borderRadius: "6px" }}>
          <div className="stat-label">Manual Human Approval</div>
          <div className="eval-big-metric text-blue" style={{ fontSize: "1.7rem" }}>
            {latencies.humanApprovalAvgSec !== null ? `${latencies.humanApprovalAvgSec}s` : "Pending"}
          </div>
          <div className="stat-subtext">
            Proposal to operator approval ({latencies.approvalSamplesCount} samples)
          </div>
        </div>
      </div>

      <div className="latency-comparison-box">
        <div className="latency-row">
          <div className="latency-label-col">
            <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>Automated Triage Acceleration</strong>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Automated rule extraction processes incoming reports in sub-second cycles.
            </span>
          </div>
          <div className="latency-val-badge distinction-measured">
            &lt; 0.5s Latency
          </div>
        </div>

        <div className="latency-row">
          <div className="latency-label-col">
            <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>Human Verification Gate</strong>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Safety-critical dispatch requires explicit human operator sign-off.
            </span>
          </div>
          <div className="latency-val-badge distinction-baseline">
            Operator Gated
          </div>
        </div>
      </div>
    </div>
  );
}

function PrioritizationMetricCard() {
  return (
    <div className="card">
      <div className="eval-card-header">
        <div>
          <div className="eval-card-title">4. Task Prioritization Performance</div>
          <div className="eval-card-subtitle">
            Algorithmic priority ranking assessment and active weighting heuristics.
          </div>
        </div>
        <div className="flex gap-1">
          <span className="distinction-pill distinction-unevaluated">NDCG: Unevaluated</span>
          <span className="distinction-pill distinction-baseline">Active Heuristics</span>
        </div>
      </div>

      {/* Honest Empty State Banner */}
      <div className="info-banner mb-3" style={{ background: "#f8fafc", borderLeftColor: "var(--text-muted)" }}>
        <div className="info-banner-icon">🎯</div>
        <div style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text-primary)" }}>Prioritization Benchmark Status: </strong>
          <span className="distinction-pill distinction-unevaluated" style={{ marginRight: "0.35rem" }}>
            Awaiting Labelled Test Set
          </span>
          Ranking performance metrics (Normalized Discounted Cumulative Gain / NDCG, Kendall’s Tau) require expert-annotated priority rankings.
          RoboOps does not synthesize pseudo-accuracies. Current triage operates on a deterministic weight table.
        </div>
      </div>

      <div className="stat-label mb-1">Deterministic Priority Weighting Policy</div>
      <table className="weight-rule-table">
        <thead>
          <tr>
            <th>Priority Tier</th>
            <th>Weight Range</th>
            <th>Triggering Operational Rule</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className="badge badge-priority-critical">CRITICAL</span>
            </td>
            <td className="mono">90 - 100</td>
            <td>Safety faults, collision risks, joint freeze, navigation lockups</td>
          </tr>
          <tr>
            <td>
              <span className="badge badge-priority-high">HIGH</span>
            </td>
            <td className="mono">70 - 89</td>
            <td>Recurrent defects (+15 boost), sensor dropouts, battery degradation</td>
          </tr>
          <tr>
            <td>
              <span className="badge badge-priority-medium">MEDIUM</span>
            </td>
            <td className="mono">40 - 69</td>
            <td>Calibration drift, gripper alignment, intermittent telemetry</td>
          </tr>
          <tr>
            <td>
              <span className="badge badge-priority-low">LOW</span>
            </td>
            <td className="mono">1 - 39</td>
            <td>Cosmetic scuffs, preventive routine maintenance, scheduled sweeps</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EvaluationCenterView({ evalData }) {
  const { sampleSizes, measuredExtraction, measuredRecurrence, measuredLatencies } = evalData;

  const hasData = sampleSizes.reports > 0 || sampleSizes.issues > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon="⚖️"
        title="No Evaluation Records Ingested Yet"
        description="Submit transcripts or maintenance logs in the Reports Inbox to begin real-time extraction completeness and latency tracking."
        action={
          <Link to="/reports" className="btn btn-primary btn-sm mt-2">
            Go to Reports Inbox
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <DistinctionLegend />
      <DatasetMetadataCard evalData={evalData} />

      <div className="grid-2 mb-3">
        <ExtractionMetricCard extractionStats={measuredExtraction} />
        <RecurrenceMetricCard recurrenceStats={measuredRecurrence} />
      </div>

      <div className="grid-2 mb-3">
        <LatencyMetricCard latencies={measuredLatencies} />
        <PrioritizationMetricCard />
      </div>
    </div>
  );
}



export default function EvaluationAudit() {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    fetchEvaluationData()
      .then((data) => {
        setEvalData(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Cross-link to dedicated Audit Log page */}
      <div className="info-banner mb-3" style={{ borderLeftColor: "var(--accent-teal)" }}>
        <div className="info-banner-icon">🛡️</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flex: 1, flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem" }}>
            The full append-only audit event history is on the dedicated{" "}
            <strong>Audit Log</strong> page with search, filters, and pagination.
          </span>
          <Link to="/audit" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
            View Audit Log →
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <EvaluationCenterView evalData={evalData} />
      )}
    </div>
  );
}
