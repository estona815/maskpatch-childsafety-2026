import {LABELS,tokenize,features,probabilities,predict} from './engine.mjs';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const templates=[
 n=>`My name is {PERSON:${n.person}} and I live in {PLACE:${n.place}}.`,
 n=>`Please call me {PERSON:${n.person}}. My school is {SCHOOL:${n.school}}.`,
 n=>`I study at {SCHOOL:${n.school}} and live at {PLACE:${n.place}}.`,
 n=>`My friend is {PERSON:${n.person}}. We meet in {PLACE:${n.place}}.`,
 n=>`My teacher is {PERSON:${n.person}} at {SCHOOL:${n.school}}.`,
 n=>`The weather is cloudy. Write a story about a robot and a moon.`,
 n=>`I like music and drawing. Explain a triangle without using my details.`,
 n=>`Email me at {CONTACT:${n.email}}. This is a fictional example.`
];
function parse(marked){let text='',ranges=[],last=0;for(const m of marked.matchAll(/\{(PERSON|PLACE|SCHOOL|CONTACT):([^}]+)\}/g)){text+=marked.slice(last,m.index);const start=Array.from(text).length;text+=m[2];ranges.push({label:m[1],start,end:Array.from(text).length});last=m.index+m[0].length;}text+=marked.slice(last);return {text,labels:tokenize(text).map(t=>ranges.find(r=>t.start>=r.start&&t.end<=r.end)?.label??'NONE')};}
function corpus(prefix,count){return Array.from({length:count},(_,i)=>({group:prefix+'-'+i,person:prefix==='train'?['Ava','Noah','Mia','Ezra','Leo','Luna','Omar','Iris'][i%8]:prefix+'name'+i,place:prefix==='train'?['12 Maple Street','24 Elm Road','36 Brook Lane','48 Pine Avenue'][i%4]:(50+i)+' '+prefix+'town'+i+' Lane',school:prefix==='train'?['Cedar Brook School','Oak Ridge Academy','Willow Crest School','Birch Gate Academy'][i%4]:prefix+'school'+i+' Grove School',email:prefix+'sample'+i+'@example.test'})).flatMap(n=>templates.map((t,index)=>({...parse(t(n)),group:n.group,template:index})));}
const train=corpus('train',24),validation=corpus('validation',8),holdout=corpus('holdout',8);
// Entity identities are disjoint. Grammar templates are shared: this deliberately narrow
// holdout does not establish transfer to natural prompts or another language.
const model={version:'maskpatch-synthetic-2',threshold:0.72,labels:LABELS,weights:{}};
for(let epoch=0;epoch<100;epoch++)for(const row of train){const ts=tokenize(row.text);for(let i=0;i<ts.length;i++){const fs=features(ts,i),p=probabilities(fs,model),y=LABELS.indexOf(row.labels[i]);for(const f of fs){model.weights[f]??=LABELS.map(()=>0);for(let k=0;k<LABELS.length;k++)model.weights[f][k]+=0.06*((k===y?1:0)-p[k])-0.00004*model.weights[f][k];}}}
function evaluate(rows){let truth=0,accepted=0,tp=0,fp=0,missed=0;const mistakes=[];for(const row of rows){const predictions=predict(row.text,model);for(let i=0;i<predictions.length;i++){const p=predictions[i],actual=row.labels[i],hit=p.label!=='NONE'&&p.score>=model.threshold;if(actual!=='NONE')truth++;if(hit){accepted++;if(p.label===actual)tp++;else fp++;}if(actual!=='NONE'&&(!hit||p.label!==actual))missed++;if((hit&&p.label!==actual)||(actual!=='NONE'&&!hit))mistakes.push({text:row.text,token:p.text,actual,predicted:p.label,score:p.score});}}
 return {sentences:rows.length,truthEntityTokens:truth,acceptedEntityTokens:accepted,truePositive:tp,falsePositive:fp,missed,precision:accepted?tp/accepted:0,recall:truth?tp/truth:0,mistakes};}
// Threshold fixed a priori, not tuned against validation or holdout.
const challenge=[parse('My name is {PERSON:Blue} and I live in {PLACE:Quiet}.') ,parse('Please call me curious. My school is online.'),parse('{PERSON:Ava} from {PLACE:Mapleton} attends {SCHOOL:Cedarbrook}.'),parse('My name is {PERSON:권준} and I live in {PLACE:서울}.')];
const report={schema:1,method:'Multiclass token softmax SGD; actual learned weights; deterministic feature extractor. Fixed 0.72 threshold.',split:'Entity identities are disjoint; shared grammar templates. Not an independent natural-language generalization test.',train:evaluate(train),validation:evaluate(validation),holdout:evaluate(holdout),challenge:evaluate(challenge),limitations:['English synthetic grammar only.','Confident wrong labels and misses remain possible.','Scores are uncalibrated softmax outputs, not correctness probabilities.','Regex contact patterns are separate from model evaluation.'],corpusSha256:createHash('sha256').update(JSON.stringify({train,validation,holdout,challenge})).digest('hex')};
for(const [file,data]of [['model-v2.json',model],['model-evaluation-v2.json',report],['synthetic-corpus-v2.json',{train,validation,holdout,challenge}]])writeFileSync(new URL(file,import.meta.url),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({weights:Object.keys(model.weights).length,holdout:report.holdout,challenge:report.challenge}));
