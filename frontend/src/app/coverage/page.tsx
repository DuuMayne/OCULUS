'use client';

import { useState, useEffect } from 'react';

interface CoverageGap {
  request_id: string;
  question: string;
  category: string;
  systems: string[];
  evidence_method: string;
  suggested_check: {
    key: string;
    connector: string;
    evaluator: string;
    config: Record<string, unknown>;
    source_question: string;
  } | null;
  frequency?: number;
}

interface CoverageSummary {
  total: number;
  covered_by_checks: number;
  gaps: number;
  skipped: number;
  coverage_rate: number;
}

// Mock data — in production this would come from the API
const MOCK_SUMMARY: CoverageSummary = {
  total: 42,
  covered_by_checks: 8,
  gaps: 28,
  skipped: 6,
  coverage_rate: 0.22,
};

const MOCK_GAPS: CoverageGap[] = [
  {
    request_id: 'CC6.2',
    question: 'Provide evidence of periodic access reviews validating user entitlements remain appropriate',
    category: 'Logical Access',
    systems: ['okta', 'jira'],
    evidence_method: 'Parallel collectors: okta, jira',
    suggested_check: { key: 'access_review_periodic', connector: 'okta', evaluator: 'access_review_cadence', config: {}, source_question: '' },
    frequency: 12,
  },
  {
    request_id: 'CC7.1',
    question: 'Provide evidence of endpoint detection and response coverage across all corporate devices',
    category: 'System Operations',
    systems: ['crowdstrike', 'kandji'],
    evidence_method: 'Parallel collectors: crowdstrike, kandji',
    suggested_check: { key: 'endpoint_coverage', connector: 'crowdstrike', evaluator: 'endpoint_coverage', config: {}, source_question: '' },
    frequency: 9,
  },
  {
    request_id: '500.14',
    question: 'Provide evidence of vulnerability scanning and remediation within defined SLAs',
    category: 'NYDFS 23 NYCRR 500',
    systems: ['crowdstrike', 'jira'],
    evidence_method: 'Parallel collectors: crowdstrike, jira',
    suggested_check: { key: 'vuln_sla_compliance', connector: 'crowdstrike', evaluator: 'vulnerability_sla', config: { critical_sla_hours: 72 }, source_question: '' },
    frequency: 8,
  },
  {
    request_id: 'CC5.2',
    question: 'Provide evidence that infrastructure changes require approval before deployment to production',
    category: 'Control Activities',
    systems: ['github', 'env0', 'jira'],
    evidence_method: 'Parallel collectors: github, env0',
    suggested_check: { key: 'deploy_approval_required', connector: 'github', evaluator: 'deployment_approval', config: {}, source_question: '' },
    frequency: 7,
  },
  {
    request_id: '8.7',
    question: 'Provide evidence of anti-malware protection deployed on all endpoints',
    category: 'Technological Controls',
    systems: ['crowdstrike', 'kandji'],
    evidence_method: 'Parallel collectors: crowdstrike, kandji',
    suggested_check: { key: 'antimalware_coverage', connector: 'crowdstrike', evaluator: 'endpoint_protection', config: {}, source_question: '' },
    frequency: 6,
  },
];

const MOCK_HISTORY = [
  { date: '2026-03', rate: 0.05 },
  { date: '2026-04', rate: 0.12 },
  { date: '2026-05', rate: 0.18 },
  { date: '2026-06', rate: 0.22 },
];

export default function CoveragePage() {
  const [summary, setSummary] = useState<CoverageSummary>(MOCK_SUMMARY);
  const [gaps, setGaps] = useState<CoverageGap[]>(MOCK_GAPS);
  const [history, setHistory] = useState(MOCK_HISTORY);

  const maxBarHeight = 120;

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Coverage Analysis</h1>
      <p className="text-xs text-[var(--muted)] mb-6">Track how much of your audit evidence is automated. Each gap is an evaluator opportunity.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold">{Math.round(summary.coverage_rate * 100)}%</div>
          <div className="text-xs text-[var(--muted)]">automated</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--success)]">{summary.covered_by_checks}</div>
          <div className="text-xs text-[var(--muted)]">by checks</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--warning)]">{summary.gaps}</div>
          <div className="text-xs text-[var(--muted)]">gaps</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--muted)]">{summary.skipped}</div>
          <div className="text-xs text-[var(--muted)]">manual only</div>
        </div>
      </div>

      {/* Coverage trend */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium mb-4">Coverage Over Time</h2>
        <div className="flex items-end gap-4 h-32">
          {history.map((h, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className="text-xs text-[var(--foreground)] mb-1">{Math.round(h.rate * 100)}%</div>
              <div
                className="w-full bg-[var(--accent)] rounded-t"
                style={{ height: `${h.rate * maxBarHeight}px` }}
              />
              <div className="text-xs text-[var(--muted)] mt-2">{h.date}</div>
            </div>
          ))}
          {/* Projection */}
          <div className="flex flex-col items-center flex-1 opacity-50">
            <div className="text-xs text-[var(--muted)] mb-1">~40%</div>
            <div
              className="w-full bg-[var(--accent)] rounded-t border border-dashed border-[var(--accent)]"
              style={{ height: `${0.4 * maxBarHeight}px`, background: 'transparent' }}
            />
            <div className="text-xs text-[var(--muted)] mt-2">Jul?</div>
          </div>
        </div>
      </div>

      {/* Top gaps */}
      <div className="card">
        <h2 className="text-sm font-medium mb-4">Top Gaps — Evaluator Opportunities</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          These fell back to EXHIBIT collectors most often. Building a check for each one permanently reduces cost.
        </p>
        <div className="space-y-3">
          {gaps.map((gap, i) => (
            <div key={i} className="p-3 rounded bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-sm text-[var(--foreground)]">{gap.question}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {gap.category} — {gap.systems.join(', ')}
                  </div>
                </div>
                {gap.frequency && (
                  <span className="text-xs px-2 py-1 rounded bg-[var(--warning)]/10 text-[var(--warning)] ml-2 whitespace-nowrap">
                    ×{gap.frequency} runs
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-[var(--muted)]">
                  EXHIBIT did: {gap.evidence_method}
                </span>
                {gap.suggested_check && (
                  <button className="text-xs px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10">
                    Create Check →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
