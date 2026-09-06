import { useEffect, useRef, useState } from 'react';

interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}

export function MentorVoiceControls({ onDictation, reply, disabled }: { onDictation: (text: string) => void; reply: string; disabled: boolean }) {
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechWindow = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const RecognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  const hasSpeech = typeof window.speechSynthesis !== 'undefined';
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.abort(); }
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; window.speechSynthesis?.cancel(); }
  }, []);
  const dictate = () => {
    if (recording) { recognitionRef.current?.stop(); return; }
    if (!RecognitionCtor) return;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    const recognition = new RecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = 'en-GB'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ');
      onDictation(text);
      setNotice('Transcript ready. Check the words, then send your message.');
    };
    recognition.onerror = () => { setRecording(false); setNotice('Voice input was unavailable or permission was denied. You can type your message.'); };
    recognition.onend = () => setRecording(false);
    try { recognition.start(); setRecording(true); setNotice('Listening…'); }
    catch { setNotice('Could not start voice input. You can type instead.'); }
  };
  const read = () => {
    if (!hasSpeech) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    recognitionRef.current?.stop();
    const utterance = new SpeechSynthesisUtterance(reply.slice(0, 10000));
    speechRef.current = utterance;
    utterance.lang = 'en-GB'; utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false); setNotice('Spoken playback is unavailable. The reply is shown above.'); };
    window.speechSynthesis.speak(utterance); setSpeaking(true);
  };
  return <div className="mentor-voice">
    <div className="mentor-voice-actions">
      <button type="button" className="btn btn-ghost btn-sm" onClick={dictate} disabled={disabled || !RecognitionCtor}>{recording ? 'Stop voice input' : 'Use voice input'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={read} disabled={!hasSpeech || !reply || disabled}>{speaking ? 'Stop reading aloud' : 'Read reply aloud'}</button>
    </div>
    <small>{RecognitionCtor ? 'Voice input uses your browser’s speech service; review the transcript before sending.' : 'Voice input is not supported here. Type your message below.'}</small>
    {notice && <p className="meta" role="status">{notice}</p>}
  </div>;
}
