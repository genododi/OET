import { useEffect, useRef, useState } from 'react';
import { JahshanListeningPlayer } from '../components/JahshanListeningPlayer';
import { JahshanListeningWorksheet } from '../components/JahshanListeningWorksheet';
import { JahshanReadingWorkspace } from '../components/JahshanReadingWorkspace';
import collection from '../data/jahshanCollection.json';
import { canConnectLocalSource, localSourceFileUrl, LOCAL_SOURCE_GATEWAY_ORIGIN } from '../lib/localSourceGateway';
import './officialExam.css';
import './studySources.css';

type Asset = (typeof collection.files)[number];
const sortNames = (a: Asset, b: Asset) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true });
const books = collection.files.filter(file => file.mimeType === 'application/pdf');
const tracks = collection.files.filter(file => file.mimeType.startsWith('audio/'));

function PracticeNotes({ storageKey }: { storageKey: string }) {
  const [notes, setNotes] = useState(() => { try { return localStorage.getItem(storageKey) ?? ''; } catch { return ''; } });
  const [error, setError] = useState(false);
  return <section className="card"><h3>Extra notes and corrections for this set</h3><label htmlFor="jahshan-notes">My numbered answers, evidence and corrections</label><textarea id="jahshan-notes" rows={9} style={{ width: '100%', boxSizing: 'border-box', font: 'inherit' }} value={notes} onChange={event => { setNotes(event.target.value); try { localStorage.setItem(storageKey, event.target.value); setError(false); } catch { setError(true); } }} /><p className="meta">{error ? 'Saving is unavailable. Copy your notes before leaving.' : 'Saved in this browser for this book or listening set.'} Compare with the collection’s key after attempting the questions. No automatic OET grade is assigned.</p></section>;
}

export function JahshanPage({ initialSkill = 'listening' }: { initialSkill?: 'listening' | 'reading' }) {
  const gatewayAllowed = canConnectLocalSource();
  const [skill, setSkill] = useState<'listening' | 'reading'>(initialSkill);
  const [groupId, setGroupId] = useState(collection.groups[2].id);
  const [trackId, setTrackId] = useState('');
  const [gateway, setGateway] = useState<'idle' | 'checking' | 'ready' | 'unavailable'>('idle');
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const urls = useRef<Record<string, string>>({});
  const [fileMessage, setFileMessage] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [keyPage, setKeyPage] = useState<number | null>(null);
  const group = collection.groups.find(item => item.id === groupId)!;
  const groupTracks = tracks.filter(file => file.relativePath.startsWith(`Audio/${group.title}/`)).sort(sortNames);
  const selectedTrack = groupTracks.find(file => file.id === trackId) ?? groupTracks[0];
  const book = books.find(file => file.name.startsWith(skill === 'listening' ? 'Listening' : 'Reading'))!;
  const source = (file: Asset) => localUrls[file.id] ?? (gatewayAllowed && gateway === 'ready' ? localSourceFileUrl(file.sourceRelativePath) : undefined);
  const bookUrl = source(book);
  const audioUrl = selectedTrack ? source(selectedTrack) : undefined;
  const page = skill === 'listening' ? (showAnswers ? keyPage ?? group.answerPage : group.questionPage) : 2;
  useEffect(() => () => { Object.values(urls.current).forEach(URL.revokeObjectURL); }, []);
  const connect = async () => {
    if (!gatewayAllowed) return;
    setGateway('checking');
    try {
      const response = await fetch(`${LOCAL_SOURCE_GATEWAY_ORIGIN}/health`, { signal: AbortSignal.timeout(5000) });
      const status = await response.json();
      // Check an actual collection file too, so an unrelated mounted source root is not "connected".
      const sample = await fetch(localSourceFileUrl(books[0].sourceRelativePath), { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      setGateway(response.ok && status.available && sample.ok ? 'ready' : 'unavailable');
    } catch { setGateway('unavailable'); }
  };
  const selectFiles = (files: FileList | null) => {
    let count = 0;
    for (const file of Array.from(files ?? [])) {
      const path = file.webkitRelativePath || file.name;
      const matches = collection.files.filter(asset => file.size === asset.bytes && (path.endsWith(asset.relativePath) || (asset.mimeType === 'application/pdf' && file.name === asset.name)));
      if (matches.length !== 1) continue;
      const id = matches[0].id;
      if (urls.current[id]) URL.revokeObjectURL(urls.current[id]);
      urls.current[id] = URL.createObjectURL(file); count++;
    }
    setLocalUrls({ ...urls.current });
    setFileMessage(`${count} matching files connected. Files stay on your device; nothing is uploaded. Select them again after a reload.`);
  };
  return <div className="page-section official-exams jahshan-page">
    <section className="card"><span className="section-kicker">YOUR JAHSHAN COLLECTION</span><h2>Books and original listening tracks, together</h2><p>90 audio tracks across 25 available sets, plus the complete Reading and Listening PDFs. Follow the numbered collection index to match the paper and recording. These mixed-publisher materials are for source-guided study; use <a href="#mock">official paper mocks</a> for the verified full-test workflow.</p><p className="meta">Archive checked on {collection.checkedAt}. Set 8, Practice Test 4, has no audio in the supplied Drive folder.</p></section>
    <section className="card">
      <h3>1 · Choose your files from GENODODI</h3>
      <p>Click “Choose Jahshan folder”, then select GENODODI → oet-study-sources → Google drive Folder → Jahshan. This opens your original recordings and books directly in your browser. Nothing is uploaded.</p>
      <p className="meta">You can also select the two PDFs from Downloads. After reloading this page, choose your files again; your saved practice notes remain.</p>
      <label>Choose Jahshan folder <input type="file" {...{ webkitdirectory: '' }} multiple onChange={event => selectFiles(event.target.files)} /></label>
      <p><label>Choose Reading / Listening PDFs <input type="file" accept="application/pdf" multiple onChange={event => selectFiles(event.target.files)} /></label></p>
      {fileMessage && <p role="status">{fileMessage}</p>}
      {gatewayAllowed && <details><summary>Connect through the local app</summary><button className="btn btn-secondary" disabled={gateway === 'checking'} onClick={() => void connect()}>{gateway === 'checking' ? 'Connecting…' : 'Connect GENODODI'}</button><p role="status">{gateway === 'ready' ? 'GENODODI collection is connected.' : gateway === 'unavailable' ? 'The local connection is unavailable. Choose your files above.' : 'The local app can also use the read-only GENODODI connection.'}</p></details>}
      <div className="study-source-links">{books.map(file => <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer">{file.name} ↗</a>)}<a href={collection.sourceUrl} target="_blank" rel="noopener noreferrer">Original audio folder ↗</a></div>
    </section>
    <section className="card"><h3>2 · Choose your practice</h3><div className="study-skill-tabs"><button aria-pressed={skill === 'listening'} onClick={() => { setSkill('listening'); setShowAnswers(false); }}>Listening collection</button><button aria-pressed={skill === 'reading'} onClick={() => { setSkill('reading'); setShowAnswers(false); }}>Reading collection</button></div>{skill === 'listening' ? <><label htmlFor="jahshan-set">Listening set</label><select id="jahshan-set" value={groupId} onChange={event => { setGroupId(event.target.value); setTrackId(''); setShowAnswers(false); setKeyPage(null); }}>{collection.groups.map(item => <option key={item.id} value={item.id}>{item.title}{item.audioMissing ? ' — audio missing' : ''}</option>)}</select><p>Question page {group.questionPage} · Answer page {group.answerPage} in the Listening collection.</p>{group.audioMissing ? <p role="alert">The source contains only a missing-audio notice for this set. Choose another set for listening practice.</p> : <><label htmlFor="jahshan-track">Recording</label><select id="jahshan-track" value={selectedTrack?.id ?? ''} onChange={event => { setTrackId(event.target.value); setShowAnswers(false); setKeyPage(null); }}>{groupTracks.map(file => <option key={file.id} value={file.id}>{file.relativePath.split('/').slice(2).join(' / ')}</option>)}</select>{selectedTrack && <JahshanListeningPlayer track={selectedTrack} audioUrl={audioUrl} />}{selectedTrack && <a href={selectedTrack.url} target="_blank" rel="noopener noreferrer">Open selected original recording in Drive ↗</a>}</>}</> : <p>Choose a Reading paper below. Your last test, answers and review progress are saved automatically.</p>}</section>
    {skill === 'reading' ? <JahshanReadingWorkspace bookUrl={bookUrl} /> : <>
    <div className="jahshan-listening-workbench"><section className="card"><h3>3 · Work with the original paper</h3>{skill === 'listening' && <button className="btn btn-secondary" onClick={() => setShowAnswers(value => !value)}>{showAnswers ? 'Return to questions' : 'Review answer pages'}</button>}{bookUrl ? <><p><a href={`${bookUrl}#page=${page}`} target="_blank" rel="noopener noreferrer">Open {skill} PDF at page {page} ↗</a></p><iframe key={`${book.id}-${page}-${bookUrl}`} title={`Jahshan ${skill} collection`} src={`${bookUrl}#page=${page}`} style={{ width: '100%', height: '75vh', border: 0 }} /><p className="meta">If the preview is blank, open the PDF in a new tab or your PDF reader and go to page {page}.</p></> : <p>Connect the files in step 1 to open the book here. The Drive links remain available above.</p>}</section>
    {selectedTrack && <JahshanListeningWorksheet trackId={selectedTrack.id} bookUrl={bookUrl} onOpenKey={page => { setKeyPage(page); setShowAnswers(true); }} />}
    </div>
    <PracticeNotes key={groupId} storageKey={`oet-jahshan-notes-listening-${groupId}`} />
    </>}
  </div>;
}
