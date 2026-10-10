/* Drag and drop for the task board (uses app.js globals: data, mutate, canEdit, today).
   Mouse drags as soon as it moves; touch needs a short press first so the board still scrolls normally. */
(function(){
'use strict';
const PRESS=220,SLOP=8;
let s=null,suppress=false;
function start(e){const card=e.target.closest('.task-card[data-task-id]');if(!card||e.button>0||e.target.closest('select,a,input,.icon-button'))return;const t=data.tasks.find(x=>x.id===card.dataset.taskId);if(!t||!canEdit(t))return;
 s={card,id:t.id,x:e.clientX,y:e.clientY,pid:e.pointerId,touch:e.pointerType!=='mouse',active:false,timer:0};
 if(s.touch)s.timer=setTimeout(()=>{if(s&&!s.active)begin();},PRESS);}
function begin(){const r=s.card.getBoundingClientRect();s.active=true;s.dx=s.x-r.left;s.dy=s.y-r.top;
 const ghost=s.card.cloneNode(true);ghost.classList.add('drag-ghost');ghost.style.width=r.width+'px';document.body.append(ghost);s.ghost=ghost;
 s.ph=document.createElement('div');s.ph.className='drop-placeholder';s.ph.style.height=r.height+'px';s.card.after(s.ph);s.card.classList.add('drag-source');
 document.body.classList.add('dragging-task');navigator.vibrate?.(10);place(s.x,s.y);requestAnimationFrame(tick);}
// Follow the pointer and move the placeholder to where the card would land.
function place(x,y){s.x=x;s.y=y;s.ghost.style.transform=`translate(${x-s.dx}px,${y-s.dy}px) rotate(2deg)`;
 const col=document.elementFromPoint(x,y)?.closest('.task-column[data-status]');document.querySelectorAll('.task-column.drop-target').forEach(c=>{if(c!==col)c.classList.remove('drop-target');});if(!col)return;col.classList.add('drop-target');
 const cards=[...col.querySelectorAll('.task-card[data-task-id]:not(.drag-source)')],before=cards.find(c=>{const r=c.getBoundingClientRect();return y<r.top+r.height/2;});
 if(before){if(before.previousElementSibling!==s.ph)before.before(s.ph);}else if(cards.length){const last=cards[cards.length-1];if(last.nextElementSibling!==s.ph)last.after(s.ph);}else col.querySelector('.task-column-header').after(s.ph);}
// Scroll the board sideways and the page up/down when dragging near an edge.
function tick(){if(!s?.active)return;const board=document.querySelector('.task-board');if(board){const r=board.getBoundingClientRect();if(s.x<r.left+60)board.scrollLeft-=14;else if(s.x>r.right-60)board.scrollLeft+=14;}if(s.y<70)window.scrollBy(0,-14);else if(s.y>innerHeight-70)window.scrollBy(0,14);place(s.x,s.y);requestAnimationFrame(tick);}
function end(cancel){if(!s)return;clearTimeout(s.timer);const st=s;s=null;if(!st.active)return;suppress=true;setTimeout(()=>{suppress=false;},60);
 const col=st.ph.closest('.task-column[data-status]'),ids=col?[...col.querySelectorAll('.task-card[data-task-id]:not(.drag-source),.drop-placeholder')].map(n=>n===st.ph?st.id:n.dataset.taskId):[];
 st.ghost.remove();st.ph.remove();st.card.classList.remove('drag-source');document.body.classList.remove('dragging-task');document.querySelectorAll('.drop-target').forEach(c=>c.classList.remove('drop-target'));
 if(cancel||!col)return;const status=col.dataset.status;
 mutate(d=>{ids.forEach((id,i)=>{const t=d.tasks.find(x=>x.id===id);if(!t||!canEdit(t))return;t.order=i+1;if(id===st.id&&t.status!==status){t.status=status;t.completedAt=status==='done'?today():'';}});});}
document.addEventListener('pointerdown',start);
document.addEventListener('pointermove',e=>{if(!s||e.pointerId!==s.pid)return;const far=Math.hypot(e.clientX-s.x,e.clientY-s.y)>SLOP;if(!s.active){if(s.touch){if(far){clearTimeout(s.timer);s=null;}return;}if(!far)return;begin();}place(e.clientX,e.clientY);});
document.addEventListener('pointerup',e=>{if(s&&e.pointerId===s.pid)end(false);});
document.addEventListener('pointercancel',()=>end(true));
document.addEventListener('touchmove',e=>{if(s?.active)e.preventDefault();},{passive:false});
document.addEventListener('contextmenu',e=>{if(s)e.preventDefault();});
// A drop must not also count as a click that opens the editor.
document.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault();}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&s?.active)end(true);});
})();
