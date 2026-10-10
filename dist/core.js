(function(root){
 'use strict';
 const pad=n=>String(n).padStart(2,'0');
 const iso=d=>String(d.getFullYear()).padStart(4,'0')+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 function date(y,m,d=1){const a=new Date(0);a.setFullYear(y,m,d);a.setHours(12,0,0,0);return a;}
 function parse(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const [y,m,d]=s.split('-').map(Number);if(y<1||y>9999||m<1||m>12||d<1||d>31)return null;const a=date(y,m-1,d);return iso(a)===s?a:null;}
 const days=(y,m)=>date(y,m+1,0).getDate();
 function grid(y,m){const first=date(y,m);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>{const d=date(y,m,i-offset+1);return {key:iso(d),day:d.getDate(),current:d.getMonth()===m&&d.getFullYear()===y,weekday:d.getDay()};});}
 function startsOn(e,key){const d=parse(key),s=parse(e.date);if(!d||!s||key<e.date||(e.until&&key>e.until)||(e.exceptions||[]).includes(key))return false;
 if(!e.repeat||e.repeat==='none')return key===e.date;
 if(e.repeat==='daily')return true;
 if(e.repeat==='weekly')return d.getDay()===s.getDay();
 if(e.repeat==='monthly')return d.getDate()===s.getDate();
 if(e.repeat==='lunarYearly'){const a=lunar(key),b=lunar(e.date);return !!a&&!!b&&!a.leap&&a.month===b.month&&a.day===b.day;}
 return e.repeat==='yearly'&&d.getDate()===s.getDate()&&d.getMonth()===s.getMonth();}
 // Multi-day events (endDate) cover every day from each start occurrence through the same span.
 const addDays=(k,n)=>{const a=parse(k);a.setDate(a.getDate()+n);return iso(a);};
 const span=e=>e.endDate?Math.round((parse(e.endDate)-parse(e.date))/86400000):0;
 function occurs(e,key){const n=span(e);if(!n)return startsOn(e,key);if(!parse(key))return false;for(let i=0;i<=n;i++)if(startsOn(e,addDays(key,-i)))return true;return false;}
 // Korean lunar calendar via Intl ('dangi'; falls back to 'chinese' where dangi is missing).
 let lunarFmt=null;const lunarCache=new Map();
 function lunar(key){if(lunarCache.has(key))return lunarCache.get(key);let r=null;try{if(!lunarFmt){lunarFmt=new Intl.DateTimeFormat('ko-KR-u-ca-dangi',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'});if(lunarFmt.resolvedOptions().calendar!=='dangi')lunarFmt=new Intl.DateTimeFormat('ko-KR-u-ca-chinese',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'});}
 const p=lunarFmt.formatToParts(new Date(key+'T12:00:00+09:00')),m=p.find(x=>x.type==='month')?.value||'',d=p.find(x=>x.type==='day')?.value||'';r={month:parseInt(m.match(/\d+/)?.[0],10),day:parseInt(d.match(/\d+/)?.[0],10),leap:/윤|bis|閏|闰/i.test(m)};if(!r.month||!r.day)r=null;}catch(_){r=null;}
 if(lunarCache.size>20000)lunarCache.clear();lunarCache.set(key,r);return r;}
 // Statutory one-off holidays (elections, government-declared temporary holidays).
 const specialHolidays={'2020-04-15':'국회의원 선거일','2020-08-17':'임시공휴일','2022-03-09':'대통령 선거일','2022-06-01':'지방선거일','2023-10-02':'임시공휴일','2024-04-10':'국회의원 선거일','2024-10-01':'임시공휴일','2025-01-27':'임시공휴일','2025-06-03':'대통령 선거일','2026-06-03':'지방선거일','2028-04-12':'국회의원 선거일'};
 const holidayCache=new Map();
 function holidays(y){if(holidayCache.has(y))return holidayCache.get(y);const map=new Map();if(y<1949||y>9999){holidayCache.set(y,map);return map;}
 const add=(k,name,group='')=>{if(!map.has(k))map.set(k,[]);map.get(k).push({name,group});};
 const fixed=[[1,1,'신정'],[3,1,'삼일절'],[6,6,'현충일'],[8,15,'광복절'],[10,3,'개천절'],[12,25,'성탄절']];if(y>=1975)fixed.push([5,5,'어린이날']);if(y>=2013||y<1991)fixed.push([10,9,'한글날']);
 for(const [m,d,n] of fixed)add(iso(date(y,m-1,d)),n);
 const shift=(k,n)=>{const a=parse(k);a.setDate(a.getDate()+n);return iso(a);};
 for(const [m0,d0,len] of [[0,15,42],[3,15,55],[8,1,45]])for(let i=0;i<len;i++){const k=iso(date(y,m0,d0+i)),l=lunar(k);if(!l||l.leap)continue;
  if(l.month===1&&l.day===1){add(shift(k,-1),'설날 연휴','seol');add(k,'설날','seol');add(shift(k,1),'설날 연휴','seol');}
  if(l.month===4&&l.day===8&&y>=1975)add(k,'부처님오신날');
  if(l.month===8&&l.day===15){add(shift(k,-1),'추석 연휴','chuseok');add(k,'추석','chuseok');add(shift(k,1),'추석 연휴','chuseok');}}
 for(const [k,n] of Object.entries(specialHolidays))if(k.startsWith(String(y).padStart(4,'0')+'-'))add(k,n);
 // 대체공휴일: one substitute per triggering date, placed on the next weekday that is not already a holiday.
 if(y>=2014){const eligible=(k,n)=>n==='어린이날'||(['삼일절','광복절','개천절','한글날'].includes(n)&&k>='2021-08-15')||(['부처님오신날','성탄절'].includes(n)&&k>='2023-05-04');
  const triggers=[];for(const [k,list] of [...map].sort()){const wd=parse(k).getDay(),group=list.find(x=>x.group);
   const single=list.some(x=>eligible(k,x.name)),overlap=list.length>1&&(single||group);
   if((single&&(wd===0||wd===6))||(group&&wd===0)||overlap){let after=k;if(group)while(map.get(shift(after,1))?.some(x=>x.group===group.group))after=shift(after,1);triggers.push(after);}}
  for(const after of triggers){let k=shift(after,1);while(parse(k).getDay()===0||parse(k).getDay()===6||map.has(k))k=shift(k,1);if(k.startsWith(String(y).padStart(4,'0')+'-'))add(k,'대체공휴일');}}
 holidayCache.set(y,map);return map;}
 function holidayNames(key){const d=parse(key);return d?(holidays(d.getFullYear()).get(key)||[]).map(x=>x.name):[];}
 const groups=['events','tasks','projects','groups','members','profiles','posts'];
 const blank=()=>({version:1,...Object.fromEntries(groups.map(k=>[k,[]]))});
 // Older backups only had events/tasks/projects; fill the shared-space collections in.
 function normalize(v){if(v&&v.version===1)for(const k of groups)if(v[k]===undefined)v[k]=[];return v;}
 function validate(v){
 v=normalize(v);
 if(!v||v.version!==1||!groups.every(k=>Array.isArray(v[k])&&v[k].length<=20000))throw Error('캘린더 백업 파일을 선택해주세요.');
 const str=(s,max=1000)=>typeof s==='string'&&s.length<=max;
 const id=s=>str(s,200)&&s.length>0;
 const email=s=>str(s,200)&&(s===''||/^[^\s@]+@[^\s@]+$/.test(s));
 const optionalDate=s=>s===''||!!parse(s);
 for(const group of groups){const seen=new Set();for(const x of v[group]){if(!x||!id(x.id)||seen.has(x.id))throw Error('항목 ID가 올바르지 않습니다.');seen.add(x.id);if(['events','tasks','projects','groups'].includes(group)&&(!str(x.title,200)||!x.title.trim()))throw Error('항목 이름이 올바르지 않습니다.');if(['events','tasks','projects','posts'].includes(group)&&!email(x.owner??''))throw Error('작성자 정보가 올바르지 않습니다.');}}
 for(const p of v.projects){if(!['active','paused','done'].includes(p.status)||!str(p.color,20)||!/^#[0-9a-f]{6}$/i.test(p.color)||!optionalDate(p.deadline)||!str(p.notes,4000)||!str(p.url,2000)||(p.url&&!/^https?:\/\//i.test(p.url)))throw Error('프로젝트 데이터가 올바르지 않습니다.');}
 const pids=new Set(v.projects.map(p=>p.id));
 for(const t of v.tasks){if(!['inbox','todo','doing','waiting','done','cancelled'].includes(t.status)||!['high','normal','low'].includes(t.priority)||!optionalDate(t.due)||!optionalDate(t.start??'')||(t.start&&t.due&&t.start>t.due)||!str(t.notes,4000)||!str(t.projectId,100)||(t.projectId&&!pids.has(t.projectId))||(t.url!==undefined&&(!str(t.url,2000)||(t.url&&!/^https?:\/\//i.test(t.url)))))throw Error('할 일 데이터가 올바르지 않습니다.');}
 for(const e of v.events){if(!parse(e.date)||!['none','daily','weekly','monthly','yearly','lunarYearly'].includes(e.repeat)||!optionalDate(e.until)||(e.until&&e.until<e.date)||!Array.isArray(e.exceptions)||!e.exceptions.every(x=>!!parse(x))||!str(e.notes,4000)||!str(e.projectId,100)||(e.projectId&&!pids.has(e.projectId))||!str(e.share??'',200)||!optionalDate(e.endDate??'')||(e.endDate&&(e.endDate<=e.date||e.time||e.endTime||span(e)>366))||!str(e.time,5)||!str(e.endTime,5)||![e.time,e.endTime].every(t=>t===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||(e.time&&e.endTime&&e.endTime<=e.time))throw Error('일정 데이터가 올바르지 않습니다.');}
 for(const g of v.groups){if(!/^#[0-9a-f]{6}$/i.test(g.color)||!Array.isArray(g.members)||g.members.length>500||!g.members.every(m=>email(m)&&m))throw Error('그룹 데이터가 올바르지 않습니다.');}
 for(const m of v.members){if(!email(m.email)||!m.email||m.id!==m.email||!['admin','member'].includes(m.role))throw Error('멤버 데이터가 올바르지 않습니다.');}
 for(const p of v.profiles){if(!email(p.id)||!str(p.name,50))throw Error('프로필 데이터가 올바르지 않습니다.');}
 for(const p of v.posts){if(!str(p.text,4000)||!str(p.createdAt,40)||!Array.isArray(p.files)||p.files.length>10||!p.files.every(f=>f&&id(f.id)&&str(f.thumb??'',200)&&str(f.name,300)&&str(f.mime,200)&&Number.isFinite(f.size)&&typeof f.image==='boolean'))throw Error('게시글 데이터가 올바르지 않습니다.');}
 return JSON.parse(JSON.stringify(v));
 }
 const api={span,addDays,groups,pad,iso,date,parse,days,grid,occurs,blank,normalize,validate,lunar,holidays,holidayNames};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PMS=api;
})(typeof window!=='undefined'?window:globalThis);
