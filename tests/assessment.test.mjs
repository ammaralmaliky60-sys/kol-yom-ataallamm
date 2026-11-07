import test from 'node:test';
import assert from 'node:assert/strict';
import { englishLessons } from '../dist/data/english.js';
import { computerLessons } from '../dist/data/computer.js';
import { cultureLessons } from '../dist/data/culture.js';
import { gradeAnswer } from '../dist/modules/engine.js';
import {
 integratedChallenge,prepareLessonAssessment,selectLessonQuestions,buildMixedAssessment,
 buildUnitAssessment,buildPlacementAssessment,buildMistakeAssessment,prepareQuestions,
 diagnosticReport,difficultyOf,difficultyName,shuffle,nextPractice,answerRecord,buildListeningAssessment
} from '../dist/modules/assessment.js';

const lessons=[...englishLessons,...computerLessons,...cultureLessons];
const fixed=()=>.499;

test('every one of the 146 lessons gains a grounded, uniquely gradable combined-concept challenge',()=>{
 assert.equal(englishLessons.length,76);
 assert.equal(computerLessons.length,40);
 assert.equal(cultureLessons.length,30);
 assert.equal(lessons.length,146);
 for(const lesson of lessons){
  const all=prepareLessonAssessment(lesson);
  assert.equal(all.length,lesson.questions.length+1,lesson.id);
  const challenge=all.at(-1);
  assert.equal(challenge.context.id,'integrated-'+lesson.id);
  assert.ok(challenge.context.facts.length>=3);
  assert.equal(challenge.options.length,4);
  assert.equal(new Set(challenge.options).size,4);
  assert.ok(challenge.explanation.length>30,lesson.id);
  assert.equal(challenge.difficulty,'advanced');
  assert.equal(challenge.skill,'الربط بين المفاهيم');
  assert.equal(challenge._lessonId,lesson.id);
  assert.ok(challenge.options.every(option=>gradeAnswer(challenge,option)===(option===challenge.answer)),lesson.id);
  const prompts=challenge.context.facts.filter(x=>/^المهمة (?:الأولى|الثانية): /.test(x)).map(x=>x.replace(/^المهمة (?:الأولى|الثانية): /,''));
  assert.ok(prompts.every(x=>lesson.questions.some(q=>q.prompt===x)),lesson.id);
 }
});
test('combined scientific questions retain all measurements before their tasks without repeating shared evidence',()=>{
 const lesson=cultureLessons[0],challenge=integratedChallenge(lesson);
 const facts=lesson.questions[0].context.facts;
 for(const fact of facts)assert.equal(challenge.context.facts.filter(x=>x===fact).length,1);
 assert.ok(challenge.context.facts.indexOf(facts[0])<challenge.context.facts.findIndex(x=>x.startsWith('المهمة الأولى')));
 assert.ok(challenge.context.facts.some(x=>x.includes('14')&&x.includes('9')));
});
test('combined questions preserve evidence from two different source cases',()=>{
 const question=(prompt,context)=>({type:'choice',prompt,context,options:['yes','no'],answer:'yes',explanation:'Authored explanation'});
 const challenge=integratedChallenge({id:'two-cases',title:'Cases',questions:[
  question('First?',{facts:['First measurement','Shared condition']}),
  question('Second?',{facts:['Second measurement','Shared condition']})
 ]});
 for(const fact of ['First measurement','Second measurement','Shared condition'])assert.equal(challenge.context.facts.filter(x=>x===fact).length,1);
});
test('a corrected answer clears an earlier mistake across lesson and mixed assessments',()=>{
 const lesson=computerLessons[0],question=prepareLessonAssessment(lesson)[0];
 const record=correct=>answerRecord({question,given:question.answer,correct});
 const history=[{lessonId:lesson.id,answers:[record(false)]},{lessonId:null,answers:[record(true)]}];
 assert.equal(buildMistakeAssessment(lessons,JSON.parse(JSON.stringify(history))).length,0);
 history.push({lessonId:null,answers:[record(false)]});
 assert.equal(buildMistakeAssessment(lessons,history).length,1);
});
test('mistakes from unit, placement and mixed questions retain stable lesson and question identifiers',()=>{
 const sample=[...englishLessons.slice(0,2),computerLessons[0],cultureLessons[0]];
 for(const questions of [buildUnitAssessment(sample),buildPlacementAssessment(sample),buildMixedAssessment(sample)]){
  const original=questions[0],saved=JSON.parse(JSON.stringify(answerRecord({question:original,given:'wrong',correct:false})));
  assert.equal(saved.lessonId,original._lessonId);
  assert.equal(saved.questionId,original._questionId);
  const retrieved=buildMistakeAssessment(sample,[{lessonId:null,answers:[saved]}]);
  assert.equal(retrieved.length,1);
  assert.equal(retrieved[0]._questionId,original._questionId);
  assert.equal(retrieved[0].answer,original.answer);
 }
});
test('listening mistakes can be retried and cleared using the authored vocabulary',()=>{
 const lesson=englishLessons[0],question=buildListeningAssessment([lesson],5,fixed)[0];
 const wrong=answerRecord({question,given:'wrong',correct:false});
 const history=[{lessonId:null,answers:[JSON.parse(JSON.stringify(wrong))]}];
 const retry=buildMistakeAssessment([lesson],history,20,fixed);
 assert.equal(retry.length,1);
 assert.equal(retry[0].audio,question.audio);
 assert.equal(retry[0].answer,question.answer);
 assert.ok(retry[0].options.includes(question.answer));
 history.push({lessonId:null,answers:[answerRecord({question:retry[0],given:retry[0].answer,correct:true})]});
 assert.equal(buildMistakeAssessment([lesson],history).length,0);
});
test('legacy mixed results recover only unambiguous questions and preserve correction order',()=>{
 const lesson=computerLessons[0],question=lesson.questions[0];
 const record=correct=>({prompt:question.prompt,answer:question.answer,correct});
 const history=[{lessonId:null,answers:[record(false)]}];
 assert.equal(buildMistakeAssessment(lessons,history).length,1);
 history.push({lessonId:lesson.id,answers:[record(true)]});
 assert.equal(buildMistakeAssessment(lessons,history).length,0);
 const ambiguous={prompt:'أي زوج من الإجابات يحقق المهمتين معاً دون خطأ؟',correct:false};
 assert.equal(buildMistakeAssessment(lessons,[{answers:[ambiguous]}]).length,0);
});
test('all questions keep original answer keys, and options change order without mutating the bank',()=>{
 const lesson=computerLessons[0];
 const original=lesson.questions[0];
 const snapshot=[...original.options];
 const run=prepareQuestions(prepareLessonAssessment(lesson),{},()=>0);
 assert.deepEqual(original.options,snapshot);
 assert.notDeepEqual(run[0].options,snapshot);
 assert.ok(run.every(q=>!q.options || q.type==='order'||q.options.includes(q.answer)));
 assert.equal(run.at(-1).skill,'الربط بين المفاهيم');
});
test('balanced unit and level exams prefer tougher questions and still cover every lesson',()=>{
 const sub=englishLessons.slice(0,4);
 for(const assessment of [buildUnitAssessment(sub,[],2,fixed),buildPlacementAssessment(sub,[],fixed)]){
  assert.equal(assessment.length,sub.length*2);
  for(const l of sub)assert.equal(assessment.filter(q=>q._lessonId===l.id).length,2);
  assert.ok(assessment.some(q=>q.skill==='الربط بين المفاهيم'));
 }
 const selected=selectLessonQuestions(cultureLessons[0],{count:2},fixed);
 assert.equal(selected.length,2);
 assert.ok(selected.some(q=>q.skill==='الربط بين المفاهيم'));
});
test('global review is balanced across tracks instead of always sampling simple first questions',()=>{
 const chosen=buildMixedAssessment(lessons,[],20,fixed);
 assert.equal(chosen.length,20);
 const counts=['english','computer','culture'].map(t=>chosen.filter(q=>q._track===t).length);
 assert.ok(Math.max(...counts)-Math.min(...counts)<=1,counts.join('/'));
 assert.equal(new Set(chosen.map(q=>q._lessonId)).size,20);
 assert.ok(chosen.every(q=>['advanced','medium'].includes(q.difficulty)));
});
test('personal mistake review retrieves only actual authored incorrect questions',()=>{
 const l=computerLessons[0];
 const wrong=l.questions[1];
 const history=[{lessonId:l.id,answers:[
  {prompt:l.questions[0].prompt,correct:true},
  {prompt:wrong.prompt,correct:false}
 ]}];
 const list=buildMistakeAssessment([l],history,20,fixed);
 assert.equal(list.length,1);
 assert.equal(list[0].prompt,wrong.prompt);
 assert.equal(list[0].answer,wrong.answer);
 assert.equal(buildMistakeAssessment([l],[],20,fixed).length,0);
});
test('honest diagnostics separate question grades from applied practice, including older results',()=>{
 const report=diagnosticReport([
  {question:{skill:'التحليل',difficulty:'advanced'},correct:false},
  {question:{skill:'التحليل',difficulty:'advanced'},correct:true},
  {question:{skill:'الفهم',difficulty:'basic'},correct:true}
 ]);
 assert.equal(report.skills.find(v=>v.key==='التحليل').percent,50);
 assert.deepEqual(report.weak,['التحليل']);
 assert.deepEqual(report.applied,{correct:1,total:2,percent:50});
 assert.equal(diagnosticReport([{question:{prompt:'ما معنى الكلمة؟'},correct:true}]).applied.percent,null);
 assert.equal(difficultyOf({type:'input',prompt:'اكتب الاختصار'}),'medium');
 assert.equal(difficultyName('advanced'),'استدلالي');
 assert.ok(nextPractice(cultureLessons[0]).length>20);
});
