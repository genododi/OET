import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OetSubtest } from '../types';
import { MaterialSourceText } from './MaterialSourceText';
import { MaterialListeningAudio } from './MaterialListeningAudio';
import { RecordingTranscriptPlayer } from './RecordingTranscriptPlayer';
import { StudyAudioPlayer } from './StudyAudioPlayer';
import { sourceImageFormats } from '../lib/sourceTextLayout';
import { SaveStudyOffline } from './SaveStudyOffline';
import { materialOriginal, materialUrl, validMaterialSheet, type MaterialDocument, type MaterialSheet, type MaterialUnit, type MaterialTextRange } from '../lib/materialPractice';
import './jahshanListening.css';

type File = { id: string; sha256: string; filename: string; format: string; textPath: string; assetPath: string };
export type MaterialContext = { id: string; title: string; textPath: string; startPage: number; endPage: number; ranges?: MaterialTextRange[] };
type Props = { file: File; skill: OetSubtest; onAnswers: (value: string) => void; onQuestionMode: (value: boolean) => void; onContext: (value: MaterialContext | null) => void };
const audioFormats = ['mp3','m4a','wav','ogg','flac','aac','webm'];
function read(key: string) { try { const data = JSON.parse(localStorage.getItem(key) || '{}'); return Object.fromEntries(Object.entries(data).filter((pair): pair is [string,string] => typeof pair[1] === 'string')); } catch { return {}; } }

function QuestionRows({ unit, source, skill, onAnswers }: { unit: MaterialUnit; source: MaterialDocument; skill: OetSubtest; onAnswers: Props['onAnswers'] }) {
  const key = `oet-material-answers-v1:${source.sha256}:${skill}:${unit.id}`;
  const [responses, setResponses] = useState(() => read(key));
  const [revealed, setRevealed] = useState<Record<string,boolean>>({});
  const [error, setError] = useState(false);
  const all = unit.questions.filter(q => q.answer).every(q => revealed[String(q.number)]);
  const answer = (number: number, value: string) => {
    const next = { ...responses, [String(number)]: value }; setResponses(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setError(false); } catch { setError(true); }
    onAnswers(unit.questions.map(q => `${q.number}. ${next[String(q.number)] ?? ''}`).join('\n'));
  };
  return <section className="card material-questions" aria-label="Questions and answers for the selected task">
    <header className="material-toolbar"><div><span className="hero-eyebrow">{unit.label}</span><h3>3 · Fill the blanks and check answers</h3></div><span>{unit.questions.filter(q => responses[String(q.number)]?.trim()).length} of {unit.questions.length} answered</span>{unit.questions.some(q => q.answer) && <button className="btn btn-secondary" aria-pressed={all} onClick={() => setRevealed(Object.fromEntries(unit.questions.filter(q=>q.answer).map(q=>[String(q.number),!all])))}>{all ? 'Hide all' : 'Reveal all'}</button>}</header>
    <p className="meta">Questions retain the printed numbering. Reveal a key after your attempt; revealing never changes your answer.</p>
    <div className="material-question-stack">{unit.questions.map(question => {
      const id = `material-q-${unit.id}-${question.number}`; const key = question.answer; const visible = revealed[String(question.number)];
      return <article className="material-question-row" key={question.number} aria-label={`Question ${question.number}`}>
        <div className="material-question-prompt"><label htmlFor={id}>Question {question.number}</label><div id={`${id}-prompt`} className="material-readable-text">{question.prompt}</div><a href={`${materialOriginal(source)}#page=${question.sourcePage}`} target="_blank" rel="noopener noreferrer">Original question · page {question.sourcePage} ↗</a></div>
        <div className="material-question-controls">{question.choices.length ? <select id={id} value={responses[String(question.number)] ?? ''} aria-describedby={`${id}-prompt`} onChange={event=>answer(question.number,event.target.value)}><option value="">Choose…</option>{question.choices.map(choice=><option key={choice}>{choice}</option>)}{responses[String(question.number)] && !question.choices.includes(responses[String(question.number)]) && <option>{responses[String(question.number)]}</option>}</select> : <input id={id} autoComplete="off" aria-describedby={`${id}-prompt`} placeholder="Your answer" value={responses[String(question.number)] ?? ''} onChange={event=>answer(question.number,event.target.value)} />}
          {key ? <button className="btn btn-secondary" aria-expanded={!!visible} aria-controls={`${id}-answer`} onClick={()=>setRevealed(current=>({...current,[String(question.number)]:!visible}))}>{visible ? 'Hide' : 'Show'} answer for Question {question.number}</button> : <small>No matched printed answer was supplied for this question.</small>}
          {visible && key && <div id={`${id}-answer`} className="material-printed-answer">{key.text ? <><strong>Printed answer:</strong> {key.text}</> : <strong>Printed key · Question {question.number}</strong>}{!key.text && key.source.textPath && <MaterialSourceText id={`${id}-key`} filename={key.source.filename} format={key.source.format} textPath={key.source.textPath} assetPath={key.source.sha256 ? materialOriginal(key.source as MaterialDocument) : materialUrl(key.source.assetPath)} pageNumbers={[key.page]} defaultAll heading="Printed answer page" />}<a href={`${key.source.sha256 ? materialOriginal(key.source as MaterialDocument) : materialUrl(key.source.assetPath)}#page=${key.page}`} target="_blank" rel="noopener noreferrer">Check the original answer key ↗</a></div>}
        </div>
      </article>;
    })}</div>{error && <p role="alert">Storage is unavailable. Copy your answers before leaving.</p>}
  </section>;
}

export function MaterialPracticePaper({ file, skill, onAnswers, onQuestionMode, onContext }: Props) {
  const [sheet, setSheet] = useState<MaterialSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const selectionKey = `oet-material-unit-v1:${file.sha256}:${skill}`;
  const [selected, setSelected] = useState(() => { try { return localStorage.getItem(selectionKey) || ''; } catch { return ''; } });
  const [chosenTrack, setTrack] = useState(() => { try { return localStorage.getItem(`${selectionKey}:recording`) || (audioFormats.includes(file.format) ? file.sha256 : ''); } catch { return audioFormats.includes(file.format) ? file.sha256 : ''; } });
  const [manualPart, setManualPart] = useState<'A'|'B'|'C'|undefined>();
  const [partSelection, setPartSelection] = useState(0);
  const [followQuestions, setFollowQuestions] = useState(true);
  const initialSelection = useRef({selected,chosenTrack,skill});
  useEffect(() => {
    const controller = new AbortController();
    void fetch(materialUrl(`material-practice/sheets/${file.sha256}.json`), {signal:controller.signal}).then(async response => {
      if (!response.ok) throw Error(); const data: MaterialSheet = await response.json(); if (!validMaterialSheet(data,file.sha256)) throw Error();
      if (!controller.signal.aborted) {
        setSheet(data);
        const seed=initialSelection.current;const options=data.units.filter(unit=>unit.skills.includes(seed.skill));
        const first=options.find(unit=>unit.id===seed.selected) ?? options.find(unit=>unit.recordings.includes(seed.chosenTrack)) ?? options.find(unit=>unit.sourceSha256===file.sha256 && unit.questions.length>0) ?? options[0];
        setManualPart(first?.part);setPartSelection(value=>value+1);
      }
    }).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[file.sha256]);
  const units = useMemo(()=>sheet?.units.filter(unit=>unit.skills.includes(skill)) ?? [],[sheet,skill]);
  const unit = units.find(item=>item.id===selected) ?? (chosenTrack ? units.find(item=>item.recordings.includes(chosenTrack)) : undefined) ?? units.find(item=>item.sourceSha256===file.sha256 && item.questions.length>0) ?? units.find(item=>item.sourceSha256===file.sha256) ?? units[0];
  const source = sheet?.documents.find(item=>item.sha256===unit?.sourceSha256);
  const recordings = sheet?.documents.filter(item=>item.role==='recording') ?? [];
  const offlineAssets = [
    { url: materialUrl(`material-practice/sheets/${file.sha256}.json`), label: 'Questions and source matches' },
    { url: materialUrl(file.textPath), label: 'Complete source text' },
    ...[file,...(sheet?.documents ?? [])].filter(document => sourceImageFormats.includes(document.format)).flatMap(document => [
      {url: materialUrl(document.assetPath),label:`Original photo · ${document.filename}`,sha256:document.sha256,optional:true},
      ...(!['jpg','jpeg','png','webp','gif','avif'].includes(document.format) ? [{url:materialUrl(`imported-resources/previews/${document.sha256}.png`),label:`Photo preview · ${document.filename}`,optional:true}] : []),
    ]),
    ...(sheet?.documents.filter(document => !audioFormats.includes(document.format)).map(document => ({ url: materialUrl(document.textPath), label: document.filename })) ?? []),
    ...(sheet?.documents.filter(document => document.format === 'pdf').map(document => ({ url: materialUrl(document.assetPath), label: `Original PDF · ${document.filename}`, sha256: document.sha256, mimeType: 'application/pdf', optional: true })) ?? []),
  ];
  const trackSha = chosenTrack || (unit?.recordings.length===1 ? unit.recordings[0] : '');
  const track = recordings.find(item=>item.sha256===trackSha) ?? (audioFormats.includes(file.format) && trackSha===file.sha256 ? {...file,role:'recording'} : undefined);
  const hasQuestions = !!unit?.questions.length;
  useEffect(()=>onQuestionMode(hasQuestions),[hasQuestions,onQuestionMode]);
  useEffect(()=>{
    onContext(unit && source ? {id:unit.id,title:unit.label,textPath:source.textPath,startPage:unit.pages[0],endPage:unit.pages.at(-1)!,ranges:unit.ranges} : null);
  },[unit,source,onContext]);
  const selectUnit = (next: MaterialUnit, manual = true) => {
    setSelected(next.id); try { localStorage.setItem(selectionKey,next.id); } catch { /* Continue without saved navigation. */ }
    if (manual) { setManualPart(next.part); setPartSelection(value=>value+1); if (next.recordings.length===1) { setTrack(next.recordings[0]); try { localStorage.setItem(`${selectionKey}:recording`,next.recordings[0]); } catch { /* Continue playback. */ } } }
  };
  const playbackPart = useCallback((part:'A'|'B'|'C') => {
    if (!followQuestions || unit?.part===part) return;
    const next = units.find(item=>item.part===part && item.recordings.includes(trackSha));
    if (next) { setSelected(next.id); try { localStorage.setItem(selectionKey,next.id); } catch { /* Continue playback. */ } }
  },[followQuestions,unit?.part,units,trackSha,selectionKey]);
  const originalAudio = track && <RecordingTranscriptPlayer offlineAssets={offlineAssets} track={{id:`material-${track.sha256}`,name:track.filename,sha256:track.sha256,url:materialOriginal(track)}} audioUrl={materialOriginal(track)} transcriptPath={`material-practice/transcripts/${track.sha256}.json`} selectedPart={manualPart} partSelection={partSelection} onPlaybackPart={playbackPart} seekOnLoad heading="2 · Listen to the matching recording" description={track.filename} />;
  return <div className="material-practice-paper">
    {!loading && !track && <SaveStudyOffline key={file.sha256} id={`material-${file.sha256}`} title={file.filename} assets={offlineAssets} />}
    {loading && <p role="status">Matching the paper, recording and printed key…</p>}
    {units.length>0 && <section className="card material-task-picker"><h3>Choose a test, part or task</h3><label>Task or part<select value={unit?.id ?? ''} onChange={event=>{const next=units.find(item=>item.id===event.target.value);if(next)selectUnit(next);}}>{units.map(item=><option key={item.id} value={item.id}>{item.label} · pages {item.pages[0]}–{item.pages.at(-1)}{item.questions.length ? ` · ${item.questions.length} questions` : ''}</option>)}</select></label>{units.some(item=>item.part) && <div className="material-skill-tabs" role="group" aria-label="Source exam part">{(['A','B','C'] as const).map(part=><button type="button" key={part} aria-pressed={unit?.part===part} disabled={!units.some(item=>item.part===part)} onClick={()=>{const next=units.find(item=>item.part===part && item.recordings.includes(trackSha)) ?? units.find(item=>item.part===part);if(next)selectUnit(next);}}>Part {part}</button>)}</div>}</section>}
    {(recordings.length>0 || track) && <section className="card material-recording-picker"><label>Matching recording<select value={track?.sha256 ?? ''} onChange={event=>{const sha=event.target.value;setTrack(sha);try { localStorage.setItem(`${selectionKey}:recording`,sha); } catch { /* Continue playback. */ } const next=units.find(item=>item.recordings.includes(sha));if(next)selectUnit(next,false);setManualPart(undefined);}}><option value="">Choose the original recording…</option>{recordings.map(item=><option value={item.sha256} key={item.sha256}>{item.filename}</option>)}</select></label><label><input type="checkbox" checked={followQuestions} onChange={event=>setFollowQuestions(event.target.checked)} /> Follow the playing audio’s part in the questions</label>{originalAudio}</section>}
    {source && unit ? <>
      {(unit.passages ?? []).map(passage=>{const paper=sheet!.documents.find(item=>item.sha256===passage.sourceSha256);return paper ? <MaterialSourceText key={`${unit.id}-${paper.sha256}`} id={`${unit.id}-${paper.id}`} filename={paper.filename} format={paper.format} textPath={paper.textPath} assetPath={materialOriginal(paper)} pageNumbers={passage.pages} defaultAll heading="2 · Read the complete passage" /> : null;})}
      <MaterialSourceText key={unit.id} id={`${file.id}-${unit.id}`} filename={source.filename} format={source.format} textPath={source.textPath} assetPath={materialOriginal(source)} pageNumbers={unit.pages} ranges={unit.ranges} defaultAll heading={skill==='writing'?'2 · Read the case notes and writing task':skill==='speaking'?'2 · Read the candidate role-play card':skill==='reading'?'2 · Read the complete source text':'2 · Read the listening paper'} />
      {hasQuestions && <QuestionRows key={`answers-${unit.id}`} unit={unit} source={source} skill={skill} onAnswers={onAnswers} />}
      {unit.answerSources.length>0 && <details className="card material-source-review"><summary>{skill==='writing'?'Show / hide supplied model letters or feedback':skill==='speaking'?'Show / hide supplied review material':'Show / hide original answer documents'}</summary>{unit.answerSources.map(key=><MaterialSourceText key={key.id} id={`${unit.id}-${key.id}`} filename={key.filename} format={key.format} textPath={key.textPath} assetPath={materialOriginal(key)} pageNumbers={key.pages} defaultAll heading={key.filename} />)}</details>}
      {skill==='speaking' && sheet?.documents.filter(item=>item.role==='partner-card' && item.sha256!==source.sha256).map(partner=><details className="card material-source-review" key={partner.id}><summary>Show / hide partner card · {partner.filename}</summary><MaterialSourceText id={partner.id} filename={partner.filename} format={partner.format} textPath={partner.textPath} assetPath={materialOriginal(partner)} defaultAll heading="Partner card" /></details>)}
    </> : <MaterialSourceText key={file.id} id={file.id} filename={file.filename} format={file.format} textPath={file.textPath} assetPath={materialOriginal(file)}>{!track && audioFormats.includes(file.format) ? <StudyAudioPlayer src={materialOriginal(file)} label={file.filename} /> : ['mp4','mov'].includes(file.format) ? <video controls preload="metadata" aria-label={file.filename} style={{width:'100%'}} src={materialOriginal(file)} /> : skill==='listening' && !recordings.length && !track ? <MaterialListeningAudio /> : undefined}</MaterialSourceText>}
    {!loading && !hasQuestions && ['reading','listening'].includes(skill) && <p className="meta">This source has no confidently extracted numbered questions for this selection. Its full text and original remain available; use the answer notes below.</p>}
  </div>;
}
