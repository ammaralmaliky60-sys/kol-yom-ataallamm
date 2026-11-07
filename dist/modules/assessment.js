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
export function questionIdFor(q){
 if(q._questionId)return q._questionId;
 if(q.id)return q.id;
 const text=q.audio?'listening:'+q.audio:(q.type||'choice')+':'+q.prompt;
 let hash=2166136261;
 for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 return 'q-'+(hash>>>0).toString(36);
}
export function taggedQuestion(q,lesson){
 return {...q,_questionId:questionIdFor(q),skill:skillOf(q),difficulty:difficultyOf(q),
  ...lesson?{_lessonId:lesson.id,_lessonTitle:lesson.title,_track:lesson.track}:{}};
}
export function answerRecord({question:q,given,correct}){
 return {lessonId:q._lessonId||null,questionId:questionIdFor(q),type:q.type||'choice',
  ...(q.audio?{audio:q.audio}:{}),prompt:q.prompt,answer:q.answer,given,
  explanation:q.explanation,correct,skill:skillOf(q),difficulty:difficultyOf(q)};
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
 for(const item of (history||[]).slice(-30).reverse()){
  const answer=(item.answers||[]).find(a=>(a.lessonId||item.lessonId)===lessonId&&a.prompt===prompt);
  if(answer)return answer.correct===false;
 }
 return false;
}
export function selectLessonQuestions(lesson,{count=2,history=[]}={},rng=Math.random){
 const questions=prepareLessonAssessment(lesson);
 const shuffled=shuffle(questions,rng);
 shuffled.sort((a,b)=>{
  const score=q=>(scoreDifficulty[q.difficulty]||1)+
   (q.skill==='الربط بين المفاهيم'?5:0)+
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
function incorrectAlternative(q,lesson){
 const normalized=value=>String(value??'').toLowerCase().trim();
 if(Array.isArray(q.options)&&q.options.includes(q.answer)){
  const wrong=q.options.find(value=>normalized(value)!==normalized(q.answer));
  if(wrong!==undefined)return wrong;
 }
 if(q.type==='order'){
  const tokens=String(q.answer).split(/\s+/);
  if(tokens.length>1){
    const swapped=[...tokens];[swapped[0],swapped[1]]=[swapped[1],swapped[0]];
    if(swapped.join(' ')!==q.answer)return swapped.join(' ');
  }
 }
 if(q.type==='input'){
  const distractors={
   'are':'is','is':'are','am':'are','do':'does','does':'do',
   'has':'have','have':'has','was':'were','were':'was',
   'a':'an','an':'a','this':'these','these':'this',
   'works':'work','work':'works','cpu':'gpu','ram':'rom',
   'ssd':'hdd','hdd':'ssd','yes':'no','no':'yes'
  };
  const known=distractors[normalized(q.answer)];
  if(known)return known;
  const other=(lesson.questions||[]).flatMap(x=>(x.options||[])).find(value=>
     normalized(value)!==normalized(q.answer)&&
     Math.abs(String(value).length-String(q.answer).length)<=5
  );
  if(other)return other;
 }
 return null;
}
export function integratedChallenge(lesson){
 const qualified=(lesson?.questions||[]).filter(q=>
  ['choice','boolean','input','order'].includes(q.type)&&!q.audio&&
  typeof q.answer==='string'&&q.answer.trim()&&
  incorrectAlternative(q,lesson)!==null
 );
 if(qualified.length<2)return null;
 const ranked=[...qualified].sort((a,b)=>
  (scoreDifficulty[difficultyOf(b)]||0)-(scoreDifficulty[difficultyOf(a)]||0));
 const first=ranked[0];
 const second=ranked.find(q=>q!==first&&q.prompt!==first.prompt);
 if(!second)return null;
 const wrong1=incorrectAlternative(first,lesson);
 const wrong2=incorrectAlternative(second,lesson);
 const pair=(left,right)=>String(left)+' | '+String(right);
 const correct=pair(first.answer,second.answer);
 const options=[
  correct,
  pair(wrong1,second.answer),
  pair(first.answer,wrong2),
  pair(wrong1,wrong2)
 ];
 if(new Set(options).size!==4)return null;
 const evidence=[...new Set([first,second].flatMap(q=>q.context?.facts||[]))];
 return {
  id:'integrated-'+lesson.id,
  type:'choice',
  prompt:'أي زوج من الإجابات يحقق المهمتين معاً دون خطأ؟',
  options,answer:correct,
  context:{
   id:'integrated-'+lesson.id,
   title:'تحدي التفكير المركّب · '+lesson.title,
   facts:[
    ...evidence,
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
export function buildListeningAssessment(lessons,limit=12,rng=Math.random){
 const available=lessons.filter(l=>l.track==='english').flatMap(l=>
  (l.vocabulary||[]).map(word=>({word,lesson:l})));
 const unique=[...new Map(shuffle(available,rng).map(item=>[item.word.word,item])).values()].slice(0,limit);
 const meanings=[...new Set(available.map(item=>item.word.meaning))];
 return unique.map(({word:w,lesson})=>{
  const inLesson=(lesson.vocabulary||[]).filter(v=>v.meaning!==w.meaning).map(v=>v.meaning);
  const distractions=[...new Set([...shuffle(inLesson,rng),...shuffle(meanings.filter(m=>m!==w.meaning),rng)])].slice(0,3);
  return taggedQuestion({type:'listening',prompt:'استمع جيداً، ثم حدد المعنى العربي الأقرب للكلمة.',
   audio:w.word,options:[w.meaning,...distractions],answer:w.meaning,
   explanation:`${w.word} تعني ${w.meaning}. ${w.example} — ${w.translation}`},lesson);
 });
}
export function buildMistakeAssessment(lessons,history=[],limit=20,rng=Math.random){
 const byId=new Map(lessons.map(l=>[l.id,l]));
 const banks=new Map(lessons.map(l=>[l.id,prepareLessonAssessment(l)]));
 const byPrompt=new Map();
 for(const bank of banks.values())for(const q of bank){
  if(!byPrompt.has(q.prompt))byPrompt.set(q.prompt,[]);
  byPrompt.get(q.prompt).push(q);
 }
 const pending=new Map(),seen=new Set();
 for(const item of [...history].reverse()){
  const answers=Array.isArray(item.answers)?item.answers:(item.wrong||[]).map(a=>({...a,correct:false}));
  for(const answer of [...answers].reverse()){
   let source,lesson=byId.get(answer.lessonId||item.lessonId);
   if(lesson){
    source=banks.get(lesson.id).find(q=>answer.questionId?q._questionId===answer.questionId:q.prompt===answer.prompt);
    if(!source&&answer.type==='listening'&&answer.audio)
     source=buildListeningAssessment([lesson],Infinity,rng).find(q=>q.audio===answer.audio);
   }else if(!answer.lessonId&&!item.lessonId){
    // Older mixed results omitted lesson IDs. Recover only an unambiguous match.
    const candidates=(byPrompt.get(answer.prompt)||[]).filter(q=>!answer.answer||q.answer===answer.answer);
    if(candidates.length===1){source=candidates[0];lesson=byId.get(source._lessonId);}
   }
   if(!source||!lesson)continue;
   const key=lesson.id+'@'+source._questionId;
   if(seen.has(key))continue;
   seen.add(key);
   if(answer.correct===false)pending.set(key,source);
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
