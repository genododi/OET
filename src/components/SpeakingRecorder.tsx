import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeakingCriteria } from '../types/session';
import { evaluateSpeakingResponse, speakingPassClass, type SpeakingEvaluationResult } from '../lib/speakingEvaluation';

interface Props {
  taskId: string;
  criteria: SpeakingCriteria;
  onResult?: (result: SpeakingEvaluationResult | null) => void;
  /** When true, parent renders full rubric review — hide duplicate feedback */
  showDetailedReview?: boolean;
}

type RecorderState = 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported';

interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function SpeakingRecorder({ taskId, criteria, onResult, showDetailedReview = false }: Props) {
  const [state, setState] = useState<RecorderState>('idle');
  const [transcript, setTranscript] = useState('');
  const [fallbackText, setFallbackText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [evalResult, setEvalResult] = useState<SpeakingEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptPartsRef = useRef<string[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioUrlRef = useRef<string | null>(null);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeAudioUrl();
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
    };
  }, [revokeAudioUrl]);

  const runEvaluation = useCallback(
    (text: string, duration: number, usedFallback: boolean) => {
      const result = { ...evaluateSpeakingResponse(text, duration, criteria, usedFallback), transcript: text };
      setEvalResult(result);
      onResult?.(result);
    },
    [criteria, onResult],
  );

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    setDurationSeconds(elapsed);
    setState('recorded');
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setEvalResult(null);
    onResult?.(null);
    transcriptPartsRef.current = [];
    setTranscript('');
    revokeAudioUrl();
    setAudioUrl(null);
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      setErrorMsg('Recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        revokeAudioUrl();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);

        const finalTranscript = transcriptPartsRef.current.join(' ').trim();
        setTranscript(finalTranscript);
        const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        setDurationSeconds(elapsed);
        if (finalTranscript) {
          runEvaluation(finalTranscript, elapsed, false);
        }
      };

      const SpeechRecognition = getSpeechRecognitionCtor();
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-AU';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = 0; i < event.results.length; i += 1) {
            const part = event.results[i][0]?.transcript ?? '';
            if (i >= transcriptPartsRef.current.length) {
              transcriptPartsRef.current.push(part);
            } else {
              transcriptPartsRef.current[i] = part;
            }
            interim += part;
          }
          setTranscript(interim.trim());
        };
        recognition.onerror = () => {
          /* transcript may still be partial — evaluation runs on stop */
        };
        recognitionRef.current = recognition;
        recognition.start();
      }

      recorder.start();
      setState('recording');
    } catch {
      setState('denied');
      setErrorMsg(
        'Microphone access was denied. You can type what you would say below and evaluate from text instead.',
      );
    }
  };

  const evaluateFallback = () => {
    const text = fallbackText.trim();
    if (!text) return;
    setTranscript(text);
    const estDuration = Math.max(30, Math.round((text.split(/\s+/).length / 120) * 60));
    setDurationSeconds(estDuration);
    runEvaluation(text, estDuration, true);
    setState('recorded');
  };

  const scoreClass = evalResult ? speakingPassClass(evalResult) : '';

  return (
    <div className="speaking-recorder">
      <div className="speaking-recorder-controls">
        {state === 'recording' ? (
          <button type="button" className="btn btn-primary btn-sm speaking-record-btn" onClick={stopRecording}>
            ■ Stop recording
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm speaking-record-btn"
            onClick={startRecording}
            disabled={state === 'unsupported'}
          >
            ● Record response
          </button>
        )}
        {(state === 'recorded' || audioUrl) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setState('idle');
              setEvalResult(null);
              onResult?.(null);
              revokeAudioUrl();
              setAudioUrl(null);
              setTranscript('');
            }}
          >
            Re-record
          </button>
        )}
        {state === 'recording' && (
          <span className="speaking-recording-indicator" aria-live="polite">
            Recording… speak clearly toward your microphone
          </span>
        )}
      </div>

      {errorMsg && <p className="speaking-error meta">{errorMsg}</p>}

      {audioUrl && (
        <div className="speaking-playback">
          <label htmlFor={`playback-${taskId}`}>Playback</label>
          <audio id={`playback-${taskId}`} controls src={audioUrl} className="speaking-audio" />
        </div>
      )}

      {transcript && (
        <div className="speaking-transcript">
          <strong>Transcript</strong>
          <p>{transcript}</p>
        </div>
      )}

      {(state === 'denied' || state === 'unsupported') && (
        <div className="speaking-fallback">
          <label htmlFor={`fallback-${taskId}`}>Type your spoken response</label>
          <textarea
            id={`fallback-${taskId}`}
            rows={4}
            value={fallbackText}
            onChange={(e) => setFallbackText(e.target.value)}
            placeholder="Write what you would say to the patient…"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!fallbackText.trim()}
            onClick={evaluateFallback}
          >
            Evaluate text
          </button>
        </div>
      )}

      {state === 'recorded' && !transcript && !evalResult && (
        <div className="speaking-fallback">
          <p className="meta">
            No speech was detected. Check your microphone, or type your response below.
          </p>
          <label htmlFor={`fallback-empty-${taskId}`}>Type your spoken response</label>
          <textarea
            id={`fallback-empty-${taskId}`}
            rows={4}
            value={fallbackText}
            onChange={(e) => setFallbackText(e.target.value)}
            placeholder="Write what you would say to the patient…"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!fallbackText.trim()}
            onClick={evaluateFallback}
          >
            Evaluate text
          </button>
        </div>
      )}

      {evalResult && !showDetailedReview && (
        <div className={`speaking-feedback ${scoreClass}`}>
          <p className="speaking-score">
            Score: <strong>{evalResult.score}%</strong>
            {evalResult.examReady && (
              <span className="oet-badge oet-badge-exam-ready oet-badge-sm"> Strong practice</span>
            )}
            {!evalResult.examReady && evalResult.practicePass && (
              <span className="oet-badge oet-badge-pass oet-badge-sm"> Practice pass</span>
            )}
            {!evalResult.practicePass && (
              <span className="oet-badge oet-badge-fail oet-badge-sm"> Needs work</span>
            )}
            <span className="speaking-fluency">
              · {evalResult.wordsPerMinute} words/min · {evalResult.wordCount} words
              {durationSeconds > 0 && !evalResult.usedFallback && ` · ${durationSeconds}s recorded`}
            </span>
          </p>
          <p className="speaking-suggestion">{evalResult.suggestion}</p>
        </div>
      )}

      {evalResult && showDetailedReview && (
        <p className="meta speaking-recorded-note">
          Response recorded — see rubric review below.
          {evalResult.examReady ? ' Exam-ready.' : evalResult.practicePass ? ' Practice pass.' : ' Keep practising.'}
        </p>
      )}
    </div>
  );
}
