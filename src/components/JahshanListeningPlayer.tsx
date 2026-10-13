import collection from '../data/jahshanCollection.json';
import { RecordingTranscriptPlayer } from './RecordingTranscriptPlayer';
type Track = (typeof collection.files)[number];
export function JahshanListeningPlayer({ track, audioUrl }: { track: Track; audioUrl?: string }) {
  return <RecordingTranscriptPlayer track={track}
    audioUrl={audioUrl ?? `${import.meta.env.BASE_URL}jahshan-audio/${track.id}.m4a`}
    transcriptPath={`jahshan-transcripts/${track.id}.json`}
    heading="2 · Listen to the recording"
    description={track.relativePath.split('/').slice(1).join(' / ')}
    playbackNote={`Press Play above. ${audioUrl ? 'Playing your connected original file.' : 'Audio streams directly from this site; no drive connection or file selection is needed.'}`} />;
}
