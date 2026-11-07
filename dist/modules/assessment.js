/*
 * Assessment selection and coaching, shared by every learning track.
 * All automatically graded items originate in the author's answer keys.
 * Practical assignments are intentionally ungraded without a human evaluator.
 */
const actionCue = /(?:لماذا|أي (?:إجراء|تصرف|قرار|خطوة|خيار|تفسير|استنتاج|حل)|كيف (?:تتصرف|تعالج|تختبر|تقرر|تتحقق|تتأكد)|ماذا (?:تفعل|يحدث|تستنتج|تختار|لو)|إذا|عندما|في حال|الحالة|السيناريو|استنتج|احسب|قارن|ما السبب|what (?:should|would)|which (?:sentence|option) (?:best|fits)|if you|why should)/i;
const gradeNames = Object.freeze({basic:'أساسي',medium:'متوسط',advanced:'استدلالي'});

export function skillOf(q){
 if(typeof q.skill==='string' && q.skill.trim())return q.skill.trim();
 if(q.type==='listening'||q.audio)return 'الاستماع والتمييز';
 if(q.type==='order')return 'بناء التراكيب';
 if(q.context)return 'تحليل المعطيات';
 if(actionCue.test(q.prompt||''))return 'الاستدلال والتطبيق';
 if(q.type==='input')return 'إنتاج الإجابة';
 if(q.type==='boolean')return 'تمييز المفاهيم';
 return 'فهم المعلومات';
}
export function difficultyOf(q){
 if(['basic','medium','advanced'].includes(q.difficulty))return q.difficulty;
 if(q.context||actionCue.test(q.prompt||''))return 'advanced';
 if(q.type==='order'||q.type==='input'||q.type==='listening')return 'medium';
 return 'basic';
}
export const difficultyName=level=>gradeNames[level]||gradeNames.basic;
export function taggedQuestion(q,lesson){
 return {...q,skill:skillOf(q),difficulty:difficultyOf(q),
  ...lesson?{_lessonId:lesson.id,_lessonTitle:lesson.title,_track:lesson.track}:{}};
}
export function shuffle(items,rng=Math.random){
 const list=[...items];
 for(let i=list.length-1;i>0;i--){
  const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];
 }
 return list;
}
export function prepareQuestions(items,opts={},rng=Math.random){
 return items.map(q=>{
  const enriched=taggedQuestion(q);
  if(!Array.isArray(q.options)||q.type==='order'||q.options.length<2)return enriched;
  return {...enriched,options:shuffle(q.options,rng)};
 });
}
const scoreDifficulty={advanced:5,medium:3,basic:1};
function previousMistake(history,lessonId,prompt){
 return (history||[]).slice(-30).some(item=>item.lessonId===lessonId&&
   (item.answers||[]).some(a=>a.prompt===prompt&&!a.correct));
}
export function selectLessonQuestions(lesson,{count=2,history=[]}={},rng=Math.random){
 const questions=prepareLessonAssessment(lesson);
 const shuffled=shuffle(questions,rng);
 shuffled.sort((a,b)=>{
  const score=q=>(scoreDifficulty[q.difficulty]||1)+
   (previousMistake(history,lesson.id,q.prompt)?3:0);
  return score(b)-score(a);
 });
 const unique=[],used=new Set();
 for(const q of shuffled){
  if(used.has(q.prompt))continue;
  unique.push(q);used.add(q.prompt);
  if(unique.length===count)break;
 }
 return unique;
}
/*
 * Every lesson receives one integrative reasoning question. Its two sub-tasks
 * and explanation are copied from authored, auto-gradable source questions,
 * so a correct combination is objectively verifiable (no AI guesswork).
 */
export function integratedChallenge(lesson){
 const qualified=(lesson?.questions||[]).filter(q=>
  ['choice','boolean'].includes(q.type)&&!q.audio&&
  Array.isArray(q.options)&&q.options.length>=2&&
  q.options.includes(q.answer)&&
  q.options.some(v=>v!==q.answer)
 );
 if(qualified.length<2)return null;
 const ranked=[...qualified].sort((a,b)=>
  (scoreDifficulty[difficultyOf(b)]||0)-(scoreDifficulty[difficultyOf(a)]||0));
 const first=ranked[0];
 const second=ranked.find(q=>q!==first && q.prompt!==first.prompt);
 if(!second)return null;
 const wrong1=first.options.find(item=>item!==first.answer);
 const wrong2=second.options.find(item=>item!==second.answer);
 const pair=(left,right)=>String(left)+' | '+String(right);
 const correct=pair(first.answer,second.answer);
 const options=[
  correct,
  pair(wrong1,second.answer),
  pair(first.answer,wrong2),
  pair(wrong1,wrong2)
 ];
 if(new Set(options).size!==4)return null;
 return {
  type:'choice',
  prompt:'أي زوج من الإجابات يحقق المهمتين معاً دون خطأ؟',
  options,answer:correct,
  context:{
   id:'integrated-'+lesson.id,
   title:'تحدي التفكير المركّب · '+lesson.title,
   facts:[
    'المهمة الأولى: '+first.prompt,
    'المهمة الثانية: '+second.prompt,
    'اختر زوجاً صحيحاً للمهمتين؛ الإجابة الأولى قبل علامة | والثانية بعدها.'
   ]
  },
  skill:'الربط بين المفاهيم',
  difficulty:'advanced',
  explanation:'الأولى: '+first.explanation+' الثانية: '+second.explanation
 };
}
export function prepareLessonAssessment(lesson){
 const originals=(lesson.questions||[]).map(q=>taggedQuestion(q,lesson));
 const extra=integratedChallenge(lesson);
 return extra?[...originals,taggedQuestion(extra,lesson)]:originals;
}
export function buildUnitAssessment(lessons,history=[],count=2,rng=Math.random){
 return lessons.flatMap(l=>selectLessonQuestions(l,{count,history},rng));
}
export function buildPlacementAssessment(lessons,history=[],rng=Math.random){
 return lessons.flatMap(l=>selectLessonQuestions(l,{count:2,history},rng));
}
export function buildMixedAssessment(lessons,history=[],limit=20,rng=Math.random){
 const tracks=['english','computer','culture'];
 const queues=tracks.map(track=>shuffle(lessons.filter(l=>l.track===track),rng));
 const seen=new Set(),selected=[];
 for(let round=0;selected.length<limit && queues.some(queue=>queue.length);round++){
  for(const queue of queues){
   const lesson=queue.shift();
   if(!lesson)continue;
   const question=selectLessonQuestions(lesson,{count:1,history},rng)[0];
   if(question&&!seen.has(question.prompt+'@'+lesson.id)){
    selected.push(question);seen.add(question.prompt+'@'+lesson.id);
   }
   if(selected.length===limit)break;
  }
 }
 return selected;
}
export function buildMistakeAssessment(lessons,history=[],limit=20,rng=Math.random){
 const byId=new Map(lessons.map(l=>[l.id,l]));
 const pending=new Map();
 for(const item of [...history].reverse()){
  const lesson=byId.get(item.lessonId);
  if(!lesson)continue;
  for(const answer of item.answers||[]){
   if(answer.correct||pending.has(lesson.id+'@'+answer.prompt))continue;
   const source=prepareLessonAssessment(lesson).find(q=>q.prompt===answer.prompt);
   if(source)pending.set(lesson.id+'@'+answer.prompt,taggedQuestion(source,lesson));
  }
 }
 return shuffle([...pending.values()],rng).slice(0,limit);
}
export function diagnosticReport(answers){
 const skills=new Map(),difficulty=new Map();
 for(const a of answers){
  const skill=skillOf(a.question||a),level=difficultyOf(a.question||a);
  for(const [map,key] of [[skills,skill],[difficulty,level]]){
   if(!map.has(key))map.set(key,{correct:0,total:0});
   const bucket=map.get(key);bucket.total++;if(a.correct)bucket.correct++;
  }
 }
 const entries=map=>[...map].map(([key,value])=>({key,...value,
  percent:Math.round(value.correct/value.total*100)}));
 const skillRows=entries(skills),difficultyRows=entries(difficulty);
 const weak=skillRows.filter(item=>item.correct<item.total).sort((a,b)=>a.percent-b.percent);
 const applied=difficulty.get('advanced')||{correct:0,total:0};
 return {skills:skillRows,levels:difficultyRows,weak:weak.map(x=>x.key),
  applied:{...applied,percent:applied.total?Math.round(applied.correct/applied.total*100):null}};
}
export function nextPractice(lesson){
 if(!lesson)return '';
 return String(lesson.practice||'').trim();
}
