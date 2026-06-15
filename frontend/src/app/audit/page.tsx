'use client';

import { useState } from 'react';

interface RoutingPreview {
  total: number;
  checks: number;
  retrievals: number;
  agent: number;
  items: { id: string; question: string; tier: string; systems: string[] }[];
}

interface CollectionProgress {
  current: number;
  total: number;
  status: 'idle' | 'running' | 'complete' | 'error';
  items: { id: string; question: string; status: string; method: string }[];
  run_id?: string;
}

const FRAMEWORKS = [
  { id: 'soc2', label: 'SOC 2', file: 'soc2_type2.csv' },
  { id: 'iso27001', label: 'ISO 27001', file: 'iso27001_2022.csv' },
  { id: 'nist', label: 'NIST CSF', file: 'nist_csf_2.csv' },
  { id: 'caiq', label: 'CAIQ v4', file: 'caiq_v4.csv' },
  { id: 'sig', label: 'SIG Lite', file: 'sig_lite.csv' },
  { id: 'nydfs', label: 'NYDFS 500', file: 'nydfs_500.csv' },
];

export default function AuditPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'running' | 'review'>('upload');
  const [engagement, setEngagement] = useState('');
  const [questionnaire, setQuestionnaire] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [preview, setPreview] = useState<RoutingPreview | null>(null);
  const [progress, setProgress] = useState<CollectionProgress>({ current: 0, total: 0, status: 'idle', items: [] });

  const handleFrameworkSelect = (fw: typeof FRAMEWORKS[0]) => {
    setSelectedFramework(fw.id);
    setQuestionnaire(`framework:${fw.file}`);
    if (!engagement) setEngagement(`${fw.label} Audit ${new Date().getFullYear()}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setQuestionnaire(reader.result as string);
      setSelectedFramework(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    // In production this would call the API — for now, simulate routing
    const lines = questionnaire.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const total = Math.max(lines.length - 1, 10); // rough count
    setPreview({
      total,
      checks: Math.floor(total * 0.25),
      retrievals: Math.floor(total * 0.55),
      agent: Math.floor(total * 0.20),
      items: [],
    });
    setStep('preview');
  };

  const handleRun = async () => {
    setStep('running');
    setProgress({ current: 0, total: preview?.total || 0, status: 'running', items: [] });

    // Simulate collection progress
    const total = preview?.total || 20;
    for (let i = 1; i <= total; i++) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(p => ({
        ...p,
        current: i,
        items: [...p.items, {
          id: `Q${i}`,
          question: `Evidence item ${i}`,
          status: 'complete',
          method: i <= (preview?.checks || 0) ? 'check' : i <= (preview?.checks || 0) + (preview?.retrievals || 0) ? 'retrieval' : 'agent',
        }],
      }));
    }
    setProgress(p => ({ ...p, status: 'complete', run_id: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14) }));
    setStep('review');
  };

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Audit Response</h1>
      <p className="text-xs text-[var(--muted)] mb-6">Upload a questionnaire, collect evidence, review, and send to your auditor.</p>

      {step === 'upload' && (
        <div className="space-y-6">
          {/* Engagement name */}
          <div className="card">
            <label className="text-xs text-[var(--muted)] block mb-2">Engagement Name</label>
            <input
              type="text"
              value={engagement}
              onChange={e => setEngagement(e.target.value)}
              placeholder="e.g. Baker Tilly Q2 2026"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Framework selection */}
          <div className="card">
            <label className="text-xs text-[var(--muted)] block mb-3">Choose a framework template</label>
            <div className="grid grid-cols-3 gap-2">
              {FRAMEWORKS.map(fw => (
                <button
                  key={fw.id}
                  onClick={() => handleFrameworkSelect(fw)}
                  className={`px-3 py-2 rounded text-xs border transition-colors ${
                    selectedFramework === fw.id
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>

          {/* Or upload */}
          <div className="card">
            <label className="text-xs text-[var(--muted)] block mb-3">Or upload your own questionnaire</label>
            <div className="border border-dashed border-[var(--border)] rounded-lg p-6 text-center">
              <input type="file" accept=".csv,.xlsx,.txt,.md" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                Drop a file here or <span className="text-[var(--accent)] underline">browse</span>
              </label>
              <p className="text-xs text-[var(--muted)] mt-2">CSV, Excel, or plain text (one question per line)</p>
            </div>
          </div>

          {/* Or paste */}
          <div className="card">
            <label className="text-xs text-[var(--muted)] block mb-2">Or paste questions directly</label>
            <textarea
              value={questionnaire.startsWith('framework:') ? '' : questionnaire}
              onChange={e => { setQuestionnaire(e.target.value); setSelectedFramework(null); }}
              placeholder="Provide evidence of MFA enforcement&#10;Provide your encryption policy&#10;Show access review results from Q1"
              rows={5}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)] resize-y"
            />
          </div>

          <button
            onClick={handlePreview}
            disabled={!questionnaire || !engagement}
            className="w-full py-2 rounded text-sm font-medium bg-[var(--accent)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Preview Collection Plan
          </button>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-medium mb-4">Collection Plan: {engagement}</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{preview.total}</div>
                <div className="text-xs text-[var(--muted)]">questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--success)]">{preview.checks}</div>
                <div className="text-xs text-[var(--muted)]">from checks (instant)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent)]">{preview.retrievals}</div>
                <div className="text-xs text-[var(--muted)]">retrievals (fast)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--warning)]">{preview.agent}</div>
                <div className="text-xs text-[var(--muted)]">agent (slower)</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span>Estimated cost:</span>
              <span className="text-[var(--foreground)]">${(preview.agent * 0.02).toFixed(2)}</span>
              <span>({preview.agent} LLM calls)</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="flex-1 py-2 rounded text-sm border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]">
              Back
            </button>
            <button onClick={handleRun} className="flex-1 py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90">
              Run Collection
            </button>
          </div>
        </div>
      )}

      {step === 'running' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Collecting: {engagement}</h2>
              <span className="text-xs text-[var(--muted)]">{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full h-2 bg-[var(--background)] rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-200"
                style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {progress.items.slice(-10).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={item.method === 'check' ? 'text-[var(--success)]' : item.method === 'retrieval' ? 'text-[var(--accent)]' : 'text-[var(--warning)]'}>
                    {item.method === 'check' ? '⚡' : item.method === 'retrieval' ? '📥' : '🤖'}
                  </span>
                  <span className="text-[var(--muted)]">{item.id}</span>
                  <span className="text-[var(--foreground)] truncate">{item.question}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium">Collection Complete</h2>
              <span className="text-xs px-2 py-1 rounded bg-[var(--success)]/10 text-[var(--success)]">
                {progress.total} items collected
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded bg-[var(--background)]">
                <div className="text-lg font-bold text-[var(--success)]">{preview?.checks}</div>
                <div className="text-xs text-[var(--muted)]">from checks</div>
              </div>
              <div className="text-center p-3 rounded bg-[var(--background)]">
                <div className="text-lg font-bold text-[var(--accent)]">{preview?.retrievals}</div>
                <div className="text-xs text-[var(--muted)]">retrieved</div>
              </div>
              <div className="text-center p-3 rounded bg-[var(--background)]">
                <div className="text-lg font-bold text-[var(--warning)]">{preview?.agent}</div>
                <div className="text-xs text-[var(--muted)]">agent-collected</div>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Run ID: {progress.run_id} — Evidence saved to workspace
            </p>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-2 rounded text-sm border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]">
              Download as ZIP
            </button>
            <button className="flex-1 py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90">
              Upload to Google Drive
            </button>
          </div>

          <button onClick={() => { setStep('upload'); setQuestionnaire(''); setSelectedFramework(null); }} className="w-full py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
            Start another collection
          </button>
        </div>
      )}
    </div>
  );
}
