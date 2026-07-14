import { useState } from 'react';

const LAB_CATEGORIES: { label: string; values: { name: string; range: string }[] }[] = [
  {
    label: 'Hematology',
    values: [
      { name: 'WBC', range: '4.5–11.0 × 10³/µL' },
      { name: 'RBC', range: '4.5–5.5 × 10⁶/µL (M) / 4.0–5.0 (F)' },
      { name: 'Hemoglobin', range: '13.5–17.5 g/dL (M) / 12.0–16.0 (F)' },
      { name: 'Hematocrit', range: '41–53% (M) / 36–46% (F)' },
      { name: 'MCV', range: '80–100 fL' },
      { name: 'Platelets', range: '150–450 × 10³/µL' },
      { name: 'Neutrophils', range: '40–80%' },
      { name: 'Lymphocytes', range: '20–40%' },
      { name: 'Eosinophils', range: '1–4%' },
      { name: 'PT', range: '11–13.5 sec' },
      { name: 'aPTT', range: '25–35 sec' },
      { name: 'INR', range: '0.9–1.2' },
    ],
  },
  {
    label: 'Chemistry',
    values: [
      { name: 'Sodium', range: '136–145 mEq/L' },
      { name: 'Potassium', range: '3.5–5.0 mEq/L' },
      { name: 'Chloride', range: '98–106 mEq/L' },
      { name: 'Bicarbonate', range: '24–30 mEq/L' },
      { name: 'BUN', range: '7–20 mg/dL' },
      { name: 'Creatinine', range: '0.6–1.2 mg/dL' },
      { name: 'Glucose (fasting)', range: '70–100 mg/dL' },
      { name: 'Calcium (total)', range: '8.5–10.5 mg/dL' },
      { name: 'Phosphorus', range: '2.5–4.5 mg/dL' },
      { name: 'Magnesium', range: '1.8–3.0 mg/dL' },
      { name: 'Albumin', range: '3.5–5.0 g/dL' },
      { name: 'Total protein', range: '6.0–8.0 g/dL' },
    ],
  },
  {
    label: 'Liver Function',
    values: [
      { name: 'ALT', range: '10–40 U/L' },
      { name: 'AST', range: '10–40 U/L' },
      { name: 'ALP', range: '44–147 U/L' },
      { name: 'GGT', range: '8–61 U/L' },
      { name: 'Total bilirubin', range: '0.3–1.0 mg/dL' },
      { name: 'Direct bilirubin', range: '0–0.3 mg/dL' },
      { name: 'LDH', range: '140–280 U/L' },
    ],
  },
  {
    label: 'Cardiac & Lipids',
    values: [
      { name: 'Troponin I', range: '< 0.04 ng/mL' },
      { name: 'CK-MB', range: '< 5% of total CK' },
      { name: 'BNP', range: '< 100 pg/mL' },
      { name: 'Total cholesterol', range: '< 200 mg/dL' },
      { name: 'LDL', range: '< 100 mg/dL' },
      { name: 'HDL', range: '> 40 mg/dL (M) / > 50 (F)' },
      { name: 'Triglycerides', range: '< 150 mg/dL' },
    ],
  },
  {
    label: 'Endocrinology',
    values: [
      { name: 'TSH', range: '0.4–4.0 mIU/L' },
      { name: 'Free T4', range: '0.8–1.8 ng/dL' },
      { name: 'Cortisol (AM)', range: '6–23 µg/dL' },
      { name: 'HbA1c', range: '< 5.7%' },
      { name: 'Ferritin', range: '20–300 ng/mL (M) / 15–150 (F)' },
      { name: 'Vitamin B12', range: '200–900 pg/mL' },
      { name: '25-OH vitamin D', range: '30–80 ng/mL' },
    ],
  },
  {
    label: 'ABG Interpretation',
    values: [
      { name: 'pH', range: '7.35–7.45' },
      { name: 'PaCO₂', range: '35–45 mmHg' },
      { name: 'PaO₂', range: '80–100 mmHg' },
      { name: 'HCO₃⁻', range: '22–26 mEq/L' },
      { name: 'O₂ saturation', range: '95–100%' },
      { name: 'Base excess', range: '−2 to +2' },
      { name: 'Anion gap', range: '8–12 mEq/L' },
    ],
  },
  {
    label: 'CSF Analysis',
    values: [
      { name: 'WBC', range: '0–5/mm³' },
      { name: 'Glucose', range: '40–80 mg/dL (50–80% of serum)' },
      { name: 'Protein', range: '15–45 mg/dL' },
      { name: 'Pressure (opening)', range: '7–18 cm H₂O' },
    ],
  },
  {
    label: 'Immunology / Serology',
    values: [
      { name: 'CRP', range: '< 1.0 mg/dL' },
      { name: 'ESR', range: '< 20 mm/hr (M) / < 30 (F)' },
      { name: 'Rheumatoid factor', range: '< 20 IU/mL' },
      { name: 'ANA', range: 'Negative (titer < 1:40)' },
      { name: 'Complement C3', range: '83–177 mg/dL' },
      { name: 'Complement C4', range: '12–36 mg/dL' },
    ],
  },
  {
    label: 'Urinalysis',
    values: [
      { name: 'Specific gravity', range: '1.005–1.030' },
      { name: 'pH', range: '4.5–8.0' },
      { name: 'Protein', range: '< 150 mg/day' },
      { name: 'Osmolality', range: '300–900 mOsm/kg' },
      { name: 'RBC', range: '0–3/HPF' },
      { name: 'WBC', range: '0–5/HPF' },
    ],
  },
];

export function LabValuesPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm usmle-lab-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide labs' : 'Lab values'}
      </button>

      {open && (
        <div className="card usmle-lab-panel">
          <h4>USMLE Laboratory Reference</h4>
          <p className="meta">Common reference ranges for Step 1, 2 CK, and Step 3</p>
          <div className="usmle-lab-categories">
            {LAB_CATEGORIES.map((cat) => (
              <details key={cat.label} className="usmle-lab-category">
                <summary>{cat.label}</summary>
                <table className="usmle-lab-table">
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.values.map((v) => (
                      <tr key={v.name}>
                        <td>{v.name}</td>
                        <td>{v.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
