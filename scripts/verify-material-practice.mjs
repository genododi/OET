import fs from 'node:fs';
import assert from 'node:assert/strict';
const index=JSON.parse(fs.readFileSync('public/material-practice/index.json','utf8'));
let questions=0,answers=0,transcripts=0;
for(const [sha,entry] of Object.entries(index.files)) {
  const sheet=JSON.parse(fs.readFileSync(`public/${entry.sheetPath}`,'utf8'));
  assert.equal(sheet.version,1);assert.equal(sheet.sourceSha256,sha);
  assert.equal(new Set(sheet.units.map(unit=>unit.id)).size,sheet.units.length);
  const documents=new Map(sheet.documents.map(document=>[document.sha256,document]));
  for(const document of documents.values())assert(fs.existsSync(`public/${document.textPath}`));
  for(const unit of sheet.units) {
    assert(documents.has(unit.sourceSha256));assert(unit.pages.length>0);
    assert(unit.skills.length>0);assert(unit.pages.every(page=>Number.isInteger(page)&&page>0));
    assert.equal(new Set(unit.questions.map(q=>q.number)).size,unit.questions.length,`Duplicate question number in ${sha} ${unit.id}`);
    for(const audio of unit.recordings)assert.equal(documents.get(audio)?.role,'recording');
    for(const question of unit.questions) {
      assert(Number.isInteger(question.number)&&question.number>=1&&question.number<=42);
      assert.equal(typeof question.prompt,'string');assert(question.prompt.trim());assert(Array.isArray(question.choices));
      assert(unit.pages.includes(question.sourcePage));questions++;
      if(question.answer) {assert(question.answer.source.assetPath);assert(question.answer.page>0);answers++;}
    }
  }
}
for(const name of fs.readdirSync('public/material-practice/transcripts').filter(name=>name.endsWith('.json'))) {
  const data=JSON.parse(fs.readFileSync(`public/material-practice/transcripts/${name}`,'utf8'));
  const sha=name.slice(0,-5);assert.equal(data.sourceSha256,sha);assert.equal(data.trackId,`material-${sha}`);
  assert.equal(data.kind,'automatic-transcription');assert(data.segments.length);
  for(const segment of data.segments) {assert(segment.start>=0&&segment.end>=segment.start);assert.equal(typeof segment.text,'string');}
  transcripts++;
}
console.log(JSON.stringify({sourceFiles:Object.keys(index.files).length,questionRows:questions,sourceBackedAnswers:answers,exactRecordingTranscripts:transcripts}));
