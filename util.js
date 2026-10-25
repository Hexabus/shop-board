/* Shared helpers: HTML escaping, collision-safe IDs, real timestamps. */
(function(){
'use strict';
var ENT={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
/* Escape text for HTML text and attribute positions. */
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ENT[c];});}
/* Escape a value placed inside a single-quoted JS string within an inline handler attribute. */
function escJs(v){return esc(String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[\r\n]/g,' '));}
/* Unique ID such as "n_ab12cd34-..."; replaces "prefix_"+Date.now(). */
function uid(prefix){
  var r;
  if(window.crypto&&typeof crypto.randomUUID==='function')r=crypto.randomUUID();
  else{r=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);}
  return prefix+'_'+r;
}
/* Human text for when something was created. New records carry createdAt (ISO); older records keep their saved text. */
function whenText(item){
  if(!item)return '';
  var d=item.createdAt?new Date(item.createdAt):null;
  if(!d||isNaN(d.getTime()))return item.timestamp||'';
  var now=new Date(),t=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  var day=new Date(d.getFullYear(),d.getMonth(),d.getDate()),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var diff=Math.round((today-day)/86400000);
  if(diff===0)return 'Today, '+t;
  if(diff===1)return 'Yesterday, '+t;
  var opts={month:'short',day:'numeric'};if(d.getFullYear()!==now.getFullYear())opts.year='numeric';
  return d.toLocaleDateString('en-US',opts)+', '+t;
}
window.esc=esc;window.escJs=escJs;window.uid=uid;window.whenText=whenText;
})();
