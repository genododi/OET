import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MaterialPracticePaper } from './MaterialPracticePaper';
import type { MaterialSheet } from '../lib/materialPractice';

const sha='a'.repeat(64), audioSha='b'.repeat(64), passageSha='c'.repeat(64);
const file={id:'source',sha256:sha,filename:'Question booklet.pdf',format:'pdf',assetPath:'source.pdf',textPath:'questions.json'};
const sheet:MaterialSheet={version:1,sourceSha256:sha,documents:[{...file,role:'paper'},{...file,id:'passage',sha256:passageSha,filename:'Text booklet.pdf',textPath:'passage.json',role:'paper'},{...file,id:'recording',sha256:audioSha,filename:'Original test.mp3',format:'mp3',assetPath:'original.mp3',role:'recording'}],units:[
  {id:'part-a',label:'Test · Part A',part:'A',sourceSha256:sha,pages:[3,4],skills:['reading','listening'],recordings:[audioSha],passages:[{sourceSha256:passageSha,pages:[1,2]}],answerSources:[],questions:[{number:1,prompt:'Patient takes (1) … for the symptoms.',sourcePage:3,choices:[],kind:'blank',answer:{text:'printed medicine',page:8,source:{...file,filename:'Supplied key.pdf'}}}]},
  {id:'part-b',label:'Test · Part B',part:'B',sourceSha256:sha,pages:[5],skills:['reading','listening'],recordings:[audioSha],answerSources:[],questions:[{number:1,prompt:'What does the nurse recommend?\nA. A follow-up\nB. No action',sourcePage:5,choices:['A','B'],kind:'question',answer:{text:'A',page:8,source:{...file,filename:'Supplied key.pdf'}}}]},
]};
const props={file,skill:'reading' as const,onAnswers:vi.fn(),onQuestionMode:vi.fn(),onContext:vi.fn()};
beforeEach(()=>{
  localStorage.clear();
  vi.stubGlobal('fetch',vi.fn(async (url:string)=>({ok:true,json:async()=>url.includes('/sheets/')?sheet:url.includes('/transcripts/')?{trackId:`material-${audioSha}`,sourceSha256:audioSha,kind:'automatic-transcription',segments:[{start:0,end:5,text:'Part A.'},{start:50,end:55,text:'Now look at Part B.'}]}:url.endsWith('passage.json')?{text:'Full passage',pages:[{number:1,text:'Complete reading text A.'},{number:2,text:'Complete reading text B.'}]}:{text:'Question pages',pages:Array.from({length:8},(_,i)=>({number:i+1,text:`Original page ${i+1}`}))}})));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it('shows the complete matched reading passage and keeps each printed answer beside its question without replacing the attempt',async()=>{
  const view=render(<MaterialPracticePaper {...props} />);
  await screen.findByText('Complete reading text A.');
  expect(screen.getByText('Complete reading text B.')).toBeVisible();
  expect(screen.getByText('Original page 3')).toBeVisible();expect(screen.getByText('Original page 4')).toBeVisible();
  expect(screen.queryByText('Original page 8')).toBeNull();
  const row=screen.getByRole('article',{name:'Question 1'});
  fireEvent.change(within(row).getByRole('textbox'),{target:{value:'my attempt'}});
  fireEvent.click(within(row).getByRole('button',{name:'Show answer for Question 1'}));
  expect(within(row).getByText(/printed medicine/)).toBeVisible();
  expect(within(row).getByRole('textbox')).toHaveValue('my attempt');
  fireEvent.click(screen.getByRole('button',{name:'Part B'}));
  fireEvent.change(screen.getByRole('combobox',{name:'Question 1'}),{target:{value:'B'}});
  fireEvent.click(screen.getByRole('button',{name:'Part A'}));
  expect(screen.getByRole('textbox',{name:'Question 1'})).toHaveValue('my attempt');
  expect(screen.queryByText(/printed medicine/)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Reveal all'}));expect(screen.getByText(/printed medicine/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Hide all'}));expect(screen.queryByText(/printed medicine/)).toBeNull();
  view.unmount();render(<MaterialPracticePaper {...props} />);await screen.findByText('Complete reading text A.');
  expect(screen.getByRole('textbox',{name:'Question 1'})).toHaveValue('my attempt');
});

it('changes the visible questions with the playing audio part and keeps the matching timed transcript',async()=>{
  const view=render(<MaterialPracticePaper {...props} skill="listening" />);
  await screen.findByText('Part A.');
  expect(view.container.querySelector('audio source')).toHaveAttribute('type','audio/mpeg');
  const audio=view.container.querySelector('audio')!;
  Object.defineProperty(audio,'duration',{value:120,configurable:true});fireEvent.loadedMetadata(audio);
  fireEvent.play(audio);fireEvent.timeUpdate(audio,{target:{currentTime:52}});
  await screen.findByText(/What does the nurse recommend/);
  expect(screen.getByRole('button',{name:'Part B'})).toHaveAttribute('aria-pressed','true');
  expect(view.container.querySelector('audio')).toBe(audio);
  expect(screen.getByRole('button',{name:'0:50 Now look at Part B.'})).toHaveAttribute('aria-current','true');
});

it('rejects a practice sheet belonging to a different original',async()=>{
  vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({...sheet,sourceSha256:'wrong'})} as Response);
  render(<MaterialPracticePaper {...props} />);
  await screen.findByText(/no confidently extracted numbered questions/);
  expect(screen.queryByRole('article',{name:'Question 1'})).toBeNull();
});

it('restores the selected part and seeks after its recording metadata is ready',async()=>{
  localStorage.setItem(`oet-material-unit-v1:${sha}:listening`,'part-b');
  const view=render(<MaterialPracticePaper {...props} skill="listening" />);
  await screen.findByText('Now look at Part B.');
  const audio=view.container.querySelector('audio')!;
  Object.defineProperty(audio,'duration',{value:120,configurable:true});fireEvent.loadedMetadata(audio);
  expect(audio.currentTime).toBe(50);
  expect(screen.getByRole('button',{name:'Part B'})).toHaveAttribute('aria-pressed','true');
});
