export const LABELS=['NONE','PERSON','PLACE','SCHOOL','CONTACT'];
export const LIMIT=4000;
export function tokenize(text){
 if(typeof text!=='string'||Array.from(text).length>LIMIT)throw Error('Use at most 4,000 characters.');
 return [...text.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)].map(m=>({text:m[0],start:Array.from(text.slice(0,m.index)).length,end:Array.from(text.slice(0,m.index+m[0].length)).length}));
}
export function features(tokens,i){
 const t=tokens[i].text,w=t.toLowerCase(),f=['bias'];
 f.push('word='+w,'shape='+(/^\p{Lu}/u.test(t)?'capital':'lower'),'len='+Math.min(12,Array.from(w).length));
 if(/^\d+$/u.test(t))f.push('digits');
 for(let d=1;d<=3;d++){if(i-d>=0)f.push('prev'+d+'='+tokens[i-d].text.toLowerCase());if(i+d<tokens.length)f.push('next'+d+'='+tokens[i+d].text.toLowerCase());}
 return f;
}
export function probabilities(fs,model){
 const scores=LABELS.map((_,k)=>fs.reduce((s,f)=>s+(model.weights[f]?.[k]??0),0));
 const max=Math.max(...scores),ex=scores.map(v=>Math.exp(v-max)),sum=ex.reduce((a,b)=>a+b,0);
 return ex.map(x=>x/sum);
}
export function predict(text,model){return tokenize(text).map((t,i,ts)=>{const probs=probabilities(features(ts,i),model);const k=probs.indexOf(Math.max(...probs));return {...t,label:LABELS[k],score:probs[k],probs};});}
export function resolveOverlaps(spans){
 const sorted=[...spans].sort((a,b)=>(a.method==='rule'?0:1)-(b.method==='rule'?0:1)||b.score-a.score||a.start-b.start||b.end-a.end);
 const kept=[],conflicts=[];
 for(const s of sorted){const hit=kept.find(k=>s.start<k.end&&k.start<s.end);if(hit)conflicts.push({rejected:s,kept:hit});else kept.push(s);}
 return {spans:kept.sort((a,b)=>a.start-b.start).map((s,i)=>({...s,id:'span-'+i})),conflicts};
}
export function analyze(text,model){
 const cp=Array.from(text),tokens=predict(text,model),spans=[];
 for(const t of tokens){if(t.label==='NONE'||t.score<model.threshold)continue;
  const last=spans.at(-1);
  if(last&&last.label===t.label&&last.method==='ml'&&/^\s*$/.test(cp.slice(last.end,t.start).join(''))){last.end=t.end;last.text=cp.slice(last.start,last.end).join('');last.score=Math.min(last.score,t.score);}
  else spans.push({...t,method:'ml',text:cp.slice(t.start,t.end).join('')});
 }
 const patterns=[{re:/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,reason:'Email-shaped text (rule)'},{re:/(?<!\d)(?:\+\d{1,3}[ -]?)?\d{3}[ -]\d{3,4}[ -]\d{4}(?!\d)/g,reason:'Phone-shaped text (rule)'}];
 for(const {re,reason}of patterns)for(const m of text.matchAll(re)){const start=Array.from(text.slice(0,m.index)).length;spans.push({start,end:start+Array.from(m[0]).length,text:m[0],label:'CONTACT',method:'rule',score:1,reason});}
 const resolved=resolveOverlaps(spans);
 return {source:text,...resolved,tokens,unknown:tokens.filter(t=>t.label!=='NONE'&&t.score<model.threshold),modelVersion:model.version};
}
export function applyPatch(analysis,ids){
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('Duplicate or invalid selection.');
 const selected=analysis.spans.filter(s=>ids.includes(s.id));if(selected.length!==ids.length)throw Error('Unknown candidate. Scan again.');
 const chars=Array.from(analysis.source),log=[];let cursor=0,out='';
 for(const s of selected){if(!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<cursor||s.start<0||s.end>chars.length||s.end<=s.start||chars.slice(s.start,s.end).join('')!==s.text)throw Error('Invalid or stale span.');
  out+=chars.slice(cursor,s.start).join('');const type={PERSON:'NAME',PLACE:'ADDRESS',SCHOOL:'SCHOOL',CONTACT:'CONTACT'}[s.label]??s.label;const count=log.filter(p=>p.label===s.label).length+1;const replacement='['+type+(count>1?'_'+count:'')+']';
  const outputStart=Array.from(out).length;out+=replacement;log.push({start:s.start,end:s.end,original:s.text,label:s.label,replacement,outputStart,outputEnd:Array.from(out).length});cursor=s.end;
 }
 out+=chars.slice(cursor).join('');return {version:1,source:analysis.source,output:out,patches:log,scope:'Draft transformation only. No safety assurance.'};
}
export function restore(packet){
 let chars=Array.from(packet.output),lastEnd=0;
 for(const p of packet.patches){if(p.outputStart<lastEnd||chars.slice(p.outputStart,p.outputEnd).join('')!==p.replacement)throw Error('Edited output cannot be restored using this patch log.');lastEnd=p.outputEnd;}
 for(const p of [...packet.patches].reverse())chars.splice(p.outputStart,p.outputEnd-p.outputStart,...Array.from(p.original));
 const result=chars.join('');if(result!==packet.source)throw Error('Restoration integrity check failed.');return result;
}
export function exportPacket(packet){restore(packet);return JSON.stringify(packet,null,2);}
