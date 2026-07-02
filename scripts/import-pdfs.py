#!/usr/bin/env python3
"""Download official OET PDFs and generate experience write-up PDFs."""

from __future__ import annotations

import json
import textwrap
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS_DIR = ROOT / "public" / "pdfs" / "books"
EXP_DIR = ROOT / "public" / "pdfs" / "experiences"

# Official free materials from OET (Cambridge Boxhill Language Assessment)
OFFICIAL_BOOKS = [
    {
        "filename": "oet-ready-study-guide.pdf",
        "url": "https://cdn-aus.aglty.io/oet/OET%20Ready%20Study%20Guide.pdf",
    },
    {
        "filename": "oet-ultimate-writing-guide.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/OET%20Ultimate%20Writing%20Guide.pdf",
    },
    {
        "filename": "oet-cefr-benchmarking.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/wp-migration/OET-CEFR-benchmarking.pdf",
    },
    {
        "filename": "oet-mini-listening-test-1.pdf",
        "url": "https://cdn-aus.aglty.io/oet/education/OET_Mini_Listening_Test.pdf",
    },
    {
        "filename": "oet-listening-sample-test-1.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/Listening-Sample-Test-1-Question-Paper.pdf",
    },
    {
        "filename": "oet-listening-sample-test-2.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/Listening-Sample-Test-2-Question-Paper.pdf",
    },
    {
        "filename": "oet-listening-sample-test-3.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/Listening-Sample-Test-3-Question-Paper.pdf",
    },
    {
        "filename": "oet-graded-speaking-samples.pdf",
        "url": "https://cdn-aus.aglty.io/oet/education/Graded%20Candidate%20Samples%20Speaking%20Booklet.pdf",
    },
    {
        "filename": "oet-graded-writing-samples.pdf",
        "url": "https://cdn-aus.aglty.io/oet/education/GradedCandidate%20Samples%20Writing%20Booklet.pdf",
    },
    {
        "filename": "oet-nursing-writing-sample-task-01.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/writing/Nursing%20Sample%20Task%2001.pdf",
    },
    {
        "filename": "oet-nursing-writing-sample-task-02.pdf",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/writing/Nursing%20Sample%20Task%2002.pdf",
    },
]

EXPERIENCES = [
    {
        "filename": "nursing-cbt-london-mar2025.pdf",
        "title": "March 2025 — Nursing CBT London (Full Recall)",
        "author": "Sarah M.",
        "profession": "Nursing",
        "exam_date": "March 2025",
        "score": "B in all sub-tests",
        "source": "Telegram @OETNursesUK",
        "summary": "Computer-based at London venue. Writing was a discharge letter for a COPD patient. Speaking had medication side-effects and a worried family member scenario.",
        "highlights": [
            "Listening Part C was faster than practice tests — stay focused through the last extract.",
            "Reading Part A had a tricky matching set on infection control policies.",
            "Speaking interlocutor was friendly; warm-up questions were about nursing background.",
        ],
        "subtests": {
            "Listening": "Part B ward handover (post-op). Part A diabetes review notes.",
            "Writing": "Discharge to GP — oxygen therapy and smoking cessation referral.",
            "Speaking": "Warfarin diet; fall risk at home with family member.",
        },
    },
    {
        "filename": "medicine-paper-mumbai-jan2025.pdf",
        "title": "January 2025 — Medicine Paper Mumbai",
        "author": "Dr. Raj P.",
        "profession": "Medicine",
        "exam_date": "January 2025",
        "score": "A in Reading & Listening, B in Writing & Speaking",
        "source": "Telegram @OETDoctorsHub",
        "summary": "Paper-based in Mumbai. Writing referral to cardiologist for chest pain workup. Both speaking cards were empathetic communication tasks.",
        "highlights": [
            "Bring a watch — room clock was hard to see from back rows.",
            "Filtered case notes to relevant cardiac risk factors only.",
            "Used 3-minute speaking prep to outline bullet points on the card.",
        ],
        "subtests": {
            "Reading": "Part C clinical trial abstract — methodology and conclusions.",
            "Writing": "Referral letter stressing urgency and recent ECG findings.",
            "Speaking": "Breaking abnormal scan news; NAFLD lifestyle changes.",
        },
    },
    {
        "filename": "pharmacy-dubai-nov2024.pdf",
        "title": "November 2024 — Pharmacy Dubai Combined",
        "author": "Elena K.",
        "profession": "Pharmacy",
        "exam_date": "November 2024",
        "score": "B in all sub-tests (first attempt)",
        "source": "Telegram @OETPharmacyPrep",
        "summary": "Combined venue in Dubai. Writing was a letter to GP about drug interaction concerns. Speaking focused on OTC advice and inhaler technique.",
        "highlights": [
            "Pharmacy writing still needs 180–200 words with clear structure.",
            "Listening abbreviations matched official sample difficulty.",
            "Part A reading was hardest — timed practice essential.",
        ],
        "subtests": {
            "Listening": "Part A medication review; Part C antibiotic stewardship lecture.",
            "Writing": "Letter advising GP to review statin dose due to muscle pain.",
        },
    },
    {
        "filename": "physio-speaking-retake-dec2024.pdf",
        "title": "Speaking Retake Success — Physiotherapy",
        "author": "James T.",
        "profession": "Physiotherapy",
        "exam_date": "December 2024",
        "score": "B in Speaking (retake); B in L/R/W first attempt",
        "source": "Telegram @OETAlliedHealth",
        "summary": "First attempt C+ in Speaking due to technical jargon. Retake focused on interaction, lay language, and checking questions.",
        "highlights": [
            "Avoid ROM/proprioception terms without explaining.",
            "Retake strategy: plain language + 'Can you show me where it hurts?'",
            "Writing was community physio transfer with home exercise program.",
        ],
        "subtests": {
            "Speaking": "Retake: post-TKR expectations; chronic back pain at work.",
        },
    },
    {
        "filename": "nursing-6week-plan-debrief.pdf",
        "title": "6-Week Study Plan + Mock Debrief Pack",
        "author": "OET Experience Archive",
        "profession": "Nursing",
        "exam_date": "Various 2024",
        "score": "Grade B overall (aggregated reports)",
        "source": "Telegram @OETExperienceArchive",
        "summary": "Aggregated debrief from multiple candidates. Pair official OET materials with Telegram debriefs within 48 hours of sitting.",
        "highlights": [
            "Same-week recall helps pattern recognition — prompts still change.",
            "Annotated model letter included for writing task type.",
            "Recommended: 2 mocks + daily 45-min sub-test rotation over 6 weeks.",
        ],
        "subtests": {
            "Reading": "Falls prevention policy — matching headings.",
            "Writing": "Handover letter to community nurse for wound care.",
        },
    },
    {
        "filename": "topic-frequency-report-2024-2025.pdf",
        "title": "Listening & Reading Topic Frequency Report",
        "author": "Community meta-analysis",
        "profession": "All professions",
        "exam_date": "2024–2025",
        "score": "N/A — research summary",
        "source": "Multiple Telegram groups",
        "summary": "Crowdsourced log of topics in recall posts. For pattern awareness only — not a prediction tool.",
        "highlights": [
            "Common writing: diabetes, COPD discharge, cardiac referral, drug interaction.",
            "Reading: infection control, staffing, clinical trials, care pathways.",
            "Speaking: medication side effects, lifestyle advice, breaking news, consent.",
        ],
        "subtests": {},
    },
    {
        "filename": "medicine-writing-retake-apr2025.pdf",
        "title": "April 2025 — Medicine Writing Retake Success",
        "author": "Priya N.",
        "profession": "Medicine",
        "exam_date": "April 2025",
        "score": "B in all sub-tests (second attempt)",
        "source": "Telegram @OETDoctorsHub",
        "summary": "Failed Writing (C+) first attempt — wrong recipient. Second attempt: GP referral to gastroenterology for chronic abdominal pain.",
        "highlights": [
            "Always identify recipient from case notes header.",
            "Omit unrelated travel history from referral.",
            "Teach-back in speaking: 'Can you tell me how you'll take the bowel prep?'",
        ],
        "subtests": {
            "Writing": "Gastroenterology referral with relevant examination findings only.",
            "Speaking": "Colonoscopy prep; statin side effects with elderly patient.",
        },
    },
    {
        "filename": "nursing-oet-at-home-feb2025.pdf",
        "title": "February 2025 — Nursing OET at Home Experience",
        "author": "Michael O.",
        "profession": "Nursing",
        "exam_date": "February 2025",
        "score": "A in Listening, B elsewhere",
        "source": "Telegram @OETNursesUK",
        "summary": "OET on Computer at home for L/R/W; speaking at test centre next day. Writing discharge after CHF exacerbation.",
        "highlights": [
            "Stable internet and quiet room required — proctor checks via webcam.",
            "Complete official computer familiarisation tutorial before at-home booking.",
            "Reading Part A on vaccination schedules — synonym matching was tricky.",
        ],
        "subtests": {
            "Listening": "Part B insulin storage question at pharmacy.",
            "Reading": "Part C nurse staffing ratios — opinion vs fact.",
            "Writing": "Discharge with medication changes and community HF nurse referral.",
        },
    },
    {
        "filename": "pharmacy-cairo-dec2024.pdf",
        "title": "December 2024 — Pharmacy Cairo Paper-Based",
        "author": "Fatima A.",
        "profession": "Pharmacy",
        "exam_date": "December 2024",
        "score": "B in all sub-tests",
        "source": "Telegram @OETPharmacyPrep",
        "summary": "Paper-based in Cairo. Writing on warfarin–antibiotic interaction. Speaking: inhaler technique and generic substitution.",
        "highlights": [
            "Exam hall AC very cold — dress in layers.",
            "Hit word count with clear GP action in pharmacy writing.",
            "Practice brand vs generic comparisons in plain language.",
        ],
        "subtests": {
            "Writing": "Advised GP to monitor INR during antibiotic course.",
            "Speaking": "Patient confused brand vs generic medicines.",
        },
    },
    {
        "filename": "dentistry-writing-pitfalls-oct2024.pdf",
        "title": "October 2024 — Dentistry Writing Pitfalls",
        "author": "David L.",
        "profession": "Dentistry",
        "exam_date": "October 2024",
        "score": "B in L/R/S; C+ in Writing (retake scheduled)",
        "source": "Telegram @OETDentistryNet",
        "summary": "Referral to oral surgeon for impacted wisdom tooth. Writing failed conciseness — letter was 240 words.",
        "highlights": [
            "Count words in practice — target 180–200 strictly.",
            "Speaking: extraction risks to teenager; post-root canal care.",
            "Reading included dental radiography safety (ALARA principle).",
        ],
        "subtests": {
            "Reading": "Part B email on appointment no-shows.",
            "Speaking": "Addressed both teenager and parent appropriately.",
        },
    },
    {
        "filename": "radiography-manila-aug2024.pdf",
        "title": "August 2024 — Radiography Manila Combined",
        "author": "Hana S.",
        "profession": "Radiography",
        "exam_date": "August 2024",
        "score": "B in all sub-tests (first attempt)",
        "source": "Telegram @OETAlliedHealth",
        "summary": "Combined venue. Writing clarified incomplete imaging request. Speaking: MRI for claustrophobic patient.",
        "highlights": [
            "Official samples sufficient even with smaller profession community online.",
            "Listening: radiographer discussing contrast allergy with nurse.",
            "Step-by-step MRI explanation; offered earplugs/music for anxiety.",
        ],
        "subtests": {
            "Listening": "Part C paediatric radiation dose reduction lecture.",
            "Writing": "Letter requesting clinical indication clarification.",
            "Speaking": "Managing claustrophobia before MRI scan.",
        },
    },
    {
        "filename": "speaking-interruption-strategies-jul2024.pdf",
        "title": "July 2024 — Speaking Interruption Strategies",
        "author": "Chris W.",
        "profession": "Medicine",
        "exam_date": "July 2024",
        "score": "B overall",
        "source": "Telegram @OETExperienceArchive",
        "summary": "Interlocutor interrupted mid-role-play with follow-up questions — treat as part of the interaction, not a mistake.",
        "highlights": [
            "Example: 'What if the pain gets worse?' during chest pain counselling.",
            "Do not freeze when interrupted — shows interaction skills.",
            "Writing: iron-deficiency anaemia referral with recent blood results.",
        ],
        "subtests": {
            "Speaking": "Gout lifestyle advice; colonoscopy after positive FIT.",
        },
    },
    {
        "filename": "nursing-toronto-may2024.pdf",
        "title": "May 2024 — Nursing Toronto CBT Recap",
        "author": "Amira H.",
        "profession": "Nursing",
        "exam_date": "May 2024",
        "score": "B in all sub-tests",
        "source": "Telegram @OETNursesGlobal",
        "summary": "CBT in Toronto. Reading Part A catheter care bundles — timing tight. Transfer to residential aged care writing.",
        "highlights": [
            "Filter unofficial 'guaranteed questions' spam in large Telegram groups.",
            "Speaking warm-up: shift patterns in home country — answer briefly.",
            "Family guilt about missed appointments — empathetic response needed.",
        ],
        "subtests": {
            "Reading": "Infection prevention policy matching across four texts.",
            "Writing": "Aged care transfer with mobility and cognition summary.",
            "Speaking": "Diabetic foot care; addressing family member's guilt.",
        },
    },
    {
        "filename": "physio-speaking-workbook-dec2024.pdf",
        "title": "Physiotherapy Speaking Retake Workbook",
        "author": "James T.",
        "profession": "Physiotherapy",
        "exam_date": "December 2024",
        "score": "B in Speaking after retake",
        "source": "Telegram @OETAlliedHealth",
        "summary": "Lay-language checklist, dialogue transcripts, and criteria mapping for speaking retake success.",
        "highlights": [
            "Replace 'proprioception' with 'awareness of body position'.",
            "Pause after explaining exercises — ask patient to demonstrate.",
            "Record practice sessions and replay for filler words.",
        ],
        "subtests": {
            "Speaking": "Post-TKR rehab expectations; workplace chronic back pain.",
        },
    },
    {
        "filename": "exam-day-logistics-guide.pdf",
        "title": "Multi-Group Exam Day Logistics Guide",
        "author": "Community compilation",
        "profession": "All professions",
        "exam_date": "2024–2025",
        "score": "N/A — logistics guide",
        "source": "Multiple Telegram groups",
        "summary": "What to bring, arrival times, ID matching, venue tips from 20+ debrief posts.",
        "highlights": [
            "ID must match registration exactly — no exceptions.",
            "Arrive 30–45 minutes early for identity checks.",
            "Speaking may be on a different day — confirm booking email.",
            "Paper vs computer: confirm writing mode (pen/keyboard) in advance.",
        ],
        "subtests": {},
    },
]


def download_official_pdfs() -> None:
    BOOKS_DIR.mkdir(parents=True, exist_ok=True)
    for item in OFFICIAL_BOOKS:
        dest = BOOKS_DIR / item["filename"]
        print(f"Downloading {item['filename']}...")
        req = urllib.request.Request(item["url"], headers={"User-Agent": "OET-Study-Partner/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = resp.read()
        if not data.startswith(b"%PDF"):
            raise RuntimeError(f"Downloaded file is not a PDF: {item['url']}")
        dest.write_bytes(data)
        print(f"  ✓ {len(data) // 1024} KB -> {dest.relative_to(ROOT)}")


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_lines(text: str, width: int = 88) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            lines.append("")
            continue
        lines.extend(textwrap.wrap(paragraph, width=width))
    return lines


def build_experience_pdf(content: dict) -> bytes:
    lines: list[str] = []
    lines.append(f"OET Exam Experience Write-up")
    lines.append("")
    lines.append(content["title"])
    lines.append(f"Author: {content['author']}  |  {content['profession']}  |  {content['exam_date']}")
    lines.append(f"Score: {content['score']}")
    lines.append(f"Source: {content['source']}")
    lines.append("")
    lines.append("Summary")
    lines.extend(wrap_lines(content["summary"]))
    lines.append("")
    lines.append("Key takeaways")
    for h in content["highlights"]:
        lines.extend(wrap_lines(f"• {h}"))
    if content.get("subtests"):
        lines.append("")
        lines.append("Sub-test recalls (paraphrased)")
        for name, detail in content["subtests"].items():
            lines.append(f"{name}:")
            lines.extend(wrap_lines(detail, width=84))
            lines.append("")
    lines.append("")
    lines.append("Disclaimer: Prompts change every test session. Use for pattern awareness only.")
    lines.append("Curated for OET Study Partner — cross-check with official materials at oet.com")

    y = 750
    stream_parts = ["BT /F1 11 Tf"]
    for line in lines[:55]:
        if y < 50:
            break
        safe = pdf_escape(line) if line else " "
        stream_parts.append(f"50 {y} Td ({safe}) Tj")
        y -= 14
    stream_parts.append("ET")
    stream = "\n".join(stream_parts).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj\n",
        b"4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
        f"5 0 obj<< /Length {len(stream)} >>stream\n".encode() + stream + b"\nendstream endobj\n",
    ]
    body = b"".join(objects)
    header = b"%PDF-1.4\n"
    offsets = [0]
    pos = len(header)
    for obj in objects:
        offsets.append(pos)
        pos += len(obj)
    xref_pos = pos
    xref = [b"xref\n", f"0 {len(offsets)}\n".encode(), b"0000000000 65535 f \n"]
    for off in offsets[1:]:
        xref.append(f"{off:010d} 00000 n \n".encode())
    trailer = f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    return header + body + b"".join(xref) + trailer


def generate_experience_pdfs() -> None:
    EXP_DIR.mkdir(parents=True, exist_ok=True)
    for exp in EXPERIENCES:
        dest = EXP_DIR / exp["filename"]
        print(f"Generating {exp['filename']}...")
        dest.write_bytes(build_experience_pdf(exp))
        print(f"  ✓ -> {dest.relative_to(ROOT)}")


def main() -> None:
    print("=== Official OET book PDFs ===")
    download_official_pdfs()
    print("\n=== Experience write-up PDFs ===")
    generate_experience_pdfs()
    print("\nDone.")


if __name__ == "__main__":
    main()
