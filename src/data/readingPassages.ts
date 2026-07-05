/**
 * OET-style reading passages (200–400 words) for Part A/B/C practice.
 * Passages rotate across sessions; multiple MCQs may share one passage.
 */

export interface ReadingPassage {
  id: string;
  title: string;
  text: string;
}

export const readingPassages: Record<string, ReadingPassage> = {
  'passage-infection-control': {
    id: 'passage-infection-control',
    title: 'Email — Updated infection control procedures',
    text: `From: Infection Prevention & Control Team
To: All ward nursing staff
Subject: Updated hand hygiene and PPE procedures — effective immediately

Dear colleagues,

Following a recent audit and updated national guidance, please note revised infection control procedures for all clinical areas.

Hand hygiene: Perform the five moments of hand hygiene using alcohol-based rub or soap and water when hands are visibly soiled. Before entering and after leaving any patient room, apply hand rub for at least 20 seconds, covering all surfaces of the hands.

Personal protective equipment (PPE): For patients with suspected or confirmed respiratory infection, wear a fluid-resistant surgical mask, eye protection, gloves, and an apron. Don PPE before entering the room; doff in the anteroom in the reverse order, avoiding contamination of clothing.

Isolation signage: Ensure appropriate door signage is displayed. Contact the IPC nurse on extension 4421 if you are unsure which precautions apply.

These updates replace the March memo. All staff must complete the online module by Friday. Non-compliance will be documented and may affect revalidation portfolios.

Thank you for your cooperation in keeping patients and colleagues safe.

Infection Prevention & Control Team`,
  },
  'passage-trial-abstract': {
    id: 'passage-trial-abstract',
    title: 'Abstract — Nurse-led early discharge programme',
    text: `Background: Prolonged hospital stays increase risk of deconditioning and healthcare-associated infection. Nurse-led early discharge programmes may shorten length of stay without compromising safety.

Methods: We conducted a single-centre prospective cohort study over 12 months. Two hundred patients admitted with uncomplicated community-acquired pneumonia were enrolled. The intervention group (n=98) received a structured nurse-led discharge checklist including medication reconciliation, home oxygen assessment, and a 48-hour telephone follow-up. The usual-care group (n=102) followed standard medical discharge planning.

Results: Median length of stay was 4.2 days in the intervention group versus 5.8 days in usual care (p=0.03). Readmission within 30 days did not differ significantly between groups (8% vs 11%, p=0.41). Patient satisfaction scores were higher in the intervention arm.

Limitations: The sample was drawn from one metropolitan hospital and may not generalise to rural settings. Selection bias cannot be excluded as enrolment depended on ward staffing on admission days. A multicentre randomised trial is warranted.

Conclusion: A nurse-led discharge pathway may reduce length of stay safely, but larger trials are needed before widespread adoption.`,
  },
  'passage-falls-audit': {
    id: 'passage-falls-audit',
    title: 'Extract — Falls prevention audit report',
    text: `Annual Falls Prevention Audit — Medical Ward 3B

Objective: To assess compliance with the hospital falls prevention bundle during Q3.

Methodology: Auditors reviewed 40 patient charts and conducted bedside observations over two weeks. Items assessed included: falls risk assessment completed within 24 hours of admission, yellow wristband applied when score ≥3, call bell within reach, bed at lowest height with brakes on, and non-slip footwear offered.

Findings: Risk assessment documentation was complete in 85% of cases. Wristband use was inconsistent — only 62% of high-risk patients wore the identifier. Environmental checks were satisfactory in 78% of observations. Staff reported that wristband stockouts on weekends contributed to gaps.

Recommendations: Ward managers should monitor compliance with safety protocols weekly. Pharmacy stores must maintain adequate wristband supply. Nursing staff are reminded that hourly rounding includes repositioning, toileting assistance, and ensuring mobility aids are within reach.

Monitoring compliance with safety protocols remains a priority until the next audit cycle in March.`,
  },
  'passage-ward-memo': {
    id: 'passage-ward-memo',
    title: 'Internal memo — Ward 4B staffing and handover',
    text: `MEMORANDUM

To: Ward nursing staff — Medical Unit 4B
From: Nurse Unit Manager, Sarah Okonkwo
Date: 14 October
Re: Handover standards and weekend skill mix

This memo clarifies expectations for nursing staff on 4B following recent incident reviews.

Handover must occur at the bedside whenever the patient is awake and agreeable, using ISBAR structure. Off-duty nurses must not leave until handover is signed in the electronic record. Break cover must be arranged before personal leave is taken.

Weekend skill mix: At least one RN with IV certification and one EN with competency in observations must be on duty per shift. Agency staff must complete local orientation before being allocated patients independently.

Patient and visitor enquiries about parking, cafeteria hours, or chaplaincy services should be directed to the main reception — not answered from the nurses' station during medication rounds.

These standards apply to all registered and enrolled nurses rostered to 4B. Please discuss any barriers at the next team meeting.

Sarah Okonkwo, NUM`,
  },
  'passage-pharmacy-sop': {
    id: 'passage-pharmacy-sop',
    title: 'Part A texts — Medication storage excerpts',
    text: `Text A — Staff roster bulletin
Next week's roster is published on the intranet. Swaps require NUM approval 48 hours in advance.

Text B — Catering menu (Week 42)
Monday: grilled chicken; Tuesday: vegetable lasagne. Allergy lists updated monthly.

Text C — Pharmacy SOP excerpt: Cold-chain medicines
Insulin, GLP-1 agonists, and certain biologics must be stored at 2–8°C in a dedicated medicines refrigerator. Temperature logs are checked twice daily. Medicines must not be stored in ward food fridges. Upon opening, insulin may be kept at room temperature below 25°C for up to 28 days per manufacturer guidance. Out-of-range readings require immediate quarantine and notification of the ward pharmacist.

Text D — Fire evacuation plan
Assembly point: car park B. Do not use lifts during activation.`,
  },
  'passage-staffing-policy': {
    id: 'passage-staffing-policy',
    title: 'Policy commentary — Safe nurse staffing',
    text: `Safe Staffing Policy — Commentary by the Director of Nursing

Our organisation has adopted minimum nurse-to-patient ratios on acute medical wards following consultation with union representatives and clinical leads. On day shifts, the target is one registered nurse to four medical patients; on night shifts, one to five, with a supernumerary coordinator on each unit.

Evidence from international observational studies suggests that understaffing correlates with missed care, delayed medication administration, and increased patient falls. While causation is debated, the board accepts that staffing shortages may affect continuity of patient care and staff wellbeing.

Implementation will be phased over two years. Budget constraints mean not every ward will achieve targets immediately; interim agency spend is capped. Managers must submit monthly variance reports.

Critics argue that ratios alone do not account for patient acuity. We acknowledge this limitation and are piloting an acuity tool on two surgical wards. If successful, the tool should be rolled out hospital-wide within 24 months — in my view, policy should be revised within two years to integrate acuity weighting rather than relying on bed numbers alone.

Questions: contact Nursing Workforce Planning.`,
  },
  'passage-vaccination-schedule': {
    id: 'passage-vaccination-schedule',
    title: 'Public health bulletin — Immunisation updates',
    text: `Regional Public Health Unit — Seasonal immunisation bulletin

Healthcare workers are reminded to maintain immunity against vaccine-preventable diseases. The employee health service offers free influenza vaccination from April to June each year.

Childhood schedule changes: From 1 July, the national immunisation timetable includes a two-dose meningococcal B course at 2 and 4 months, followed by booster at 12 months. Parent information leaflets are available in ten languages.

Catch-up clinics: Patients who missed appointments during the pandemic may attend walk-in sessions on Wednesday afternoons. Bring the previous vaccination schedule or child health record.

Reporting: Adverse events should be documented in the clinical record and reported via the online portal within 72 hours.

Synonym note for overseas-trained staff: "immunisation timetable" and "vaccination schedule" refer to the same national document published by the department of health.`,
  },
  'passage-consent-form': {
    id: 'passage-consent-form',
    title: 'Patient information — Surgical consent',
    text: `Informed Consent for Surgery — Patient Information Sheet

Purpose: This document explains your rights and the process for informed consent before an elective operation.

Your rights: You have the right to receive clear information about your diagnosis, the proposed procedure, alternative options (including no treatment), and material risks. You may ask questions at any time and may withdraw consent until the moment sedation is given.

The process: Your surgeon will explain the operation in language you understand. An interpreter will be provided if needed. You should confirm you understand before signing the consent form. For major procedures, a cooling-off period of at least 24 hours is recommended unless urgent.

Specific risks for laparoscopic cholecystectomy include bleeding, infection, bile leak, and injury to surrounding structures. General anaesthesia carries separate risks that the anaesthetist will discuss.

Documentation: Signed consent must be in the chart before transfer to theatre. Witness signature required.

Contact the patient liaison officer on 1800 000 000 if you need further clarification.`,
  },
  'passage-clinical-commentary': {
    id: 'passage-clinical-commentary',
    title: 'Journal editorial — Telehealth in chronic disease',
    text: `Editorial: Telehealth after the pandemic

Randomised trials demonstrate that structured telemonitoring can reduce hospital admissions among selected heart failure patients. A recent 12-month trial enrolled 200 participants across three sites; home blood pressure uploads were reviewed weekly by a nurse practitioner.

Fact: Video consultations are reimbursed under the current Medicare schedule for eligible rural postcodes.

Fact: The trial ran for 12 months with ethics approval from the university human research committee.

Opinion: In my view, policy should be revised within two years to fund hybrid models nationally, not only as a rural stopgap. Urban patients with mobility limitations benefit equally and should not be excluded by postcode rules.

Opinion: Complete replacement of in-person review would be clinically unwise for unstable diabetics requiring foot examination.

The evidence supports blended care: periodic face-to-face assessment combined with telehealth for stable intervals.`,
  },
  'passage-catheter-bundle': {
    id: 'passage-catheter-bundle',
    title: 'Protocol excerpt — Urinary catheter care bundle',
    text: `Urinary Catheter Insertion and Maintenance Protocol

Indication: Insertion only when clinically necessary. Consider alternatives such as intermittent catheterisation or condom drainage.

Insertion: Perform using aseptic technique checklist: hand hygiene, sterile field, chlorhexidine preparation, appropriate catheter size, and secure fixation after balloon inflation. Document insertion date, reason, and prescriber.

Maintenance: Closed drainage system must remain intact. Bag below bladder level at all times. Perform meatal care daily with soap and water — routine antiseptic instillation is not recommended.

Review: Daily prompt on ward round — does this patient still need the catheter? Remove when no longer indicated to reduce catheter-associated urinary tract infection.

Competency: Only staff with documented training may insert catheters independently. Fire evacuation plan and payroll policies are unrelated documents maintained by separate departments.`,
  },
  'passage-stroke-pathway': {
    id: 'passage-stroke-pathway',
    title: 'Clinical pathway — Acute stroke management',
    text: `Acute Stroke Pathway (Emergency Department to Stroke Unit)

Purpose: To standardise time-critical stroke management and improve door-to-needle times for eligible thrombolysis candidates.

Time targets: CT brain within 20 minutes of arrival; stroke team review within 15 minutes of imaging; thrombolysis decision within 60 minutes of symptom onset when indicated.

Initial actions: Assess ABC, blood glucose, and NIHSS score. Nil by mouth until swallow screen completed. Activate stroke team via bleep 2222.

Exclusions for thrombolysis follow national criteria including recent surgery, active bleeding, and uncontrolled hypertension. Transfer to stroke unit within 4 hours when bed available.

Documentation: All time stamps must be entered in the electronic record. Variances require incident report.

This pathway does not replace individual clinical judgment or GP referral processes for transient symptoms assessed in the community.`,
  },
  'passage-mental-health-policy': {
    id: 'passage-mental-health-policy',
    title: 'Policy summary — Community mental health early intervention',
    text: `Community Mental Health — Early Intervention Framework

Rationale: Evidence indicates that early intervention for first-episode psychosis and severe mood disorders reduces crisis admissions and improves functional recovery. The writer's main concern is that delayed access to community teams forces patients into emergency departments unnecessarily.

Scope: Adults aged 18–65 registered with a GP in the catchment. Self-referral and GP referral accepted. Triage within 5 working days.

Core components: Comprehensive assessment, care coordination, family psychoeducation, and vocational support. Inpatient beds reserved for acute risk or treatment-resistant cases — the policy does not aim to eliminate all community services.

Performance indicators: Reduction in 28-day readmission rates; increased proportion of patients engaged at 12 months.

Funding: Block contract with quarterly review. Staffing shortages in rural hubs remain a challenge; telepsychiatry slots are offered twice weekly.

For urgent risk, contact the crisis line 24/7. Non-urgent admin enquiries to the service manager.`,
  },
  'passage-sepsis-bundle': {
    id: 'passage-sepsis-bundle',
    title: 'Part A texts — Sepsis Six excerpts',
    text: `Text A — Staff parking policy
Permits must be displayed by 07:00. Overflow parking is signposted on Level 2.

Text B — Acute care bundle: Sepsis Six
Within one hour of sepsis recognition: (1) Administer high-flow oxygen if saturations below target; (2) Take blood cultures before antibiotics; (3) Give IV antibiotics per local formulary; (4) Begin fluid resuscitation — initial bolus 500 ml crystalloid unless contraindicated, reassess for further fluids using dynamic markers; (5) Measure lactate; (6) Monitor urine output hourly. Fluid resuscitation targets and escalation criteria are detailed in appendix C.

Text C — Catering allergen update
Gluten-free options available at lunch only.

Text D — Payroll timesheet guide
Submit fortnightly timesheets by Monday 09:00.`,
  },
  'passage-alara-radiation': {
    id: 'passage-alara-radiation',
    title: 'Radiology department policy — ALARA principle',
    text: `Diagnostic Imaging — Radiation Protection Policy

Primary purpose: To minimise radiation exposure as low as reasonably achievable (ALARA) for patients and staff while maintaining diagnostic image quality.

Justification: Every imaging request must be justified by a qualified practitioner. Repeat studies require documented clinical reason.

Optimisation: Use paediatric protocols for children. Collimate to area of interest. Pregnant patients require special consent and shielding when appropriate.

Staff protection: Wear dosimeters in fluoroscopy suites. Pregnant staff may request alternative duties.

This policy does not exist to increase imaging volume for revenue generation. Training requirements for radiographers remain mandatory under national registration standards.

Queries: Radiation Safety Officer, extension 5510.`,
  },
  'passage-diabetes-foot': {
    id: 'passage-diabetes-foot',
    title: 'Protocol — Diabetes foot screening',
    text: `Annual Diabetes Foot Screening Protocol — Primary Care

Eligibility: All patients with type 1 or type 2 diabetes at least once per year.

Assessment includes: Visual inspection for ulceration, callus, deformity; pulse check; and monofilament testing at standard plantar sites to detect loss of protective sensation.

Risk stratification: Low risk — annual review in general practice. High risk — referral to multidisciplinary foot clinic within 2 weeks. Emergency same-day referral for active ulceration or infection.

Patient education: Daily foot inspection at home, appropriate footwear, and prompt reporting of breaks in skin.

Documentation: Enter results in the national diabetes register. Fire drill instructions and payroll guides are unrelated administrative documents.`,
  },
  'passage-no-show-email': {
    id: 'passage-no-show-email',
    title: 'Email — Outpatient appointment policy',
    text: `From: Clinic Manager, Dr Helen Marsh
To: All outpatient staff and patients (waiting room poster version)
Subject: Reducing missed appointments

Dear colleagues and patients,

Our clinic experienced a 22% did-not-attend rate last quarter, delaying care for others on the waiting list.

From 1 November:
• SMS reminders will be sent 72 hours and 24 hours before appointments.
• Patients who miss two appointments within six months without cancellation may be charged a $40 administrative fee, in line with hospital board policy.
• A dedicated cancellation line operates 8am–6pm weekdays.

The manager proposes to charge a fee for repeated missed appointments — not for single cancellations with notice. The outpatient clinic is not closing; walk-in fracture review remains available mornings only.

Staff should document contact attempts in the record. Financial hardship exemptions apply on application.

Thank you for supporting equitable access.

Clinic Management`,
  },
  'passage-nurse-staffing-abstract': {
    id: 'passage-nurse-staffing-abstract',
    title: 'Abstract — Nurse staffing and patient safety',
    text: `Objective: To examine whether higher registered nurse staffing on medical wards is associated with patient safety outcomes.

Design: Retrospective analysis of administrative data from 15 hospitals over three years.

Participants: 120,000 medical admissions; staffing levels calculated as RN hours per patient day.

Outcomes: In-hospital falls, medication errors, and 30-day mortality.

Results: Wards in the highest staffing quartile had 14% fewer falls (95% CI 8–19%) and 9% fewer medication errors compared with the lowest quartile. Mortality differences did not reach statistical significance after adjustment.

Authors conclude higher nurse-to-patient ratios may improve patient safety outcomes, particularly for process measures sensitive to nursing surveillance. Limitations include inability to control for unmeasured acuity and single-country data.

Implication: Policy makers should consider staffing floors alongside acuity tools.`,
  },
  'passage-anticoagulation-sop': {
    id: 'passage-anticoagulation-sop',
    title: 'Part A texts — Anticoagulation clinic excerpts',
    text: `Text A — Visitor parking map
Disabled bays are located near the main entrance. After-hours access via intercom.

Text B — Menu planning committee
Vegetarian options increased by 10% this quarter.

Text C — Anticoagulation clinic SOP
Direct oral anticoagulants (DOACs) require renal dose adjustment per eGFR thresholds. Apixaban and rivaroxaban doses must be reduced when eGFR falls below specified cut-offs; dabigatran is contraindicated below 30 ml/min. Check renal function at least annually and after intercurrent illness. Warfarin remains preferred when mechanical valves present. Patient counselling includes bleeding precautions and interaction with NSAIDs.

Text D — Uniform standards
Closed-toe shoes mandatory in clinical areas.`,
  },
  'passage-mental-health-act': {
    id: 'passage-mental-health-act',
    title: 'Summary sheet — Mental Health Act detention',
    text: `Mental Health Act — Patient and Staff Summary (Section overview)

This section primarily explains criteria for detention and patient rights during involuntary treatment.

Criteria: A person may be detained for assessment or treatment if they have a mental disorder, require care for health or safety, and detention is necessary. An approved mental health professional and two medical recommendations are required except in emergency holding powers.

Patient rights: Right to appeal to the tribunal; right to an independent advocate; right to information about treatment and leave arrangements. Detention must be reviewed at statutory intervals.

Community treatment orders: May allow supervised treatment in the community with recall provisions if conditions are breached.

This summary does not cover hospital meal ordering or staff uniform requirements, which are governed by separate policies.

Legal advice hotline available to clinicians 24/7.`,
  },
  'passage-clinical-trial-methods': {
    id: 'passage-clinical-trial-methods',
    title: 'Methods section — RCT of post-op physiotherapy',
    text: `Methods

We performed a multicentre randomised controlled trial comparing early mobilisation with standard care after elective total knee replacement.

Randomisation: Participants were randomised 1:1 using a computer-generated sequence stratified by site and BMI category. Allocation concealment was maintained via a central web system until consent and baseline assessment were complete. Randomisation was used to reduce selection bias between groups.

Blinding: Outcome assessors were blinded to group assignment; participants and treating physiotherapists could not be blinded due to intervention nature.

Sample size: Powered to detect a 10-point difference in KOOS score at 12 weeks; 180 participants recruited.

Ethics: Approved by lead institution HREC; registered on ANZCTR prior to first enrolment.

Exclusion: Emergency surgery, pre-existing neurological deficit, or inability to consent.

Statistical analysis followed intention-to-treat principles.`,
  },
  // ── New passages based on real OET topic patterns ──
  'passage-cellulitis': {
    id: 'passage-cellulitis',
    title: 'Cellulitis — Definition, Aetiology and Severity Classification',
    text: `Cellulitis is an acute bacterial infection of the dermis and subcutaneous tissue which presents with an acute onset of red, painful, hot, swollen, and tender skin, sometimes with blister formation. Fever and nausea may accompany or precede skin changes.

By far the commonest organisms that cause cellulitis are Streptococcus pyogenes and Staphylococcus aureus. Other, less common organisms include Aeromonas hydrophila (caused by exposure to fresh water), Pasteurella multocida and anaerobes (caused by mammalian bites), Vibrio vulnificus (caused by exposure to salt water), and Pseudomonas aeruginosa (caused by use of hot tubs).

The leg is the most commonly affected site, with unilateral presentation the norm. Bilateral leg cellulitis can occur but is extremely rare. Infection arises from an identifiable break in the skin from trauma or pre-existing skin conditions such as eczema or tinea pedis.

The Eron Classification system can help to guide admission and treatment decisions. Class I: no signs of systemic toxicity and no uncontrolled co-morbidities. Class II: systemically unwell or systemically well but with a co-morbidity that may complicate resolution. Class III: significant systemic upset such as acute confusion, tachycardia, hypotension, or a limb-threatening infection. Class IV: severe life-threatening infection such as necrotizing fasciitis.

Immediately hospitalise anyone with Class III or IV. Also hospitalise those who are immunocompromised, have facial cellulitis, are very young or elderly and frail, or whose cellulitis is rapidly deteriorating. Note that many other conditions, including deep vein thrombosis, share the same symptoms as cellulitis.`,
  },
  'passage-sepsis-six': {
    id: 'passage-sepsis-six',
    title: 'Sepsis Six Care Bundle — Emergency Department Protocol',
    text: `The Sepsis Six is a care bundle designed to be delivered within the first hour of recognising sepsis. It was developed by the UK Sepsis Trust to standardise initial management and reduce mortality from sepsis, which kills approximately 48,000 people annually in the UK alone.

The six elements are divided into three diagnostic and three therapeutic steps. Diagnostic steps: (1) administer high-flow oxygen to maintain oxygen saturations above 94%, (2) take blood cultures before antibiotics are given, and (3) measure serum lactate and full blood count. Therapeutic steps: (4) give intravenous antibiotics within one hour of recognition, (5) start intravenous fluid resuscitation with crystalloids if lactate is above 2 mmol/L or if the patient is hypotensive, and (6) monitor urine output hourly as a marker of end-organ perfusion.

Sepsis is defined as life-threatening organ dysfunction caused by a dysregulated host response to infection. The quick Sequential Organ Failure Assessment (qSOFA) score uses three bedside criteria: altered mental status, respiratory rate of 22 breaths per minute or greater, and systolic blood pressure of 100 mmHg or less. A qSOFA score of 2 or more indicates higher risk of poor outcomes.

Common sources of sepsis include pneumonia, urinary tract infection, abdominal infections, and skin or soft tissue infections. Elderly patients, immunocompromised individuals, and those with chronic diseases such as diabetes or renal failure are at highest risk. Early recognition and protocol-driven management remain the cornerstones of sepsis care.`,
  },
  'passage-diabetic-foot': {
    id: 'passage-diabetic-foot',
    title: 'Diabetic Foot Ulcer — Assessment and Management Guidelines',
    text: `Diabetic foot ulcers are a major complication of diabetes mellitus, affecting approximately 15% of patients with diabetes during their lifetime. They precede approximately 85% of all diabetes-related lower limb amputations, making early detection and management critical.

The pathophysiology involves a combination of peripheral neuropathy, peripheral arterial disease, and impaired immune function. Neuropathy leads to loss of protective sensation, allowing minor trauma to go unnoticed. Arterial disease reduces blood flow and impairs healing. Hyperglycaemia impairs neutrophil function, increasing infection risk.

Assessment should follow the SINBAD system: Site (proximal or distal), Ischaemia (present or absent), Neuropathy (present or absent), Bacterial infection (present or absent), Area (ulcer size in cm²), and Depth (tissue layer involved). A SINBAD score of 3 or more predicts poorer outcomes and need for multidisciplinary input.

Referral to a multidisciplinary foot team is indicated for any ulcer with ischaemia, deep infection involving bone, or systemic signs of infection. Offloading is the cornerstone of treatment — total contact casting is the gold standard for non-infected plantar ulcers. Debridement of non-viable tissue, infection control with targeted antibiotics, and revascularisation assessment are essential. Patient education on daily foot inspection, appropriate footwear, and blood glucose control reduces recurrence rates.`,
  },
  'passage-stroke-thrombolysis': {
    id: 'passage-stroke-thrombolysis',
    title: 'Acute Stroke Thrombolysis — Eligibility and Protocol',
    text: `Intravenous thrombolysis with alteplase remains the only licensed pharmacological treatment for acute ischaemic stroke. The window for treatment is within 4.5 hours of symptom onset, though earlier treatment yields better outcomes. Every 15-minute delay in treatment reduces the probability of a good outcome.

Eligibility criteria include: (1) clinical diagnosis of acute ischaemic stroke with measurable neurological deficit, (2) symptom onset within 4.5 hours of treatment initiation, (3) age 18 years or older, and (4) CT brain excluding intracranial haemorrhage. Relative contraindications include minor or rapidly improving symptoms, seizure at onset, recent major surgery or trauma, and blood pressure persistently above 185/110 mmHg despite treatment.

The protocol involves: confirm time last known well, perform non-contrast CT head, check blood glucose and platelet count, administer alteplase 0.9 mg/kg (maximum 90 mg) with 10% as bolus and remainder over 60 minutes. Monitor in a stroke or intensive care unit for 24 hours with frequent neurological observations and blood pressure management.

Post-thrombolysis, avoid antiplatelet or anticoagulant therapy for 24 hours until follow-up imaging excludes haemorrhagic transformation. Early rehabilitation and secondary prevention with antiplatelet therapy, statin, and blood pressure control should be initiated after the 24-hour window.`,
  },
  'passage-hand-hygiene': {
    id: 'passage-hand-hygiene',
    title: 'WHO Five Moments for Hand Hygiene in Healthcare',
    text: `The World Health Organization's Five Moments for Hand Hygiene define the key times when healthcare workers must perform hand hygiene to prevent healthcare-associated infections. These moments are: (1) before touching a patient, (2) before clean or aseptic procedures, (3) after body fluid exposure risk, (4) after touching a patient, and (5) after touching patient surroundings.

Hand hygiene should be performed using an alcohol-based hand rub for 20–30 seconds, covering all hand surfaces. Soap and water should be used when hands are visibly soiled, after caring for patients with known or suspected Clostridium difficile infection, and after norovirus outbreaks.

Compliance with hand hygiene guidelines remains suboptimal globally, with average rates of approximately 40% in intensive care units and 60% in general wards. Multimodal improvement strategies have been shown to improve compliance: system change (availability of hand rub at point of care), training and education, observation and feedback, reminders in the workplace, and institutional safety climate.

The economic impact of healthcare-associated infections is substantial, costing healthcare systems billions annually. Improved hand hygiene compliance reduces infection rates and is considered the single most effective intervention for infection prevention and control. Studies show that each 10% improvement in hand hygiene compliance reduces infection rates by approximately 15%.`,
  },
  'passage-consent-capacity': {
    id: 'passage-consent-capacity',
    title: 'Informed Consent and Mental Capacity — Legal Framework',
    text: `Informed consent is a fundamental principle of medical ethics and law. For consent to be valid, the patient must: (1) have capacity to make the decision, (2) have received sufficient information to make an informed choice, and (3) give consent voluntarily without coercion.

The Mental Capacity Act 2005 (England and Wales) defines capacity as the ability to: understand information relevant to the decision, retain that information, weigh or use that information as part of decision-making, and communicate the decision by any means. Capacity is decision-specific and time-specific — a patient may have capacity for some decisions but not others.

All adults are presumed to have capacity unless demonstrated otherwise. When assessing capacity, healthcare professionals must take practical steps to support the patient, such as using simplified language, visual aids, or involving a family member or advocate. If a patient lacks capacity, decisions must be made in their best interests, considering past and present wishes, beliefs and values, and the views of family members.

The Montgomery v Lanarkshire Health Board ruling (2015) established that doctors must take reasonable care to ensure patients are aware of material risks of treatment and reasonable alternatives. This represents a shift from the "professional standard" to a "patient-centred test" of what a reasonable person in the patient's position would want to know.`,
  },
  'passage-antimicrobial-stewardship': {
    id: 'passage-antimicrobial-stewardship',
    title: 'Antimicrobial Stewardship — Rationale and Core Strategies',
    text: `Antimicrobial resistance is one of the most urgent threats to global health. The World Health Organization has declared it a global public health emergency. Without effective antimicrobials, routine medical procedures such as joint replacements, caesarean sections, and cancer chemotherapy become high-risk.

Antimicrobial stewardship refers to coordinated interventions designed to improve and measure the appropriate use of antimicrobials by promoting the selection of the optimal drug, dose, duration, and route of administration. The goals are to improve patient outcomes, reduce adverse effects, and decrease the selection pressure that drives resistance.

Core stewardship strategies include: (1) prospective audit and feedback — reviewing antimicrobial prescriptions with direct feedback to prescribers, (2) preauthorisation — requiring approval for specified restricted antibiotics, and (3) guideline-based empiric therapy with de-escalation based on culture results. Additional strategies include dose optimisation, intravenous-to-oral switch programmes, and antibiotic time-out reviews at 48 hours.

The impact of effective stewardship programmes is significant. Hospitals with active stewardship programmes report 20–30% reductions in antibiotic consumption, 15–25% reductions in C. difficile infection, and improved antibiotic susceptibility patterns over time. Successful programmes require multidisciplinary teams including infectious disease physicians, clinical pharmacists, clinical microbiologists, and infection prevention nurses.`,
  },
  'passage-pain-management': {
    id: 'passage-pain-management',
    title: 'Post-operative Pain Management — WHO Analgesic Ladder',
    text: `Effective pain management is a fundamental component of post-operative care. The WHO Analgesic Ladder provides a framework for selecting analgesics based on pain severity. Originally developed for cancer pain, it is now widely applied across clinical settings.

Step 1 (mild pain): non-opioids such as paracetamol and non-steroidal anti-inflammatory drugs (NSAIDs) with or without adjuvants. Step 2 (moderate pain): weak opioids such as codeine or tramadol, combined with non-opioids. Step 3 (severe pain): strong opioids such as morphine, oxycodone, or fentanyl, with or without non-opioids and adjuvants.

Adjuvant medications include anticonvulsants (gabapentin, pregabalin) for neuropathic pain, antidepressants (amitriptyline) for chronic pain syndromes, and local anaesthetics for regional blocks. Paracetamol and NSAIDs should be used regularly around the clock, not just as needed, to maintain baseline analgesia.

Multimodal analgesia — combining agents from different classes — is recommended because it provides superior pain relief with fewer side effects by acting on different pain pathways. For example, combining paracetamol with an NSAID and a regional block reduces opioid requirements by 30–50%.

Pain should be assessed using validated tools such as the Numeric Rating Scale (0–10) or the Visual Analogue Scale. Re-assessment after intervention is essential. In patients with cognitive impairment, behavioural pain assessment tools such as the PAINAD scale should be used.`,
  },
  'passage-antibiotic-stewardship-memo': {
    id: 'passage-antibiotic-stewardship-memo',
    title: 'Memo — Antimicrobial stewardship restrictions',
    text: `From: Antimicrobial Stewardship Committee\nTo: All prescribing clinicians\nSubject: Restricted antibiotic list — approval now required\n\nDear colleagues,\n\nFollowing a rise in multidrug-resistant organism rates across the trust, the following broad-spectrum agents move to restricted status from Monday: piperacillin-tazobactam, meropenem, and intravenous ciprofloxacin.\n\nPrescribing process: Restricted agents require sign-off from the on-call microbiology registrar before the first dose, documented on the antimicrobial approval form. Empirical therapy may still be started for life-threatening sepsis while awaiting approval, but must be reviewed within 24 hours.\n\nRationale: Trust-wide audit data show a 22% rise in carbapenem-resistant isolates over the past year, strongly associated with unrestricted broad-spectrum use. Narrow-spectrum, culture-directed therapy remains the first-line approach wherever the clinical picture allows.\n\nDuration: All antibiotic courses must have a documented stop or review date at the time of prescribing; open-ended courses will be flagged by pharmacy for review.\n\nContact the stewardship pharmacist on extension 3390 with any queries. This memo does not apply to oral first-line agents such as amoxicillin or flucloxacillin, which remain unrestricted.\n\nAntimicrobial Stewardship Committee`,
  },
  'passage-telehealth-consent-notice': {
    id: 'passage-telehealth-consent-notice',
    title: 'Policy notice — Telehealth consultations and consent',
    text: `Telehealth Consultation Policy — Patient Consent Requirements\n\nAll video and telephone consultations require documented verbal consent before clinical discussion begins. Clinicians must confirm the patient's identity using two identifiers (full name and date of birth) and confirm the patient is in a private location able to discuss health information freely.\n\nSuitability: Telehealth is appropriate for review appointments, results discussions, and stable chronic disease management. It is not appropriate for new presentations involving chest pain, breathing difficulty, acute neurological symptoms, or any situation requiring physical examination — these must be redirected to a face-to-face or emergency service.\n\nDocumentation: Record the consent discussion, the patient's location at the time of consultation, and confirmation that a physical examination was not required, in the clinical note.\n\nTechnical failure: If the connection fails twice, offer a telephone consultation as an alternative before rescheduling.\n\nInterpreter services remain available for telehealth and must be offered in the same way as for in-person appointments. This notice does not cover billing procedures, which are detailed separately on the intranet.`,
  },
  'passage-sepsis-recognition-abstract': {
    id: 'passage-sepsis-recognition-abstract',
    title: 'Abstract — Early sepsis recognition tool',
    text: `Background: Delayed recognition of sepsis in general wards is associated with increased mortality. Electronic early-warning tools may improve time to treatment.\n\nMethods: We conducted a stepped-wedge cluster trial across eight general medical wards, introducing an automated sepsis-alert tool that flagged patients meeting systemic inflammatory criteria alongside a new source of infection. Nursing staff received structured training on the escalation pathway triggered by each alert.\n\nResults: Median time from alert to first antibiotic dose fell from 118 minutes to 61 minutes after implementation. False-positive alert rate was 34%, prompting clinician concern about alert fatigue during the first two weeks, which stabilised after threshold recalibration.\n\nConclusion: Automated alerting shortened time to treatment but required active management of alert fatigue to sustain clinical engagement. The authors recommend regular threshold review rather than a fixed one-time calibration.\n\nLimitations: Single-centre design and absence of blinding among treating clinicians limit generalisability. Mortality outcomes were not powered as a primary endpoint in this study.`,
  },
};

export function getReadingPassage(id: string): ReadingPassage | undefined {
  return readingPassages[id];
}
