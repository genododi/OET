import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RecordingTranscriptPlayer } from './RecordingTranscriptPlayer';
const track={id:'test',name:'Test recording',sha256:'source-hash',url:'audio/test.mp3'};
const transcript={trackId:track.id,sourceSha256:track.sha256,kind:'automatic-transcription',segments:[{start:0,end:5,text:'First sentence.'},{start:5,end:10,text:'Later sentence.'}]};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('follows seeking while paused and recentres when follow is enabled again',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const view=render(<RecordingTranscriptPlayer track={track} audioUrl="audio/test.mp3" transcriptPath="" inlineTranscript={transcript} />);
 const audio=view.container.querySelector('audio')!;
 const box=view.container.querySelector('.transcript-box')!;
 const line=screen.getByRole('button',{name:'0:05 Later sentence.'});
 const scroll=vi.fn();Object.defineProperty(box,'scrollTo',{value:scroll});Object.defineProperty(box,'clientHeight',{value:300});
 vi.spyOn(box,'getBoundingClientRect').mockReturnValue({top:0,bottom:300,height:300} as DOMRect);
 vi.spyOn(line,'getBoundingClientRect').mockReturnValue({top:600,bottom:650,height:50} as DOMRect);
 Object.defineProperty(audio,'duration',{value:60,configurable:true});fireEvent.loadedMetadata(audio);
 fireEvent.seeked(audio,{target:{currentTime:6}});
 expect(audio.paused).toBe(true);
 expect(line).toHaveAttribute('aria-current','true');
 expect(scroll).toHaveBeenLastCalledWith({top:475,behavior:'auto'});
 fireEvent.click(screen.getByRole('checkbox',{name:'Follow the audio'}));scroll.mockClear();
 fireEvent.timeUpdate(audio,{target:{currentTime:7}});expect(scroll).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox',{name:'Follow the audio'}));expect(scroll).toHaveBeenCalledOnce();
 expect(fetcher).not.toHaveBeenCalled();
});
it('refuses an offline transcript belonging to another recording',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 render(<RecordingTranscriptPlayer track={track} audioUrl="audio/test.mp3" transcriptPath="" inlineTranscript={{...transcript,sourceSha256:'other-source'}} />);
 expect(screen.queryByText('First sentence.')).not.toBeInTheDocument();
 expect(screen.getByRole('status')).toHaveTextContent('unavailable');
 expect(fetcher).not.toHaveBeenCalled();
});
it('jumps to the selected part and its matching transcript lines', () => {
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const sectional={...transcript,segments:[
  {start:0,end:8,text:'Opening instructions.'},
  {start:12,end:16,text:'Part A.'},
  {start:17,end:22,text:'In this part of the test, you hear a consultation.'},
  {start:48,end:52,text:'Now, look at Part B.'},
  {start:53,end:58,text:'Part B. In this part of the test, you hear six extracts.'},
  {start:90,end:95,text:'Now look at Part C.'},
  {start:96,end:101,text:'Part C. In this part of the test, you hear two interviews.'},
 ]};
 const view=render(<RecordingTranscriptPlayer track={track} audioUrl="audio/test.mp3" transcriptPath="" inlineTranscript={sectional} selectedPart="A" partSelection={0} />);
 const audio=view.container.querySelector('audio')!;Object.defineProperty(audio,'duration',{value:120,configurable:true});fireEvent.loadedMetadata(audio);
 view.rerender(<RecordingTranscriptPlayer track={track} audioUrl="audio/test.mp3" transcriptPath="" inlineTranscript={sectional} selectedPart="B" partSelection={1} />);
 expect(audio.currentTime).toBe(48);
 expect(screen.getByRole('button',{name:'0:48 Now, look at Part B.'})).toHaveAttribute('aria-current','true');
 view.rerender(<RecordingTranscriptPlayer track={track} audioUrl="audio/test.mp3" transcriptPath="" inlineTranscript={sectional} selectedPart="C" partSelection={2} />);
 expect(audio.currentTime).toBe(90);
 expect(fetcher).not.toHaveBeenCalled();
});
