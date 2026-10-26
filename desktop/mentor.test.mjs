import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalMentor } from './mentor.mjs';

test('local evidence editing accepts deterministic sampling while bounding caller settings', async () => {
  const mentor=new LocalMentor('/not-used','/not-used');mentor.start=async()=>{};mentor.port=43199;
  const original=globalThis.fetch;const sent=[];
  globalThis.fetch=async (_url,options)=>{sent.push(JSON.parse(options.body));return new Response('{"choices":[]}',{headers:{'Content-Type':'application/json'}});};
  try {
    for (const temperature of [0,99,-10,undefined]) {
      const response=await mentor.reply(new Request('oet://study/OET/desktop/ai/chat',{method:'POST',headers:{Origin:'oet://study'},body:JSON.stringify({messages:[{role:'user',content:'Check source fidelity.'}],temperature,max_tokens:500})}));
      assert.equal(response.status,200);
    }
    assert.deepEqual(sent.map(body=>body.temperature),[0,1,0,.4]);
    assert(sent.every(body=>body.chat_template_kwargs.enable_thinking===false));
    assert(sent.every(body=>body.reasoning_effort==='none'));
    await mentor.reply(new Request('oet://study/OET/desktop/ai/chat',{method:'POST',body:JSON.stringify({messages:[{role:'user',content:'Check source fidelity.'}],careful:true,max_tokens:1600})}));
    assert.equal(sent.at(-1).reasoning_effort,'medium');
    assert.equal(sent.at(-1).chat_template_kwargs.enable_thinking,true);
    assert.equal(sent.at(-1).max_tokens,1984);
  } finally {globalThis.fetch=original;}
});
