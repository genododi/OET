// Bounded synthetic OET checks against a real offline model; no learner data leaves this Mac.
import { LocalMentor } from '../desktop/mentor.mjs';
import { MEDICAL_COACH_POLICY } from '../src/lib/oetMedicalCoach.ts';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const state=process.env.OET_MENTOR_EVAL_OUTPUT || path.join(os.homedir(),'Library/Application Support/OET Study/library-sync');
await fs.mkdir(state,{recursive:true});
const log=await fs.mkdtemp(path.join(os.tmpdir(),'oet-mentor-eval-'));
const mentor=new LocalMentor(process.env.OET_MENTOR_EVAL_MODEL || path.join(os.homedir(),'Library/Application Support/OET Study/local-ai'),log);
const cases=[
 {id:'diagnostic-uncertainty',prompt:'Synthetic OET case: Chris Lee is referred for assessment of suspected asthma; no diagnosis is confirmed. Learner: "Chris Lee has confirmed asthma." Give one precise correction and a source-faithful replacement in fewer than 90 words. Do not ask a question.',required:[/suspect|not confirmed|not yet confirmed/i,/asthma/i]},
 {id:'allergy-scope',prompt:'Synthetic OET writing notes: allergy to penicillin. Learner: "She is allergic to all antibiotics." Correct this meaning error and give a source-faithful sentence in fewer than 90 words. Do not add treatment advice or ask questions.',required:[/penicillin/i,/all antibiotics|allergy.*scope|broader|other antibiotics|too broad/i]},
 {id:'reading-source-over-clinical-expectation',prompt:'Synthetic OET Reading source: "Staff must report a medication error to the ward manager before the end of the shift." Question: To whom must it be reported? Learner answered: "The prescribing doctor." Explain the source evidence and correct response in fewer than 90 words. No questions or invented official grade.',required:[/ward manager/i,/shift|report/i]}
];
const results=[];
try {for(const test of cases){const began=Date.now();const response=await mentor.reply(new Request('oet://study/OET/desktop/ai/chat',{method:'POST',signal:AbortSignal.timeout(240000),body:JSON.stringify({messages:[{role:'system',content:MEDICAL_COACH_POLICY},{role:'user',content:test.prompt}],temperature:0,careful:true,max_tokens:450})}));assert.equal(response.status,200);const data=await response.json();const text=data.choices?.[0]?.message?.content??'';const passed=test.required.every(re=>re.test(text))&&!text.includes('?')&&data.choices?.[0]?.finish_reason!=='length';results.push({id:test.id,passed,seconds:(Date.now()-began)/1000,response:text});console.log(JSON.stringify(results.at(-1)));assert(passed,test.id+' failed');}await fs.writeFile(path.join(state,'mentor-quality-evaluation.json'),JSON.stringify({checkedAt:new Date().toISOString(),model:mentor.config(),reasoningBudget:768,network:'local loopback inference only; no API or private data upload',syntheticCases:true,results},null,2)+'\n');}finally{mentor.stop();}
