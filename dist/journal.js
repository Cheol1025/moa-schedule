(function(root){
'use strict';
const groups=['events','tasks','projects','groups','members','profiles','posts'];
const owned=['events','tasks','projects','posts'];
function diff(before,after){const changes=[];for(const group of groups){const old=new Map((before[group]||[]).map(x=>[x.id,x])),next=new Map((after[group]||[]).map(x=>[x.id,x]));for(const [id,value]of next)if(JSON.stringify(old.get(id))!==JSON.stringify(value))changes.push({group,id,value});for(const id of old.keys())if(!next.has(id))changes.push({group,id,value:null});}return changes;}
function check(op){if(!op||op.version!==1||typeof op.id!=='string'||op.id.length>100||!op.id||typeof op.device!=='string'||op.device.length>100||!Number.isSafeInteger(op.clock)||op.clock<1||!Array.isArray(op.changes)||op.changes.length>60000)throw Error('동기화 기록 형식이 올바르지 않습니다.');for(const c of op.changes)if(!c||!groups.includes(c.group)||typeof c.id!=='string'||!c.id||c.id.length>200||(c.value!==null&&(!c.value||c.value.id!==c.id)))throw Error('변경 항목 형식이 올바르지 않습니다.');return op;}
// Journal files are compared by content only; `author` comes from Drive metadata and is not part of the identity.
const body=op=>{const {author,...rest}=op;return JSON.stringify(rest);};
function merge(a,b){const map=new Map();for(const op of [...a,...b]){check(op);const prev=map.get(op.id);if(prev&&body(prev)!==body(op))throw Error('같은 ID의 서로 다른 변경 기록이 있습니다.');map.set(op.id,prev&&prev.author&&!op.author?prev:op);}return [...map.values()].sort((x,y)=>x.clock-y.clock||x.device.localeCompare(y.device,'en')||x.id.localeCompare(y.id,'en'));}
// Who may apply a change. `author` is the Drive file owner (set by Google, not by the client), so
// members cannot edit other people's items or the member/group lists even by writing journal files by hand.
function allowed(group,before,value,author,admin){
 if(!author)return false;const isAdmin=!!admin&&author===admin;
 if(group==='groups'||group==='members')return isAdmin;
 if(group==='profiles')return isAdmin||((before||value).id===author);
 if(owned.includes(group)){if(isAdmin)return true;if(before&&before.owner&&before.owner!==author)return false;return !value||value.owner===author;}
 return false;}
function materialize(ops,admin){const maps=Object.fromEntries(groups.map(k=>[k,new Map()]));for(const op of merge([],ops))for(const c of op.changes){const before=maps[c.group].get(c.id);if(admin!==undefined&&!allowed(c.group,before,c.value,op.author,admin))continue;if(c.value===null)maps[c.group].delete(c.id);else maps[c.group].set(c.id,JSON.parse(JSON.stringify(c.value)));}const data={version:1,...Object.fromEntries(groups.map(k=>[k,[...maps[k].values()].sort((a,b)=>a.id.localeCompare(b.id,'en'))]))};const projects=new Set(data.projects.map(p=>p.id));for(const k of ['tasks','events'])for(const x of data[k])if(x.projectId&&!projects.has(x.projectId))x.projectId='';return data;}
const api={diff,check,merge,materialize,allowed};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MoaJournal=api;
})(typeof window!=='undefined'?window:globalThis);
