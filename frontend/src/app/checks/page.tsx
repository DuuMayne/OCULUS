'use client';

import { useState } from 'react';

interface CheckDefinition {
  key: string;
  name: string;
  connector: string;
  evaluator: string;
  config: Record<string, unknown>;
  enabled: boolean;
  last_status?: string;
  last_run?: string;
}

const CONNECTORS = [
  { id: 'okta', label: 'Okta', configured: true },
  { id: 'aws', label: 'AWS', configured: true },
  { id: 'github', label: 'GitHub', configured: true },
  { id: 'crowdstrike', label: 'CrowdStrike', configured: false },
  { id: 'cloudflare', label: 'Cloudflare', configured: false },
  { id: 'kandji', label: 'Kandji', configured: false },
];

const EVALUATORS = [
  { id: 'mfa_enforced', label: 'MFA Enforced', description: 'All active users must have MFA enrolled', connector: 'okta' },
  { id: 'branch_protection', label: 'Branch Protection', description: 'Critical repos have branch protection enabled', connector: 'github' },
  { id: 's3_encryption', label: 'S3 Encryption', description: 'All S3 buckets have encryption at rest', connector: 'aws' },
  { id: 'access_key_rotation', label: 'Key Rotation', description: 'No access keys older than threshold', connector: 'aws' },
  { id: 'cloudtrail_enabled', label: 'CloudTrail Active', description: 'Audit logging is active in all accounts', connector: 'aws' },
];

// Mock existing checks
const MOCK_CHECKS: CheckDefinition[] = [
  { key: 'mfa_enforced', name: 'MFA Enforced', connector: 'okta', evaluator: 'mfa_enforced', config: { exclude_users: ['service-bot@company.com'] }, enabled: true, last_status: 'pass', last_run: '2h ago' },
  { key: 'branch_protection', name: 'Branch Protection', connector: 'github', evaluator: 'branch_protection', config: { critical_repos: ['company/api', 'company/frontend'], min_required_reviews: 2 }, enabled: true, last_status: 'pass', last_run: '2h ago' },
  { key: 's3_encryption', name: 'S3 Encryption', connector: 'aws', evaluator: 's3_encryption', config: {}, enabled: true, last_status: 'pass', last_run: '2h ago' },
  { key: 'key_rotation', name: 'Key Rotation', connector: 'aws', evaluator: 'access_key_rotation', config: { max_key_age_days: 90 }, enabled: true, last_status: 'fail', last_run: '2h ago' },
  { key: 'cloudtrail', name: 'CloudTrail Active', connector: 'aws', evaluator: 'cloudtrail_enabled', config: {}, enabled: true, last_status: 'pass', last_run: '2h ago' },
];

export default function ChecksPage() {
  const [checks, setChecks] = useState<CheckDefinition[]>(MOCK_CHECKS);
  const [showBuilder, setShowBuilder] = useState(false);
  const [newCheck, setNewCheck] = useState({
    name: '',
    connector: '',
    evaluator: '',
    config: '{}',
  });
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = async () => {
    setTestResult('running');
    await new Promise(r => setTimeout(r, 1500));
    setTestResult('pass');
  };

  const handleSave = () => {
    const key = newCheck.name.toLowerCase().replace(/\s+/g, '_');
    setChecks([...checks, {
      key,
      name: newCheck.name,
      connector: newCheck.connector,
      evaluator: newCheck.evaluator,
      config: JSON.parse(newCheck.config || '{}'),
      enabled: true,
    }]);
    setShowBuilder(false);
    setNewCheck({ name: '', connector: '', evaluator: '', config: '{}' });
    setTestResult(null);
  };

  const filteredEvaluators = newCheck.connector
    ? EVALUATORS.filter(e => e.connector === newCheck.connector)
    : EVALUATORS;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold mb-1">Checks</h1>
          <p className="text-xs text-[var(--muted)]">Manage your deterministic security checks. Each check runs automatically and provides evidence.</p>
        </div>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="px-3 py-2 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90"
        >
          + New Check
        </button>
      </div>

      {/* Check builder */}
      {showBuilder && (
        <div className="card mb-6 border-[var(--accent)]">
          <h2 className="text-sm font-medium mb-4">Create New Check</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Name</label>
              <input
                type="text"
                value={newCheck.name}
                onChange={e => setNewCheck({ ...newCheck, name: e.target.value })}
                placeholder="e.g. Password Policy Compliance"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Data Source</label>
              <select
                value={newCheck.connector}
                onChange={e => setNewCheck({ ...newCheck, connector: e.target.value, evaluator: '' })}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select a system...</option>
                {CONNECTORS.map(c => (
                  <option key={c.id} value={c.id} disabled={!c.configured}>
                    {c.label} {!c.configured ? '(not connected)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-[var(--muted)] block mb-1">Check Type</label>
            <div className="grid grid-cols-2 gap-2">
              {filteredEvaluators.map(e => (
                <button
                  key={e.id}
                  onClick={() => setNewCheck({ ...newCheck, evaluator: e.id })}
                  className={`text-left px-3 py-2 rounded text-xs border transition-colors ${
                    newCheck.evaluator === e.id
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]'
                  }`}
                >
                  <div className="font-medium">{e.label}</div>
                  <div className="text-[var(--muted)] mt-0.5">{e.description}</div>
                </button>
              ))}
              <button
                onClick={() => setNewCheck({ ...newCheck, evaluator: 'custom' })}
                className={`text-left px-3 py-2 rounded text-xs border border-dashed transition-colors ${
                  newCheck.evaluator === 'custom'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]'
                }`}
              >
                <div className="font-medium">Custom</div>
                <div className="text-[var(--muted)] mt-0.5">Define new logic (requires code)</div>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-[var(--muted)] block mb-1">Configuration (JSON)</label>
            <textarea
              value={newCheck.config}
              onChange={e => setNewCheck({ ...newCheck, config: e.target.value })}
              placeholder='{"max_key_age_days": 90}'
              rows={3}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)] resize-y"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={!newCheck.connector || !newCheck.evaluator}
              className="px-4 py-2 rounded text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
            >
              {testResult === 'running' ? 'Testing...' : testResult === 'pass' ? '✓ Test Passed' : testResult === 'fail' ? '✗ Test Failed' : 'Test (dry run)'}
            </button>
            <button
              onClick={handleSave}
              disabled={!newCheck.name || !newCheck.connector || !newCheck.evaluator}
              className="px-4 py-2 rounded text-xs font-medium bg-[var(--accent)] text-white disabled:opacity-40 hover:opacity-90"
            >
              Save & Activate
            </button>
            <button
              onClick={() => { setShowBuilder(false); setTestResult(null); }}
              className="px-4 py-2 rounded text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing checks list */}
      <div className="space-y-2">
        {checks.map(check => (
          <div key={check.key} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                check.last_status === 'pass' ? 'bg-[var(--success)]' :
                check.last_status === 'fail' ? 'bg-[var(--danger)]' :
                'bg-[var(--muted)]'
              }`} />
              <div>
                <div className="text-sm font-medium">{check.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {check.connector} → {check.evaluator}
                  {check.last_run && ` · last run ${check.last_run}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {check.last_status && (
                <span className={`text-xs px-2 py-1 rounded ${
                  check.last_status === 'pass' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                  'bg-[var(--danger)]/10 text-[var(--danger)]'
                }`}>
                  {check.last_status}
                </span>
              )}
              <button className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
