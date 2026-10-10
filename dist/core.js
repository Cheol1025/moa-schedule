(function(root){
 'use strict';
 const pad=n=>String(n).padStart(2,'0');
 const iso=d=>String(d.getFullYear()).padStart(4,'0')+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 function date(y,m,d=1){const a=new Date(0);a.setFullYear(y,m,d);a.setHours(12,0,0,0);return a;}
 function parse(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const [y,m,d]=s.split('-').map(Number);if(y<1||y>9999||m<1||m>12||d<1||d>31)return null;const a=date(y,m-1,d);return iso(a)===s?a:null;}
 const days=(y,m)=>date(y,m+1,0).getDate();
 function grid(y,m){const first=date(y,m);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>{const d=date(y,m,i-offset+1);return {key:iso(d),day:d.getDate(),current:d.getMonth()===m&&d.getFullYear()===y,weekday:d.getDay()};});}
 function occurs(e,key){const d=parse(key),s=parse(e.date);if(!d||!s||key<e.date||(e.until&&key>e.until)||(e.exceptions||[]).includes(key))return false;
 if(!e.repeat||e.repeat==='none')return key===e.date;
 if(e.repeat==='daily')return true;
 if(e.repeat==='weekly')return d.getDay()===s.getDay();
 if(e.repeat==='monthly')return d.getDate()===s.getDate();
 return e.repeat==='yearly'&&d.getDate()===s.getDate()&&d.getMonth()===s.getMonth();}
 const blank=()=>({version:1,events:[],tasks:[],projects:[]});
 function validate(v){
 if(!v||v.version!==1||!['events','tasks','projects'].every(k=>Array.isArray(v[k])&&v[k].length<=20000))throw Error('모아 백업 파일을 선택해주세요.');
 const str=(s,max=1000)=>typeof s==='string'&&s.length<=max;
 const id=s=>str(s,100)&&s.length>0;
 const optionalDate=s=>s===''||!!parse(s);
 for(const group of ['events','tasks','projects']){const seen=new Set();for(const x of v[group]){if(!x||!id(x.id)||seen.has(x.id)||!str(x.title,200)||!x.title.trim())throw Error('항목 이름 또는 ID가 올바르지 않습니다.');seen.add(x.id);}}
 for(const p of v.projects){if(!['active','paused','done'].includes(p.status)||!str(p.color,20)||!/^#[0-9a-f]{6}$/i.test(p.color)||!optionalDate(p.deadline)||!str(p.notes,4000)||!str(p.url,2000)||(p.url&&!/^https?:\/\//i.test(p.url)))throw Error('프로젝트 데이터가 올바르지 않습니다.');}
 const pids=new Set(v.projects.map(p=>p.id));
 for(const t of v.tasks){if(!['inbox','todo','doing','waiting','done','cancelled'].includes(t.status)||!['high','normal','low'].includes(t.priority)||!optionalDate(t.due)||!str(t.notes,4000)||!str(t.projectId,100)||(t.projectId&&!pids.has(t.projectId))||(t.url!==undefined&&(!str(t.url,2000)||(t.url&&!/^https?:\/\//i.test(t.url)))))throw Error('할 일 데이터가 올바르지 않습니다.');}
 for(const e of v.events){if(!parse(e.date)||!['none','daily','weekly','monthly','yearly'].includes(e.repeat)||!optionalDate(e.until)||(e.until&&e.until<e.date)||!Array.isArray(e.exceptions)||!e.exceptions.every(x=>!!parse(x))||!str(e.notes,4000)||!str(e.projectId,100)||(e.projectId&&!pids.has(e.projectId))||!str(e.time,5)||!str(e.endTime,5)||![e.time,e.endTime].every(t=>t===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||(e.time&&e.endTime&&e.endTime<=e.time))throw Error('일정 데이터가 올바르지 않습니다.');}
 return JSON.parse(JSON.stringify(v));
 }
 const api={pad,iso,date,parse,days,grid,occurs,blank,validate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PMS=api;
})(typeof window!=='undefined'?window:globalThis);
