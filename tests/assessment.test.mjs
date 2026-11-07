import test from 'node:test';
import assert from 'node:assert/strict';
import { englishLessons } from '../dist/data/english.js';
import { computerLessons } from '../dist/data/computer.js';
import { cultureLessons } from '../dist/data/culture.js';
import { gradeAnswer } from '../dist/modules/engine.js';
import {
 integratedChallenge,prepareLessonAssessment,selectLessonQuestions,buildMixedAssessment,
 buildUnitAssessment,buildPlacementAssessment,buildMistakeAssessment,prepareQuestions,
 diagnosticReport,difficultyOf,difficultyName,shuffle,nextPractice
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
  assert.equal(challenge.context.facts.length,3);
  assert.equal(challenge.options.length,4);
  assert.equal(new Set(challenge.options).size,4);
  assert.ok(challenge.explanation.length>30,lesson.id);
  assert.equal(challenge.difficulty,'advanced');
  assert.equal(challenge.skill,'الربط بين المفاهيم');
  assert.equal(challenge._lessonId,lesson.id);
  assert.ok(challenge.options.every(option=>gradeAnswer(challenge,option)===(option===challenge.answer)),lesson.id);
  const prompts=challenge.context.facts.slice(0,2).map(x=>x.replace(/^المهمة (?:الأولى|الثانية): /,''));
  assert.ok(prompts.every(x=>lesson.questions.some(q=>q.prompt===x)),lesson.id);
 }
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
