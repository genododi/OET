import collection from '../data/jahshanCollection.json';
import { RecordingTranscriptPlayer } from './RecordingTranscriptPlayer';
import keys from '../data/jahshanListeningAnswers.json';
type Track = (typeof collection.files)[number];
export function JahshanListeningPlayer({ track, audioUrl, selectedPart, partSelection }: { track: Track; audioUrl?: string; selectedPart?: 'A' | 'B' | 'C'; partSelection?: number }) {
  return <RecordingTranscriptPlayer track={track}
    offlineAudioUrl={`${import.meta.env.BASE_URL}jahshan-audio/${track.id}.m4a`}
    offlineAssets={[...new Set(keys.worksheets.find(sheet => sheet.trackId === track.id)?.parts.flatMap(part => part.questions.map(question => question.keyPage)) ?? [])].map(page => ({ url: `${import.meta.env.BASE_URL}jahshan-listening-keys/${page}.webp`, label: `Printed key · page ${page}` }))}
    audioUrl={audioUrl ?? `${import.meta.env.BASE_URL}jahshan-audio/${track.id}.m4a`}
    transcriptPath={`jahshan-transcripts/${track.id}.json`}
    selectedPart={selectedPart}
    partSelection={partSelection}
    heading="2 · Listen to the recording"
    description={track.relativePath.split('/').slice(1).join(' / ')}
    playbackNote={`Press Play above. ${audioUrl ? 'Playing your connected original file.' : 'Audio streams directly from this site; no drive connection or file selection is needed.'}`} />;
}
