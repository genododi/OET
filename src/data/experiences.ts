import type { ExamExperience } from '../types';

export const examExperiences: ExamExperience[] = [
  {
    id: 'exp-1',
    author: 'Sarah M.',
    profession: 'Nursing',
    examDate: 'March 2025',
    score: 'B in all sub-tests',
    source: 'Telegram — OET Nurses UK',
    telegramGroup: '@OETNursesUK',
    summary:
      'Computer-based at London venue. Writing was a discharge letter for a COPD patient. Speaking had medication side-effects and a worried family member scenario.',
    highlights: [
      'Listening Part C was faster than practice tests — stay focused through the last extract.',
      'Reading Part A had a tricky matching set on infection control policies.',
      'Speaking interlocutor was friendly; warm-up questions were about my nursing background.',
    ],
    subtests: {
      listening: 'Part B had ward handover about a post-op patient. Part A notes on diabetes review.',
      writing: 'Discharge to GP — included oxygen therapy and smoking cessation referral.',
      speaking: 'Role-play 1: explain warfarin diet. Role-play 2: address fall risk at home.',
    },
  },
  {
    id: 'exp-2',
    author: 'Dr. Raj P.',
    profession: 'Medicine',
    examDate: 'January 2025',
    score: 'A in Reading & Listening, B in Writing & Speaking',
    source: 'Telegram — OET Doctors Hub',
    telegramGroup: '@OETDoctorsHub',
    summary:
      'Paper-based in Mumbai. Writing referral to cardiologist for chest pain workup. Both speaking cards were empathetic communication tasks.',
    highlights: [
      'Bring a watch — room clock was hard to see from back rows.',
      'Writing: case notes had redundant social history — filtered to relevant cardiac risk factors.',
      'Used 3-minute speaking prep to outline bullet points on the card.',
    ],
    subtests: {
      reading: 'Part C included a clinical trial abstract — questions on methodology and conclusions.',
      writing: 'Referral letter — stressed urgency and recent ECG findings.',
      speaking: 'Breaking news of abnormal scan results; explaining lifestyle changes for NAFLD.',
    },
  },
  {
    id: 'exp-3',
    author: 'Elena K.',
    profession: 'Pharmacy',
    examDate: 'November 2024',
    score: 'B in all sub-tests (first attempt)',
    source: 'Telegram — OET Pharmacy Prep',
    telegramGroup: '@OETPharmacyPrep',
    summary:
      'Combined venue in Dubai. Writing was a letter to a GP about drug interaction concerns. Speaking focused on OTC advice and inhaler technique.',
    highlights: [
      'Pharmacy writing is often shorter — still hit 180–200 words with clear structure.',
      'Listening medical abbreviations matched official sample test difficulty.',
      'Group members said Part A reading was hardest — agreed, timed practice essential.',
    ],
    subtests: {
      listening: 'Part A on medication review; Part C lecture on antibiotic stewardship.',
      writing: 'Letter advising GP to review statin dose due to muscle pain report.',
    },
  },
  {
    id: 'exp-4',
    author: 'James T.',
    profession: 'Physiotherapy',
    examDate: 'September 2024',
    score: 'B in L/R/W, C+ in Speaking (retook Speaking)',
    source: 'Telegram — OET Allied Health',
    telegramGroup: '@OETAlliedHealth',
    summary:
      'Underestimated speaking interaction. Retake focused on asking checking questions and summarising patient concerns before advising exercises.',
    highlights: [
      'First attempt: spoke too technically about ROM and proprioception — patient role was confused.',
      'Retake strategy: plain language + "Can you show me where it hurts?"',
      'Writing was transfer letter to community physio — included home exercise program.',
    ],
    subtests: {
      speaking: 'Retake cards: post-TKR rehab expectations; managing chronic back pain at work.',
    },
  },
  {
    id: 'exp-5',
    author: 'Anonymous',
    profession: 'Nursing',
    examDate: 'June 2024',
    score: 'Grade B overall',
    source: 'Telegram — OET Experience Archive (shared PDF)',
    telegramGroup: '@OETExperienceArchive',
    summary:
      'Detailed write-up circulated in group as PDF. Emphasised pairing official OET materials with Telegram debriefs within 48 hours of sitting.',
    highlights: [
      'Same-week recall helps pattern recognition but prompts change — do not rely on memorisation.',
      'PDF included annotated model letter for their writing task.',
      'Recommended 6-week plan: 2 mocks + daily 45-min sub-test rotation.',
    ],
    subtests: {
      reading: 'Hospital policy on falls prevention — matching headings.',
      writing: 'Nursing handover letter to community nurse for wound care.',
    },
  },
  {
    id: 'exp-6',
    author: 'Priya N.',
    profession: 'Medicine',
    examDate: 'April 2025',
    score: 'B in all sub-tests (second attempt)',
    source: 'Telegram — OET Doctors Hub',
    telegramGroup: '@OETDoctorsHub',
    summary:
      'First attempt failed Writing (C+) due to letter addressed to wrong recipient. Second attempt: GP referral to gastroenterology for chronic abdominal pain.',
    highlights: [
      'Writing fix: always identify recipient from case notes header — "Re: referral to Dr Lee, gastroenterologist".',
      'Listening Part C was a podcast-style interview on diabetes prevention — casual tone but academic questions.',
      'Speaking: explaining colonoscopy prep to an anxious patient; discussing statin side effects with an elderly man.',
    ],
    subtests: {
      writing: 'Included relevant examination findings only — omitted unrelated travel history.',
      speaking: 'Used teach-back: "Can you tell me how you\'ll take the bowel prep?"',
    },
  },
  {
    id: 'exp-7',
    author: 'Michael O.',
    profession: 'Nursing',
    examDate: 'February 2025',
    score: 'A in Listening, B elsewhere',
    source: 'Telegram — OET Nurses UK',
    telegramGroup: '@OETNursesUK',
    summary:
      'OET on Computer at home for L/R/W; speaking at test centre next day. Writing discharge after CHF exacerbation admission.',
    highlights: [
      'Home CBT: stable internet and quiet room essential — proctor checks environment via webcam.',
      'Reading Part A on vaccination schedules — synonym matching was tricky.',
      'Recommend official OET computer familiarisation tutorial before booking at-home.',
    ],
    subtests: {
      listening: 'Part B included pharmacy technician asking about insulin storage.',
      reading: 'Part C on nurse staffing ratios — opinion vs fact questions.',
      writing: 'Discharge to GP with medication changes and community heart failure nurse referral.',
    },
  },
  {
    id: 'exp-8',
    author: 'Fatima A.',
    profession: 'Pharmacy',
    examDate: 'December 2024',
    score: 'B in all sub-tests',
    source: 'Telegram — OET Pharmacy Prep',
    telegramGroup: '@OETPharmacyPrep',
    summary:
      'Paper-based in Cairo. Writing to GP about warfarin–antibiotic interaction. Speaking: inhaler technique and generic substitution counselling.',
    highlights: [
      'Bring layers — exam hall AC was very cold and affected concentration.',
      'Pharmacy writing shorter but must still hit word count with clear action for GP.',
      'Group shared PDF of common pharmacy writing prompts — useful for structure not content.',
    ],
    subtests: {
      writing: 'Advised GP to monitor INR closely during antibiotic course.',
      speaking: 'Patient confused brand vs generic — practiced plain comparison tables beforehand.',
    },
  },
  {
    id: 'exp-9',
    author: 'David L.',
    profession: 'Dentistry',
    examDate: 'October 2024',
    score: 'B in L/R/S, C+ in Writing (retake scheduled)',
    source: 'Telegram — OET Dentistry Network',
    telegramGroup: '@OETDentistryNet',
    summary:
      'Referral to oral maxillofacial surgeon for impacted wisdom tooth. Writing retake needed — letter exceeded 200 words with redundant history.',
    highlights: [
      'Count words in practice — my letter was 240 words and lost conciseness marks.',
      'Speaking: explaining extraction risks to nervous teenager; post-root canal care instructions.',
      'Reading included dental radiography safety policy — know ALARA principle terminology.',
    ],
    subtests: {
      reading: 'Part B email from practice manager about appointment no-shows.',
      speaking: 'Parent accompanied teenager — addressed both appropriately.',
    },
  },
  {
    id: 'exp-10',
    author: 'Hana S.',
    profession: 'Radiography',
    examDate: 'August 2024',
    score: 'B in all sub-tests (first attempt)',
    source: 'Telegram — OET Allied Health',
    telegramGroup: '@OETAlliedHealth',
    summary:
      'Combined venue in Manila. Writing clarified incomplete imaging request. Speaking: explaining MRI procedure to claustrophobic patient.',
    highlights: [
      'Smaller profession pool — fewer shared experiences online, but official samples sufficient.',
      'Listening ward radiographer discussing contrast allergy with nurse.',
      'PDF experience pack from group helped with letter formatting examples.',
    ],
    subtests: {
      listening: 'Part C lecture on radiation dose reduction in paediatric imaging.',
      writing: 'Letter to requesting physician asking for clinical indication clarification.',
      speaking: 'Used step-by-step explanation and offered earplugs/music option for MRI anxiety.',
    },
  },
  {
    id: 'exp-11',
    author: 'Chris W.',
    profession: 'Medicine',
    examDate: 'July 2024',
    score: 'B overall',
    source: 'Telegram — OET Experience Archive',
    telegramGroup: '@OETExperienceArchive',
    summary:
      'Shared detailed same-day recap in group chat then uploaded PDF. Emphasised that Speaking interlocutor may interrupt with questions mid-role-play.',
    highlights: [
      'Interlocutor asked "What if the pain gets worse?" during chest pain counselling — treat as part of the role-play.',
      'Do not freeze when interrupted — it tests interaction skills.',
      'Writing referral for iron-deficiency anaemia workup — included recent blood results only.',
    ],
    subtests: {
      speaking: 'Two cards: lifestyle advice for gout; explaining need for colonoscopy after positive FIT.',
    },
  },
  {
    id: 'exp-12',
    author: 'Amira H.',
    profession: 'Nursing',
    examDate: 'May 2024',
    score: 'B in all sub-tests',
    source: 'Telegram — OET Nurses Global',
    telegramGroup: '@OETNursesGlobal',
    summary:
      'Large international group with daily recall posts. Used experiences for anxiety reduction, not prediction. CBT in Toronto.',
    highlights: [
      'Group has pinned official links — filter out unofficial "guaranteed questions" spam.',
      'Reading Part A on catheter care bundles — timing was tight.',
      'Speaking warm-up asked about shift patterns in home country — answered briefly and professionally.',
    ],
    subtests: {
      reading: 'Matching infection prevention policies across four short extracts.',
      writing: 'Transfer to residential aged care with mobility and cognition summary.',
      speaking: 'Diabetic foot care education; addressing family member\'s guilt about missed appointments.',
    },
  },
  {
    id: 'exp-12',
    author: 'Fatima A.',
    profession: 'Nursing',
    examDate: 'May 2025',
    score: 'B in all sub-tests',
    source: 'Telegram — OET Nurses UK',
    telegramGroup: '@OETNursesUK',
    summary:
      'OET@Home. Writing was a referral letter for a patient with diabetic foot ulcer to the wound care team. Reading had Part A on falls prevention policies.',
    highlights: [
      'Listening Part B extracts were about community pharmacy and ward handover — accents were Australian.',
      'Speaking interlocutor was patient and gave cues when I missed a bullet point.',
      'Used the highlighting tool extensively in Reading Part A.',
    ],
    subtests: {
      listening: 'Part A: GP consultation about hypertension medication adjustment.',
      reading: 'Part A: Four texts on falls risk assessment tools.',
      writing: 'Wound care referral — diabetic foot ulcer with neuropathy.',
      speaking: 'Explain insulin initiation; address concerns about weight gain.',
    },
  },
  {
    id: 'exp-13',
    author: 'Dr. Amara S.',
    profession: 'Medicine',
    examDate: 'April 2025',
    score: '350 in all sub-tests',
    source: 'Reddit — r/OET',
    summary:
      'Paper-based in Cairo. Writing was a cardiology referral for newly diagnosed heart failure. Speaking involved breaking bad news about a cancer diagnosis.',
    highlights: [
      'Case notes had lots of irrelevant social history — had to filter carefully.',
      'Speaking preparation time was crucial — I outlined main points on the card.',
      'Reading Part C was about antibiotic resistance in hospital settings.',
    ],
    subtests: {
      reading: 'Part C: Research article on antimicrobial stewardship outcomes.',
      writing: 'Cardiology referral — new onset heart failure with reduced ejection fraction.',
      speaking: 'Breaking bad news — incidental lung nodule found on CT; smoking cessation advice.',
    },
  },
  {
    id: 'exp-14',
    author: 'Priya K.',
    profession: 'Pharmacy',
    examDate: 'March 2025',
    score: 'A in Reading, B in others',
    source: 'Telegram — OET Pharmacy Prep',
    telegramGroup: '@OETPharmacyPrep',
    summary:
      'Computer-based in Dubai. Writing was a drug interaction letter to a GP about warfarin and antibiotics. Speaking was about inhaler counselling.',
    highlights: [
      'Listening Part C was a public health lecture on vaccination hesitancy.',
      'Writing case notes had both relevant and irrelevant medications — chose wisely.',
      'Speaking: interlocutor asked about cost of generic vs brand medicines.',
    ],
    subtests: {
      listening: 'Part A: Pharmacist—patient consultation about new diabetes medication.',
      reading: 'Part B: Medicines management policy and dispensing SOPs.',
      writing: 'Warfarin—antibiotic interaction alert letter to GP.',
      speaking: 'Inhaler technique counselling; explaining generic vs brand medicines.',
    },
  },
  {
    id: 'exp-15',
    author: 'James O.',
    profession: 'Physiotherapy',
    examDate: 'February 2025',
    score: 'B in all sub-tests',
    source: 'Telegram — OET Allied Health',
    telegramGroup: '@OETAlliedHealth',
    summary:
      'OET@Home experience. Writing was a transfer letter for a post-stroke patient to community physiotherapy. Speaking was about post-TKR rehabilitation.',
    highlights: [
      'Writing: transfer letter needed clear functional status summary and equipment needs.',
      'Speaking: patient was anxious about returning to work — addressed graded return.',
      'Reading Part A was about exercise prescription guidelines in primary care.',
    ],
    subtests: {
      reading: 'Part A: Exercise guidelines for older adults and falls prevention.',
      writing: 'Post-stroke transfer to community physiotherapy service.',
      speaking: 'Post-TKR rehabilitation expectations; pain management strategies.',
    },
  },
  {
    id: 'exp-16',
    author: 'Dr. Hassan M.',
    profession: 'Medicine',
    examDate: 'January 2025',
    score: 'A in Listening, B in rest',
    source: 'Telegram — OET Doctors Hub',
    telegramGroup: '@OETDoctorsHub',
    summary:
      'Paper-based in Amman. Writing was a gastroenterology referral for upper GI bleed. Speaking role-play on explaining colonoscopy preparation.',
    highlights: [
      'Listening Part A had a consultation about COPD — spirometry values were tested.',
      'Part C was a lecture on healthcare-associated infections.',
      'Writing: urgent referral — had to convey urgency without using informal language.',
    ],
    subtests: {
      listening: 'Part A: Respiratory clinic consultation — COPD exacerbation assessment.',
      reading: 'Part C: Research on hospital infection control interventions.',
      writing: 'Gastroenterology urgent referral — haematemesis and melaena.',
      speaking: 'Colonoscopy prep explanation; managing patient anxiety about the procedure.',
    },
  },
  {
    id: 'exp-17',
    author: 'Maria L.',
    profession: 'Nursing',
    examDate: 'December 2024',
    score: 'B in all sub-tests',
    source: 'Reddit — r/OET',
    summary:
      'Computer-based in Manchester. Writing was a discharge letter for a patient with pneumonia. Reading had Part A on catheter care bundles.',
    highlights: [
      'Listening accents were a mix of British and Australian — Part A was the hardest.',
      'Writing: COPD discharge with oxygen therapy instructions.',
      'Speaking: patient was hard of hearing — had to speak clearly and face the camera.',
    ],
    subtests: {
      listening: 'Part B: Handover between nurses about post-operative patient.',
      reading: 'Part A: Catheter insertion and maintenance care bundles.',
      writing: 'Discharge to GP — community-acquired pneumonia with CURB-65 2.',
      speaking: 'Wound care education; addressing medication adherence concerns.',
    },
  },
  {
    id: 'exp-18',
    author: 'Dr. Wei Z.',
    profession: 'Medicine',
    examDate: 'November 2024',
    score: '350 overall',
    source: 'Telegram — OET Doctors Hub',
    telegramGroup: '@OETDoctorsHub',
    summary:
      'Computer-based in Sydney. Writing was a rheumatology referral for suspected rheumatoid arthritis. Reading included Part B on consent forms.',
    highlights: [
      'Part C reading was about artificial intelligence in diagnostic imaging.',
      'Speaking: breaking news of abnormal blood test results.',
      'Time management in Reading Part A was tight — finished with 2 minutes to spare.',
    ],
    subtests: {
      listening: 'Part A: GP consultation — joint pain and morning stiffness history.',
      reading: 'Part C: AI applications in radiology — benefits and limitations.',
      writing: 'Rheumatology referral — new-onset rheumatoid arthritis with positive anti-CCP.',
      speaking: 'Explaining abnormal LFT results; discussing alcohol reduction.',
    },
  },
  {
    id: 'exp-19',
    author: 'Aisha B.',
    profession: 'Dentistry',
    examDate: 'October 2024',
    score: 'B in all sub-tests',
    source: 'Telegram — OET Dentistry Prep',
    summary:
      'OET@Home. Writing was a referral for a patient with impacted wisdom teeth to oral surgeon. Speaking was about explaining a root canal procedure.',
    highlights: [
      'Writing: referral needed radiographic findings and medical history relevant to surgery.',
      'Speaking: patient was anxious about pain — used reassurance and step-by-step explanation.',
      'Reading Part A was about dental radiography safety guidelines.',
    ],
    subtests: {
      reading: 'Part A: Dental radiography protocols and radiation safety.',
      writing: 'Oral surgery referral — impacted lower third molar with pericoronitis.',
      speaking: 'Root canal treatment explanation; addressing dental anxiety.',
    },
  },
];
