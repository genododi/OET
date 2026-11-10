import type { OetSubtest } from '../types';
import type { MaterialSheet } from './materialPractice';

export interface ReviewQuestion { id:string; prompt:string; response:string; key?:string; evidence?:string }
export interface TestReviewSnapshot { title:string; skill:OetSubtest; questions:ReviewQuestion[]; responseText?:string; sourceText?:string; limitations:string[] }
export function savedObject(key:string,storage:Pick<Storage,'getItem'>=localStorage):Record<string,unknown> { try {const value=JSON.parse(storage.getItem(key) ?? '{}');return value && typeof value==='object' && !Array.isArray(value)?value:{};}catch{return {};} }
const stringValue=(value:unknown)=>typeof value==='string'?value:'';
export async function sourceJson<T>(asset:string):Promise<T> {const response=await fetch(`${import.meta.env.BASE_URL}${asset}`,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('The selected test source could not load.');return response.json();}
async function text(asset:string) {const value=await sourceJson<{text?:string;pages?:{text:string}[]}>(asset);return value.text ?? value.pages?.map(page=>page.text).join('\n\n') ?? '';}

/** Read the whole completed test from its own answer store, never the last open task. */
export async function buildTestReviewSnapshot(id:string,title:string,storage:Pick<Storage,'getItem'>=localStorage):Promise<TestReviewSnapshot|null> {
  const read=(key:string)=>savedObject(key,storage);
  if(id.startsWith('collection-test:benchmark:')) {
    const entryId=id.slice('collection-test:benchmark:'.length), saved=read(`oet-benchmark-v1:${entryId}`);
    if(entryId==='speaking-pregnancy')return {title,skill:'speaking',questions:[],responseText:stringValue(saved.notes),sourceText:'GP consultation: a 17-year-old patient suspects unexpected pregnancy. Explore concerns, explain the referral and check understanding. No confirmed appointment or investigation is supplied.',limitations:['Only the typed transcript or notes are available. Pronunciation and voice quality cannot be assessed.']};
    const catalog=(await import('../data/benchmarkCollection.json')).default;
    const entry=catalog.entries.find(entry=>entry.id===entryId);if(!entry)return null;
    const source=await text(entry.textPath);
    if(entry.skill==='writing')return {title,skill:'writing',questions:[],responseText:stringValue(saved.letter),sourceText:source,limitations:[]};
    const sheet=await sourceJson<{questions:{part:string;number:number;prompt:string}[]}>(`benchmark/questions/${entryId}.json`);
    const keys=(entry as {answers?:Record<string,string>}).answers ?? {};
    return {title,skill:entry.skill as OetSubtest,questions:sheet.questions.map(q=>({id:`${q.part}-${q.number}`,prompt:q.prompt,response:stringValue(saved[`${q.part}-${q.number}`]),key:keys[String(q.number)]})),sourceText:source,limitations:entry.skill==='listening'?['Review uses the supplied paper and printed key, not an analysis of the learner’s listening or the audio.']:[]};
  }
  if(id.startsWith('collection-test:jahshan:reading:')) {
    const number=Number(id.slice('collection-test:jahshan:reading:'.length));
    const data=(await import('../data/jahshanReadingQuestions.json')).default;
    const test=data.tests.find(test=>test.number===number);if(!test)return null;
    const state=read('oet-jahshan-reading-workspace-v1'),draft=(state.drafts as Record<string,{responses?:Record<string,string>}>|undefined)?.[number];
    return {title,skill:'reading',questions:test.sections.flatMap(section=>section.questions.map(q=>({id:q.id,prompt:`Part ${section.part}: ${q.prompt}`,response:draft?.responses?.[q.id] ?? '',key:q.answer ?? undefined,evidence:q.sourceText ?? undefined}))),limitations:[]};
  }
  if(id.startsWith('collection-test:jahshan:listening:')) {
    const groupId=id.slice('collection-test:jahshan:listening:'.length);
    const collection=(await import('../data/jahshanCollection.json')).default,group=collection.groups.find(g=>g.id===groupId);if(!group)return null;
    const tracks=new Set(collection.files.filter(file=>file.relativePath.startsWith(`Audio/${group.title}/`)).map(file=>file.id));
    const keys=(await import('../data/jahshanListeningAnswers.json')).default;
    const papers=(await import('../data/jahshanListeningQuestions.json')).default;
    const questions:ReviewQuestion[]=[];const sources:string[]=[];
    for(const sheet of keys.worksheets.filter(sheet=>tracks.has(sheet.trackId))) {
      const responses=read(`oet-jahshan-listening-blanks-v1-${sheet.trackId}`);
      for(const part of sheet.parts) {
        const printed=papers.worksheets.find(item=>item.trackId===sheet.trackId)?.parts.find(item=>item.part===part.part);
        sources.push(printed?.content.map(node=>node.text).join('') ?? '');
        questions.push(...part.questions.map(q=>({id:`${sheet.trackId}:${q.id}`,prompt:`Part ${part.part}, Question ${q.number}`,response:stringValue(responses[q.id]),key:q.answer || undefined})));
      }
    }
    return {title,skill:'listening',questions,sourceText:sources.join('\n\n'),limitations:['The mentor has the printed questions and key. It has not listened to the recording and must not invent a spoken quotation.']};
  }
  const productive=/^collection-test:jahshan:(writing|speaking):(\d+)$/.exec(id);
  if(productive) {
    const skill=productive[1] as 'writing'|'speaking',sample=productive[2];
    return {title,skill,questions:[],responseText:storage.getItem(`jahshan-${skill}-sample-${sample}`) ?? '',sourceText:await text(`official-exam-text/sample-${sample}-${skill==='speaking'?'speaking-candidate':'writing'}.json`),limitations:skill==='speaking'?['This is a text review; pronunciation and voice quality are not available.']:[]};
  }
  const materialUnit=/^material-unit:([a-f0-9]{64}):([^:]+):(reading|listening|writing|speaking)$/.exec(id);
  const sha=materialUnit?.[1] ?? (/^[a-f0-9]{64}$/.test(id)?id:null);if(!sha)return null;
  const catalogs=await Promise.all([import('../data/desktopMaterials.generated.json').then(data=>data.default.files),sourceJson<{files:{id:string;sha256:string;filename:string;textPath:string}[]}>('imported-resources/catalog.json').then(data=>data.files)]);
  const file=catalogs.flat().find(file=>file.sha256===sha);if(!file)return null;
  const sheet=await sourceJson<MaterialSheet>(`material-practice/sheets/${sha}.json`);
  const units=sheet.units.filter(unit=>!materialUnit || unit.id===materialUnit[2]);
  const questions:ReviewQuestion[]=[];const responses:string[]=[];let skill:OetSubtest=(materialUnit?.[3] as OetSubtest|undefined) ?? 'reading';
  for(const unit of units)for(const currentSkill of unit.skills) {
    if(materialUnit && currentSkill!==materialUnit[3])continue;
    const answers=read(`oet-material-answers-v1:${unit.sourceSha256}:${currentSkill}:${unit.id}`);
    const draft=read(`oet-supplied-v1:${file.id}:${currentSkill}:${unit.id}`);
    if(Object.values(answers).some(value=>stringValue(value).trim())||stringValue(draft.response).trim())skill=currentSkill;
    questions.push(...unit.questions.map(q=>({id:`${unit.id}:${q.number}`,prompt:q.prompt,response:stringValue(answers[String(q.number)]),key:q.answer?.text})));
    if(!unit.questions.length && stringValue(draft.response).trim())responses.push(`${unit.label}\n${draft.response}`);
  }
  if(!responses.length&&!questions.some(q=>q.response.trim()))for(const currentSkill of ['reading','listening','writing','speaking'] as const) {
    const draft=read(`oet-supplied-v1:${file.id}:${currentSkill}`);
    if(stringValue(draft.response).trim()){responses.push(stringValue(draft.response));skill=currentSkill;}
  }
  const documents=sheet.documents.filter(document=>units.some(unit=>unit.sourceSha256===document.sha256));
  const sources=await Promise.all(documents.slice(0,3).map(async document=>{
    try{
      const payload=await sourceJson<{text?:string;pages?:{number:number;text:string}[]}>(document.textPath);
      const related=units.filter(unit=>unit.sourceSha256===document.sha256);
      return payload.pages ? payload.pages.filter(page=>related.some(unit=>unit.pages.includes(page.number))).map(page=>{
        const ranges=related.flatMap(unit=>unit.ranges?.filter(range=>range.page===page.number) ?? []);
        return ranges.length?ranges.map(range=>page.text.slice(range.start,range.end)).join('\n'):page.text;
      }).join('\n\n') : payload.text ?? '';
    }catch{return '';}
  }));
  const unique=new Map<string,ReviewQuestion>();
  for(const question of questions)if(!unique.get(question.id)?.response || question.response)unique.set(question.id,question);
  return {title,skill,questions:[...unique.values()],responseText:responses.join('\n\n'),sourceText:sources.join('\n\n'),limitations:['Only supplied text and explicit printed keys may be used. Missing keys are not permission to invent correct answers.']};
}
