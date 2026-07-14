import type { UsmleDiscipline } from '../types/usmle';

export interface UsmleDisciplineMeta {
  id: UsmleDiscipline;
  label: string;
  shortLabel: string;
  color: string;
}

export const usmleDisciplines: UsmleDisciplineMeta[] = [
  { id: 'anatomy', label: 'Anatomy', shortLabel: 'Anat', color: '#f43f5e' },
  { id: 'biochemistry', label: 'Biochemistry', shortLabel: 'Bioch', color: '#8b5cf6' },
  { id: 'microbiology', label: 'Microbiology', shortLabel: 'Micro', color: '#06b6d4' },
  { id: 'pathology', label: 'Pathology', shortLabel: 'Path', color: '#f59e0b' },
  { id: 'pharmacology', label: 'Pharmacology', shortLabel: 'Pharm', color: '#10b981' },
  { id: 'physiology', label: 'Physiology', shortLabel: 'Phys', color: '#3b82f6' },
  { id: 'immunology', label: 'Immunology', shortLabel: 'Immun', color: '#ec4899' },
  { id: 'behavioral', label: 'Behavioral Science', shortLabel: 'Behav', color: '#a855f7' },
  { id: 'biostatistics', label: 'Biostatistics', shortLabel: 'Stats', color: '#14b8a6' },
  { id: 'cardiology', label: 'Cardiology', shortLabel: 'Cardio', color: '#ef4444' },
  { id: 'neurology', label: 'Neurology', shortLabel: 'Neuro', color: '#6366f1' },
  { id: 'pulmonology', label: 'Pulmonology', shortLabel: 'Pulm', color: '#0ea5e9' },
  { id: 'nephrology', label: 'Nephrology', shortLabel: 'Neph', color: '#84cc16' },
  { id: 'gastroenterology', label: 'Gastroenterology', shortLabel: 'GI', color: '#eab308' },
  { id: 'endocrinology', label: 'Endocrinology', shortLabel: 'Endo', color: '#f97316' },
  { id: 'rheumatology', label: 'Rheumatology', shortLabel: 'Rheum', color: '#d946ef' },
  { id: 'hematology', label: 'Hematology', shortLabel: 'Heme', color: '#b91c1c' },
  { id: 'oncology', label: 'Oncology', shortLabel: 'Onc', color: '#7c2d12' },
  { id: 'reproductive', label: 'Reproductive', shortLabel: 'Reprod', color: '#f472b6' },
  { id: 'musculoskeletal', label: 'Musculoskeletal', shortLabel: 'MSK', color: '#92400e' },
  { id: 'dermatology', label: 'Dermatology', shortLabel: 'Derm', color: '#be123c' },
  { id: 'ophthalmology', label: 'Ophthalmology', shortLabel: 'Ophth', color: '#1d4ed8' },
  { id: 'ent', label: 'ENT', shortLabel: 'ENT', color: '#6d28d9' },
  { id: 'psychiatry', label: 'Psychiatry', shortLabel: 'Psych', color: '#c026d3' },
  { id: 'pediatrics', label: 'Pediatrics', shortLabel: 'Peds', color: '#0284c7' },
  { id: 'obgyn', label: 'Obstetrics & Gynecology', shortLabel: 'OB/GYN', color: '#db2777' },
  { id: 'surgery', label: 'Surgery', shortLabel: 'Surg', color: '#dc2626' },
  { id: 'emergency', label: 'Emergency Medicine', shortLabel: 'EM', color: '#ea580c' },
  { id: 'preventive', label: 'Preventive Medicine', shortLabel: 'Prev', color: '#15803d' },
  { id: 'infectious_disease', label: 'Infectious Disease', shortLabel: 'ID', color: '#0f766e' },
];

export const usmleDisciplineMap = new Map(usmleDisciplines.map((d) => [d.id, d]));
