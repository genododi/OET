import { useState } from 'react';

interface CalcResult {
  label: string;
  value: number;
  formula: string;
}

export function CalculatorPanel() {
  const [open, setOpen] = useState(false);
  const [tp, setTp] = useState('');
  const [fp, setFp] = useState('');
  const [fn, setFn] = useState('');
  const [tn, setTn] = useState('');
  const [results, setResults] = useState<CalcResult[]>([]);

  const runCalc = () => {
    const a = Number(tp);
    const b = Number(fp);
    const c = Number(fn);
    const d = Number(tn);
    if (!a && !b && !c && !d) return;

    const sensitivity = a / (a + c);
    const specificity = d / (b + d);
    const ppv = a / (a + b);
    const npv = d / (c + d);
    const prevalence = (a + c) / (a + b + c + d);
    const accuracy = (a + d) / (a + b + c + d);
    const lrPos = sensitivity / (1 - specificity);
    const lrNeg = (1 - sensitivity) / specificity;

    setResults([
      { label: 'Sensitivity', value: sensitivity * 100, formula: `TP/(TP+FN) = ${a}/(${a}+${c})` },
      { label: 'Specificity', value: specificity * 100, formula: `TN/(TN+FP) = ${d}/(${d}+${b})` },
      { label: 'PPV', value: ppv * 100, formula: `TP/(TP+FP) = ${a}/(${a}+${b})` },
      { label: 'NPV', value: npv * 100, formula: `TN/(TN+FN) = ${d}/(${d}+${c})` },
      { label: 'Prevalence', value: prevalence * 100, formula: `(TP+FN)/(Total) = ${a + c}/${a + b + c + d}` },
      { label: 'Accuracy', value: accuracy * 100, formula: `(TP+TN)/(Total) = ${a + d}/${a + b + c + d}` },
      { label: 'LR+', value: lrPos, formula: `Sens/(1-Spec) = ${(sensitivity * 100).toFixed(1)}/(1-${(specificity * 100).toFixed(1)})` },
      { label: 'LR−', value: lrNeg, formula: `(1-Sens)/Spec = (1-${(sensitivity * 100).toFixed(1)})/${(specificity * 100).toFixed(1)}` },
    ]);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm usmle-calc-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide calculator' : 'Calculator'}
      </button>

      {open && (
        <div className="card usmle-calc-panel">
          <h4>Biostatistics Calculator</h4>
          <p className="meta">Enter values from the 2×2 table</p>

          <div className="usmle-calc-grid">
            <label>
              True Positives
              <input type="number" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="0" />
            </label>
            <label>
              False Positives
              <input type="number" value={fp} onChange={(e) => setFp(e.target.value)} placeholder="0" />
            </label>
            <label>
              False Negatives
              <input type="number" value={fn} onChange={(e) => setFn(e.target.value)} placeholder="0" />
            </label>
            <label>
              True Negatives
              <input type="number" value={tn} onChange={(e) => setTn(e.target.value)} placeholder="0" />
            </label>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={runCalc}>
            Calculate
          </button>

          {results.length > 0 && (
            <table className="usmle-calc-results">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Value</th>
                  <th>Formula</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.label === 'LR+' || r.label === 'LR−' ? r.value.toFixed(2) : `${r.value.toFixed(1)}%`}</td>
                    <td className="meta">{r.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
