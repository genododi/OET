import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OetSubtest } from '../types';
import { ReadingEvidenceProvider, ReadingEvidenceToggle } from './ReadingEvidence';
import { MaterialSourceText } from './MaterialSourceText';
import { MaterialListeningAudio } from './MaterialListeningAudio';
import { RecordingTranscriptPlayer } from './RecordingTranscriptPlayer';
import { StudyAudioPlayer } from './StudyAudioPlayer';
import { sourceImageFormats } from '../lib/sourceTextLayout';
import { SaveStudyOffline } from './SaveStudyOffline';
import { materialOriginal, materialUrl, validMaterialSheet, type MaterialSheet, type MaterialUnit, type MaterialTextRange } from '../lib/materialPractice';
import './jahshanListening.css';
import './jahshanReading.css';
import { MaterialQuestionRows } from './MaterialQuestionRows';
import { buildHash, parseRoute } from '../lib/routing';

type File = { id: string; sha256: string; filename: string; format: string; textPath: string; assetPath: string };
export type MaterialContext = { id: string; title: string; textPath: string; startPage: number; endPage: number; ranges?: MaterialTextRange[] };
type Props = { file: File; skill: OetSubtest; wideSource?: boolean; onAnswers: (value: string) => void; onQuestionMode: (value: boolean) => void; onContext: (value: MaterialContext | null) => void };
const audioFormats = ['mp3','m4a','wav','ogg','flac','aac','webm'];
const audioMimeTypes: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  flac: 'audio/flac', aac: 'audio/aac', webm: 'audio/webm',
};
const audioMimeType = (format: string) => audioMimeTypes[format.toLowerCase()];
export function MaterialPracticePaper({ file, skill, wideSource = true, onAnswers, onQuestionMode, onContext }: Props) {
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
  const originalAudio = track && <RecordingTranscriptPlayer offlineAssets={offlineAssets} track={{id:`material-${track.sha256}`,name:track.filename,sha256:track.sha256,url:materialOriginal(track)}} audioUrl={materialOriginal(track)} mimeType={audioMimeType(track.format)} transcriptPath={`material-practice/transcripts/${track.sha256}.json`} selectedPart={manualPart} partSelection={partSelection} onPlaybackPart={playbackPart} seekOnLoad heading="2 · Listen to the matching recording" description={track.filename} />;
  return <ReadingEvidenceProvider storageKey={`material-${file.id}`} questions={skill === 'reading' ? (unit?.questions ?? []).map(q => ({ id: String(q.number), prompt: q.prompt, answer: q.answer?.text, label: `Question ${q.number}` })) : []}><div className="material-practice-paper">
    {!loading && !track && <SaveStudyOffline key={file.sha256} id={`material-${file.sha256}`} title={file.filename} assets={offlineAssets} />}
    {loading && <p role="status">Matching the paper, recording and printed key…</p>}
    {!!sheet?.relatedFiles?.length && <details className="card material-source-review"><summary>Files extracted from this {['ppt','pptx'].includes(file.format) ? 'presentation' : 'archive'} · {sheet.relatedFiles.length}</summary><ul className="material-contained-files">{sheet.relatedFiles.map(child=><li key={child.id}><a href={buildHash('materials',child.id,parseRoute().returnTo)}>{child.filename}</a><span className="tag">{child.format.toUpperCase()}</span></li>)}</ul><p className="meta">Original files are retained. Select a matched task below, or open an individual file.</p></details>}
    {!loading && audioFormats.includes(file.format) && <p className="meta" role="status">{hasQuestions ? `Matched question paper: ${source?.filename}. Questions follow the selected part of this recording.` : 'No verified question paper has been found for this recording yet. You can still listen and read its available recording transcript. General podcasts may have no exam question paper.'}</p>}
    {units.length>0 && <section className="card material-task-picker"><span className="hero-eyebrow">STEP 1 · SELECT YOUR PAPER</span><h3>Choose a test, part or task</h3><label>Task or part<select value={unit?.id ?? ''} onChange={event=>{const next=units.find(item=>item.id===event.target.value);if(next)selectUnit(next);}}>{units.map(item=><option key={item.id} value={item.id}>{item.label} · pages {item.pages[0]}–{item.pages.at(-1)}{item.questions.length ? ` · ${item.questions.length} questions` : ''}</option>)}</select></label>{units.some(item=>item.part) && <div className="material-skill-tabs" role="group" aria-label="Source exam part">{(['A','B','C'] as const).map(part=><button type="button" key={part} aria-pressed={unit?.part===part} disabled={!units.some(item=>item.part===part)} onClick={()=>{const next=units.find(item=>item.part===part && item.recordings.includes(trackSha)) ?? units.find(item=>item.part===part);if(next)selectUnit(next);}}>Part {part}</button>)}</div>}</section>}
    {(recordings.length>0 || track) && <section className="card material-recording-picker"><label>Matching recording<select value={track?.sha256 ?? ''} onChange={event=>{const sha=event.target.value;setTrack(sha);try { localStorage.setItem(`${selectionKey}:recording`,sha); } catch { /* Continue playback. */ } const next=units.find(item=>item.recordings.includes(sha));if(next)selectUnit(next,false);setManualPart(undefined);}}><option value="">Choose the original recording…</option>{recordings.map(item=><option value={item.sha256} key={item.sha256}>{item.filename}</option>)}</select></label><label><input type="checkbox" checked={followQuestions} onChange={event=>setFollowQuestions(event.target.checked)} /> Follow the playing audio’s part in the questions</label>{originalAudio}</section>}
    {source && unit ? <>
      {skill === 'reading' && hasQuestions && <ReadingEvidenceToggle />}
      <div className={skill === 'reading' && hasQuestions && !wideSource ? 'reading-workbench material-reading-workbench' : 'material-source-stack'}>
        <div className="material-paper-pane">
          {(unit.passages ?? []).map(passage => { const paper = sheet!.documents.find(item => item.sha256 === passage.sourceSha256); return paper ? <MaterialSourceText key={`${unit.id}-${paper.sha256}`} id={`${unit.id}-${paper.id}`} filename={paper.filename} format={paper.format} textPath={paper.textPath} assetPath={materialOriginal(paper)} pageNumbers={passage.pages} defaultAll heading="2 · Read the complete passage" /> : null; })}
          {skill === 'listening' && hasQuestions ? null : <MaterialSourceText key={unit.id} id={`${file.id}-${unit.id}`} filename={source.filename} format={source.format} textPath={source.textPath} assetPath={materialOriginal(source)} pageNumbers={unit.pages} ranges={unit.ranges} defaultAll heading={skill === 'writing' ? '2 · Read the case notes and writing task' : skill === 'speaking' ? '2 · Read the candidate role-play card' : '2 · Read the complete source text'} />}
        </div>
        {hasQuestions && <MaterialQuestionRows key={`answers-${unit.id}`} unit={unit} source={source} skill={skill} onAnswers={onAnswers} />}
      </div>
      {skill === 'listening' && hasQuestions && <details className="card material-source-review"><summary>Original listening paper and page layout</summary><MaterialSourceText key={unit.id} id={`${file.id}-${unit.id}`} filename={source.filename} format={source.format} textPath={source.textPath} assetPath={materialOriginal(source)} pageNumbers={unit.pages} ranges={unit.ranges} defaultAll heading="Original listening paper" /></details>}
      {unit.answerSources.length>0 && <details className="card material-source-review"><summary>{skill==='writing'?'Show / hide supplied model letters or feedback':skill==='speaking'?'Show / hide supplied review material':'Show / hide original answer documents'}</summary>{unit.answerSources.map(key=><MaterialSourceText key={key.id} id={`${unit.id}-${key.id}`} filename={key.filename} format={key.format} textPath={key.textPath} assetPath={materialOriginal(key)} pageNumbers={key.pages} defaultAll heading={key.filename} />)}</details>}
      {skill==='speaking' && sheet?.documents.filter(item=>item.role==='partner-card' && item.sha256!==source.sha256).map(partner=><details className="card material-source-review" key={partner.id}><summary>Show / hide partner card · {partner.filename}</summary><MaterialSourceText id={partner.id} filename={partner.filename} format={partner.format} textPath={partner.textPath} assetPath={materialOriginal(partner)} defaultAll heading="Partner card" /></details>)}
    </> : <MaterialSourceText key={file.id} id={file.id} filename={file.filename} format={file.format} textPath={file.textPath} assetPath={materialOriginal(file)}>{!track && audioFormats.includes(file.format) ? <StudyAudioPlayer src={materialOriginal(file)} label={file.filename} mimeType={audioMimeType(file.format)} /> : ['mp4','mov'].includes(file.format) ? <video controls preload="metadata" aria-label={file.filename} style={{width:'100%'}} src={materialOriginal(file)} /> : skill==='listening' && !recordings.length && !track ? <MaterialListeningAudio /> : undefined}</MaterialSourceText>}
    {!loading && !hasQuestions && ['reading','listening'].includes(skill) && <p className="meta">This source has no confidently extracted numbered questions for this selection. Its full text and original remain available; use the answer notes below.</p>}
  </div></ReadingEvidenceProvider>;
}
