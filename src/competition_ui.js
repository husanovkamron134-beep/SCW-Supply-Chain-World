/* SCW Phase 14 — musobaqa interfeysi (o‘qituvchi va talaba). Backend: backend/competition.py (/api/comp/*). */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s===null||s===undefined?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const store={get(k){try{return window.localStorage.getItem(k)}catch(e){return null}},set(k,v){try{window.localStorage.setItem(k,v)}catch(e){}}};
const sess={get(k){try{return window.sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{v===null?window.sessionStorage.removeItem(k):window.sessionStorage.setItem(k,v)}catch(e){}}};
const S={base:store.get("scw-comp-base")||"",token:sess.get("scw-comp-token")||"",me:null,list:[],cid:null,tab:"assign",
 ov:null,tasks:[],decs:[],teams:[],studs:[],fin:null,round:null,review:null,my:null,authMode:"login"};
const ROLE_FIELD={procurement:"order_qty",supplier:"supplier",production:"production_qty",warehouse:"safety_stock",transport:"mode"};
const ROLE_NAMES={procurement:"Procurement Manager",supplier:"Supplier Manager",production:"Production Manager",warehouse:"Warehouse Manager",transport:"Transport Manager"};
const FIELD_LABEL={order_qty:"Xarid buyurtma miqdori (dona)",supplier:"Yetkazib beruvchi",production_qty:"Ishlab chiqarish miqdori (dona)",safety_stock:"Xavfsizlik zaxirasi (dona)",mode:"Transport turi"};
const STATUS={SETUP:["Tayyorgarlik","info"],RUNNING:["Davom etmoqda","warn"],FINISHED:["Yakunlangan",""]};
const TASK_ST={ASSIGNED:["Tayinlangan","info"],SUBMITTED:["Tekshiruvda","warn"],RETURNED:["Qaytarilgan","bad"],APPROVED:["Tasdiqlangan",""]};
const num=v=>v===null||v===undefined?"—":(Math.round(Number(v)*100)/100).toString();

function toast(msg,isErr){const t=$("toast");if(!t)return;t.textContent=msg;t.className="toast show"+(isErr?" err":"");clearTimeout(toast.t);toast.t=setTimeout(()=>{t.className="toast"},isErr?5000:2600)}
function errText(j,status){
 const d=j&&j.detail;
 if(typeof d==="string")return d;
 if(d&&d.message)return d.message+" "+((d.problems||d.blockers||[]).join(" "));
 if(Array.isArray(d))return d.map(x=>x.msg).join("; ");
 return "Xato "+status;
}
async function api(method,path,body){
 if(!S.base)throw Error("Avval backend API manzilini kiriting.");
 const res=await fetch(S.base.replace(/\/+$/,"")+path,{method,headers:Object.assign({"Content-Type":"application/json"},S.token?{Authorization:"Bearer "+S.token}:{}),body:body===undefined?undefined:JSON.stringify(body)});
 let j=null;try{j=await res.json()}catch(e){}
 if(!res.ok){const e=new Error(errText(j,res.status));e.status=res.status;throw e}
 return j;
}
const P=(tail)=>"/api/comp/competitions/"+S.cid+(tail||"");

/* ---------------- ma’lumot yuklash ---------------- */
async function loadMe(){
 try{S.me=await api("GET","/api/comp/me")}catch(e){if(e.status===401){S.token="";sess.set("scw-comp-token",null)}S.me=null;throw e}
 S.list=await api("GET","/api/comp/competitions");
}
async function refreshTeacher(){
 S.ov=await api("GET",P());
 const started=S.ov.status!=="SETUP";
 const jobs=[started?api("GET",P("/tasks")):[],started?api("GET",P("/decisions")):[],started?api("GET",P("/results/teams")):[],started?api("GET",P("/results/students")):[],S.ov.status==="RUNNING"?api("GET",P("/finalization")):null];
 [S.tasks,S.decs,S.teams,S.studs,S.fin]=await Promise.all(jobs);
 const rounds=[...new Set(S.decs.map(d=>d.round))].sort((a,b)=>a-b);
 if(S.round===null||!rounds.includes(S.round))S.round=rounds.length?rounds[rounds.length-1]:null;
}
async function refreshStudent(){
 S.my=await api("GET",P("/me"));
 [S.teams,S.studs]=await Promise.all([api("GET",P("/results/teams")),api("GET",P("/results/students"))]);
}

/* ---------------- ko‘rinishlar ---------------- */
function kv(v){
 if(Array.isArray(v)){
  if(v.length&&typeof v[0]==="object"){const cols=Object.keys(v[0]);return "<div class=\"table-wrap\"><table style=\"min-width:0\"><thead><tr>"+cols.map(c=>"<th>"+esc(c)+"</th>").join("")+"</tr></thead><tbody>"+v.map(r=>"<tr>"+cols.map(c=>"<td>"+kv(r[c])+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>"}
  return esc(v.join(", "));
 }
 if(v&&typeof v==="object")return "<table style=\"min-width:0\"><tbody>"+Object.keys(v).map(k=>"<tr><th>"+esc(k)+"</th><td>"+kv(v[k])+"</td></tr>").join("")+"</tbody></table>";
 return esc(v);
}
function badge(map,key){const m=map[key]||[key,"info"];return "<span class=\"badge "+m[1]+"\">"+esc(m[0])+"</span>"}

function viewAuth(){
 const reg=S.authMode==="register";
 return "<div class=\"panel\" style=\"max-width:520px;margin:20px auto\"><div class=\"panel-head\"><h3>"+(reg?"Ro‘yxatdan o‘tish":"Tizimga kirish")+"</h3><span class=\"sub\">SCW MUSOBAQA</span></div>"+
  "<div class=\"field\"><label>Backend API manzili</label><input id=\"apiBase\" placeholder=\"https://scw-api.example.com\" value=\""+esc(S.base)+"\"></div>"+
  (reg?"<div class=\"field\"><label>Siz kimsiz?</label><select id=\"kind\"><option value=\"student\">Talaba</option><option value=\"teacher\">O‘qituvchi</option></select></div><div class=\"field\"><label>To‘liq ism</label><input id=\"fullName\" maxlength=\"100\"></div>":"")+
  "<div class=\"field\"><label>Email</label><input id=\"email\" type=\"email\" autocomplete=\"username\"></div>"+
  "<div class=\"field\"><label>Parol (kamida 10 belgi)</label><input id=\"password\" type=\"password\" autocomplete=\"current-password\"></div>"+
  (reg?"<div class=\"field\" id=\"inviteBox\" style=\"display:none\"><label>O‘qituvchi taklif kodi (agar server talab qilsa)</label><input id=\"invite\"></div>":"")+
  "<div class=\"row\"><button class=\"btn primary\" data-act=\""+(reg?"register":"login")+"\">"+(reg?"Ro‘yxatdan o‘tish":"Kirish")+"</button><button class=\"btn\" data-act=\"authMode\">"+(reg?"Hisobim bor":"Yangi hisob")+"</button></div></div>";
}
function viewHome(){
 const teacher=S.me.kind==="teacher";
 const rows=S.list.map(c=>"<tr><td>"+esc(c.title)+"</td><td>"+badge(STATUS,c.status)+"</td><td>"+(c.current_round?Math.min(c.current_round,c.rounds_total)+" / "+c.rounds_total:"—")+"</td>"+(teacher?"<td><b>"+esc(c.code)+"</b></td>":"")+"<td><button class=\"btn\" data-act=\"open\" data-id=\""+esc(c.id)+"\">Ochish</button></td></tr>").join("");
 return "<div class=\"head\"><div class=\"eyebrow\">"+(teacher?"O‘QITUVCHI":"TALABA")+"</div><h2>Musobaqalar</h2><p>"+esc(S.me.full_name)+"</p></div>"+
  (teacher?"<div class=\"panel\"><div class=\"panel-head\"><h3>Yangi musobaqa</h3></div><div class=\"two\"><div class=\"field\"><label>Nomi</label><input id=\"newTitle\" maxlength=\"120\" placeholder=\"masalan: SCM-21 guruh musobaqasi\"></div><div class=\"field\"><label>Raundlar soni (3–12)</label><input id=\"newRounds\" type=\"number\" min=\"3\" max=\"12\" value=\"6\"></div></div><button class=\"btn primary\" data-act=\"createComp\">＋ Yaratish</button></div>"
   :"<div class=\"panel\"><div class=\"panel-head\"><h3>Sinfga qo‘shilish</h3></div><div class=\"field\"><label>O‘qituvchi bergan sinf kodi</label><input id=\"joinCode\" maxlength=\"10\" style=\"text-transform:uppercase\" placeholder=\"ABC123\"></div><button class=\"btn primary\" data-act=\"join\">Qo‘shilish</button></div>")+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Mening musobaqalarim</h3></div>"+(S.list.length?"<div class=\"table-wrap\"><table><thead><tr><th>Nomi</th><th>Holat</th><th>Raund</th>"+(teacher?"<th>Sinf kodi</th>":"")+"<th></th></tr></thead><tbody>"+rows+"</tbody></table></div>":"<p class=\"muted\">Hozircha musobaqa yo‘q.</p>")+"</div>";
}

/* ----- o‘qituvchi ----- */
function tabsHtml(){
 const T=[["assign","Taqsimot"],["tasks","Topshiriqlar"],["rounds","Raundlar va qarorlar"],["results","Natijalar"],["final","Yakunlash"]];
 return "<div class=\"tabs\">"+T.map(t=>"<button class=\"tab"+(S.tab===t[0]?" on":"")+"\" data-act=\"tab\" data-id=\""+t[0]+"\">"+t[1]+"</button>").join("")+"</div>";
}
function tAssign(){
 const o=S.ov,setup=o.status==="SETUP",teamName=id=>{const t=o.teams.find(x=>x.id===id);return t?t.name:"—"};
 const rows=o.enrollments.map(e=>"<tr><td>"+esc(e.name)+"<br><span class=\"muted\">"+esc(e.email)+"</span></td><td>"+(setup?"<select data-change=\"setTeam\" data-id=\""+esc(e.id)+"\"><option value=\"\">— yo‘q —</option>"+o.teams.map(t=>"<option value=\""+esc(t.id)+"\""+(e.team_id===t.id?" selected":"")+">"+esc(t.name)+"</option>").join("")+"</select>":esc(teamName(e.team_id)))+"</td><td>"+(setup?"<select data-change=\"setRole\" data-id=\""+esc(e.id)+"\"><option value=\"\">— yo‘q —</option>"+Object.keys(ROLE_NAMES).map(r=>"<option value=\""+r+"\""+(e.role===r?" selected":"")+">"+ROLE_NAMES[r]+"</option>").join("")+"</select>":esc(e.role_name||"—"))+"</td></tr>").join("");
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>Talabalar ("+o.enrollments.length+")</h3>"+(setup?"<div class=\"row\"><select id=\"teamCount\" style=\"width:auto\"><option value=\"\">Jamoalar soni: avtomatik"+(o.suggested_team_count?" ("+o.suggested_team_count+")":"")+"</option><option>2</option><option>3</option><option>4</option></select><button class=\"btn primary\" data-act=\"autoAssign\">⚖ Teng taqsimlash va rol berish</button></div>":"")+"</div>"+
  (o.enrollments.length?"<div class=\"table-wrap\"><table><thead><tr><th>Talaba</th><th>Jamoa</th><th>Rol</th></tr></thead><tbody>"+rows+"</tbody></table></div>":"<p class=\"muted\">Talabalar sinf kodi bilan qo‘shiladi: <b>"+esc(o.code)+"</b></p>")+
  (setup?(o.problems.length?"<div style=\"margin-top:10px\">"+o.problems.map(p=>"<div class=\"problem\">• "+esc(p)+"</div>").join("")+"</div>":"<p class=\"ok\" style=\"margin-top:10px\">Taqsimot to‘g‘ri — musobaqani boshlash mumkin.</p>")+"<div class=\"row\" style=\"margin-top:10px\"><button class=\"btn primary\" data-act=\"start\""+(o.problems.length||!o.enrollments.length?" disabled":"")+">▶ Musobaqani boshlash</button></div><p class=\"muted\" style=\"margin-top:10px\">Qoidalar: 2–4 jamoa, har birida kamida 5 talaba, har bir talabaga 5 ta roldan biri, har jamoada 5 rol to‘liq. Boshlangandan keyin tayinlovni o‘zgartirib bo‘lmaydi.</p>":"")+"</div>";
}
function reviewPanel(){
 const t=S.tasks.find(x=>x.id===S.review);if(!t)return "";
 const c=t.content;
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>"+esc(t.student)+" — "+esc(ROLE_NAMES[t.role])+"</h3>"+badge(TASK_ST,t.status)+"</div>"+
  "<div class=\"card\"><h4>"+esc(c.title)+"</h4>"+c.scenario.map(x=>"<p>"+esc(x)+"</p>").join("")+"<details><summary>Ma’lumotlar</summary>"+kv(c.data)+"</details><ol>"+c.questions.map(q=>"<li>"+esc(q)+"</li>").join("")+"</ol></div>"+
  "<h4>Talaba javobi</h4>"+(t.answer?"<pre class=\"ans\">"+esc(t.answer)+"</pre>":"<p class=\"muted\">Hali javob topshirilmagan.</p>")+
  "<details><summary>Tayyor javob (faqat o‘qituvchiga)</summary>"+kv(c.reference)+"</details>"+
  (t.status==="SUBMITTED"||t.status==="APPROVED"&&S.ov.status!=="FINISHED"?"<h4>Baholash (100 ball)</h4><div class=\"two\">"+c.rubric.map((r,i)=>"<div class=\"field\"><label>"+esc(r.criterion)+" (0–"+r.max+")</label><input type=\"number\" min=\"0\" max=\""+r.max+"\" step=\"0.5\" id=\"crit"+i+"\" value=\""+(t.criteria&&t.criteria[r.criterion]!==undefined?esc(t.criteria[r.criterion]):"")+"\"></div>").join("")+"</div>"+
   "<div class=\"field\"><label>Yoki umumiy ball (0–100) — mezonlar kiritilsa, yig‘indi olinadi</label><input id=\"totalScore\" type=\"number\" min=\"0\" max=\"100\" step=\"0.5\" value=\""+(t.score===null?"":esc(t.score))+"\"></div>"+
   "<div class=\"field\"><label>Fikr-mulohaza (qaytarishda majburiy)</label><textarea id=\"fb\">"+esc(t.feedback)+"</textarea></div>"+
   "<div class=\"row\"><button class=\"btn primary\" data-act=\"approve\" data-id=\""+esc(t.id)+"\">✓ Tasdiqlash</button><button class=\"btn danger\" data-act=\"return\" data-id=\""+esc(t.id)+"\">↩ Qayta ishlashga qaytarish</button></div>":"")+"</div>";
}
function tTasks(){
 if(S.ov.status==="SETUP")return "<div class=\"panel\"><p class=\"muted\">Topshiriqlar musobaqa boshlangach tayinlanadi.</p></div>";
 const rows=S.tasks.map(t=>"<tr><td>"+esc(t.student)+"</td><td>"+esc(ROLE_NAMES[t.role])+"</td><td>"+badge(TASK_ST,t.status)+"</td><td>"+(t.status==="APPROVED"?num(t.score):"—")+"</td><td><button class=\"btn\" data-act=\"review\" data-id=\""+esc(t.id)+"\">Ko‘rish</button></td></tr>").join("");
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>Individual case topshiriqlar</h3><span class=\"sub\">"+S.tasks.filter(t=>t.status==="SUBMITTED").length+" ta tekshiruv kutmoqda</span></div><div class=\"table-wrap\"><table><thead><tr><th>Talaba</th><th>Rol</th><th>Holat</th><th>Ball</th><th></th></tr></thead><tbody>"+rows+"</tbody></table></div></div>"+reviewPanel();
}
function tRounds(){
 const o=S.ov;
 if(o.status==="SETUP")return "<div class=\"panel\"><p class=\"muted\">Raundlar musobaqa boshlangach ochiladi.</p></div>";
 const next=o.current_round<=o.rounds_total;
 const rounds=[...new Set(S.decs.map(d=>d.round))].sort((a,b)=>a-b);
 const list=S.decs.filter(d=>d.round===S.round);
 const rows=list.map(d=>"<tr><td>"+esc(d.student)+"</td><td>"+esc(d.team)+"</td><td>"+esc(d.role)+"</td><td>"+(d.submitted?esc(JSON.stringify(d.payload)):"<span class=\"bad\">topshirmagan</span>")+(d.applied?" <span class=\"badge\">qo‘llandi</span>":"")+"</td><td>"+num(d.auto_score)+"</td><td><input type=\"number\" min=\"0\" max=\"100\" step=\"0.5\" id=\"ds"+esc(d.id)+"\" value=\""+(d.score===null?"":esc(d.score))+"\"> <button class=\"btn\" data-act=\"grade\" data-id=\""+esc(d.id)+"\">Saqlash</button></td></tr>").join("");
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>"+(next?"Joriy raund: "+o.current_round+" / "+o.rounds_total:"Barcha raundlar yakunlangan")+"</h3>"+(o.status==="RUNNING"&&next?"<button class=\"btn primary\" data-act=\"resolve\">▶ Raundni yakunlash va hisoblash</button>":"")+"</div><p class=\"muted\">Talabalar joriy raund uchun qaror yuboradi. Topshirmagan jamoa roli uchun oldingi (yoki standart) qaror qo‘llanadi, topshirmagan talaba 0 ball oladi. Bir rolda bir nechta talaba bo‘lsa, birinchi topshirgan talabaning qarori qo‘llanadi, boshqalari ham alohida baholanadi.</p></div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Operatsion qarorlarni baholash</h3><div class=\"row\">"+rounds.map(r=>"<button class=\"tab"+(r===S.round?" on":"")+"\" data-act=\"round\" data-id=\""+r+"\">"+r+"-raund</button>").join("")+(o.status==="RUNNING"?"<button class=\"btn\" data-act=\"acceptAuto\">✓ Avtomatik ballarni qabul qilish (hammasi)</button>":"")+"</div></div>"+
  (rows?"<div class=\"table-wrap\"><table><thead><tr><th>Talaba</th><th>Jamoa</th><th>Rol</th><th>Qaror</th><th>Avto-ball</th><th>Yakuniy ball (0–100)</th></tr></thead><tbody>"+rows+"</tbody></table></div>":"<p class=\"muted\">Hali yakunlangan raund yo‘q.</p>")+"</div>";
}
function teamTable(){
 if(!S.teams.length)return "<p class=\"muted\">Natija yo‘q.</p>";
 return "<div class=\"table-wrap\"><table><thead><tr><th>#</th><th>Jamoa</th><th>Ball</th><th>Service level %</th><th>OTIF %</th><th>Mijoz qoniqishi</th><th>Xarajat</th><th>Foyda</th><th>Raund</th></tr></thead><tbody>"+S.teams.map(t=>"<tr><td>"+(t.rank||"—")+"</td><td>"+esc(t.name)+"</td><td><b>"+num(t.team_score)+"</b></td><td>"+num(t.avg_service_level_pct)+"</td><td>"+num(t.avg_otif_pct)+"</td><td>"+num(t.avg_customer_satisfaction)+"</td><td>"+num(t.total_cost)+"</td><td>"+num(t.total_profit)+"</td><td>"+t.rounds_played+"</td></tr>").join("")+"</tbody></table></div>";
}
function studTable(){
 if(!S.studs.length)return "<p class=\"muted\">Natija yo‘q.</p>";
 return "<div class=\"table-wrap\"><table><thead><tr><th>#</th><th>Talaba</th><th>Jamoa</th><th>Rol</th><th>Case o‘rtacha</th><th>Qarorlar o‘rtacha</th><th>Individual baho</th></tr></thead><tbody>"+S.studs.map(s=>"<tr><td>"+(s.rank||"—")+"</td><td>"+esc(s.name)+"</td><td>"+esc(s.team||"—")+"</td><td>"+esc(s.role||"—")+"</td><td>"+num(s.case_average)+"</td><td>"+num(s.decision_average)+"</td><td><b>"+num(s.individual_score)+"</b>"+(s.individual_score!==null&&!s.complete?" <span class=\"badge warn\">oraliq</span>":"")+"</td></tr>").join("")+"</tbody></table></div><p class=\"muted\" style=\"margin-top:8px\">Individual baho = Case o‘rtacha × 0.5 + Qarorlar o‘rtacha × 0.5. Jamoaning yuqori natijasi talabaga avtomatik yuqori individual baho bermaydi.</p>";
}
function tResults(){
 if(S.ov.status==="SETUP")return "<div class=\"panel\"><p class=\"muted\">Natijalar musobaqa boshlangach ko‘rinadi.</p></div>";
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>Jamoaviy natija (KPI)</h3><span class=\"sub\">JAMOALAR REYTINGI</span></div>"+teamTable()+"</div><div class=\"panel\"><div class=\"panel-head\"><h3>Individual natija</h3><span class=\"sub\">TALABALAR REYTINGI</span></div>"+studTable()+"</div>";
}
function tFinal(){
 const o=S.ov;
 if(o.status==="FINISHED")return "<div class=\"panel\"><h3>✅ Musobaqa yakunlangan</h3><p class=\"muted\">Natijalar qayd etilgan, o‘zgartirib bo‘lmaydi. Talabalar endi umumiy reytingni ko‘ra oladi.</p></div>";
 if(o.status==="SETUP")return "<div class=\"panel\"><p class=\"muted\">Avval musobaqani boshlang.</p></div>";
 const f=S.fin||{ready:false,blockers:[]};
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>Yakunlash shartlari</h3>"+(f.ready?"<span class=\"badge\">Tayyor</span>":"<span class=\"badge bad\">Bloklangan</span>")+"</div>"+(f.blockers.length?f.blockers.map(b=>"<div class=\"problem\">• "+esc(b)+"</div>").join(""):"<p class=\"ok\">Barcha shartlar bajarilgan.</p>")+"<div class=\"row\" style=\"margin-top:12px\"><button class=\"btn primary\" data-act=\"finalize\""+(f.ready?"":" disabled")+">🏁 Musobaqani yakunlash</button><button class=\"btn\" data-act=\"recheck\">↻ Qayta tekshirish</button></div></div>";
}
function viewTeacher(){
 const o=S.ov;
 const body={assign:tAssign,tasks:tTasks,rounds:tRounds,results:tResults,final:tFinal}[S.tab]();
 return "<div class=\"row\" style=\"margin-bottom:10px\"><button class=\"btn\" data-act=\"home\">← Musobaqalar</button></div>"+
  "<div class=\"head\"><div class=\"eyebrow\">O‘QITUVCHI PANELI</div><h2>"+esc(o.title)+"</h2><p>"+badge(STATUS,o.status)+" &nbsp; Raund: "+(o.current_round?Math.min(o.current_round,o.rounds_total):0)+" / "+o.rounds_total+"</p></div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Sinf kodi</h3><span class=\"sub\">TALABALARGA BERING</span></div><div class=\"code\">"+esc(o.code)+"</div></div>"+tabsHtml()+body;
}

/* ----- talaba ----- */
function taskCard(){
 const t=S.my.task;
 if(!t)return "<div class=\"panel\"><div class=\"panel-head\"><h3>Individual case topshirig‘i</h3></div><p class=\"muted\">Topshiriq musobaqa boshlanganda tayinlanadi.</p></div>";
 const c=t.content,canEdit=t.status==="ASSIGNED"||t.status==="RETURNED";
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>Individual case: "+esc(c.title)+"</h3>"+badge(TASK_ST,t.status)+"</div>"+c.scenario.map(x=>"<p class=\"muted\">"+esc(x)+"</p>").join("")+"<details open><summary>Ma’lumotlar</summary>"+kv(c.data)+"</details><ol>"+c.questions.map(q=>"<li class=\"muted\">"+esc(q)+"</li>").join("")+"</ol>"+
  "<details><summary>Baholash mezonlari (100 ball)</summary>"+kv(c.rubric)+"</details>"+
  (t.status==="APPROVED"?"<div class=\"card\"><h4>Sizning balingiz: "+num(t.score)+" / 100</h4>"+(t.feedback?"<p>"+esc(t.feedback)+"</p>":"")+(t.criteria?kv(t.criteria):"")+"</div>":"")+
  (t.status==="RETURNED"?"<div class=\"card\"><h4>Qayta ishlash uchun qaytarildi</h4><p>"+esc(t.feedback)+"</p></div>":"")+
  (canEdit?"<div class=\"field\"><label>Javobingiz (hisob-kitob va asoslash)</label><textarea id=\"answer\" maxlength=\"20000\">"+esc(t.answer)+"</textarea></div><button class=\"btn primary\" data-act=\"submitTask\">Javobni topshirish</button>":"<h4>Topshirilgan javob</h4><pre class=\"ans\">"+esc(t.answer)+"</pre>")+"</div>";
}
function decisionCard(){
 const m=S.my,cur=m.current_round;
 if(m.competition.status==="SETUP")return "<div class=\"panel\"><p class=\"muted\">Musobaqa hali boshlanmagan. O‘qituvchi boshlaganida jamoa va topshiriq ko‘rinadi.</p></div>";
 if(!cur)return "<div class=\"panel\"><div class=\"panel-head\"><h3>Operatsion qarorlar</h3></div><p class=\"muted\">"+(m.competition.status==="FINISHED"?"Musobaqa yakunlangan.":"Barcha raundlar yakunlangan; o‘qituvchi baholashini kuting.")+"</p></div>";
 const f=ROLE_FIELD[m.role],st=m.team_state||{};
 let input;
 if(f==="supplier"){const o=m.options.suppliers;input="<select id=\"decValue\">"+Object.keys(o).map(k=>"<option value=\""+k+"\""+(cur.my_decision&&cur.my_decision[f]===k?" selected":"")+">"+k+" — narx "+o[k].price+", OTIF "+Math.round(o[k].otif*100)+"%, brak "+Math.round(o[k].defect*100)+"%, muddat "+o[k].lead_days+" kun</option>").join("")+"</select>"}
 else if(f==="mode"){const o=m.options.modes;input="<select id=\"decValue\">"+Object.keys(o).map(k=>"<option value=\""+k+"\""+(cur.my_decision&&cur.my_decision[f]===k?" selected":"")+">"+k+" — sig‘im "+o[k].cap+" dona/qatnov, qatnov narxi "+o[k].cost+", o‘z vaqtida "+Math.round(o[k].ontime*1000)/10+"%</option>").join("")+"</select>"}
 else input="<input id=\"decValue\" type=\"number\" min=\"0\" max=\"5000\" step=\"1\" value=\""+(cur.my_decision?esc(cur.my_decision[f]):"")+"\">";
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>"+cur.round+"-raund: sizning qaroringiz ("+esc(m.role_name)+")</h3><span class=\"sub\">PROGNOZ: "+cur.forecast+" DONA</span></div>"+
  "<div class=\"metrics\" style=\"grid-template-columns:repeat(3,minmax(0,1fr))\"><div class=\"metric\"><small>Xomashyo zaxirasi</small><strong>"+num(st.raw)+"</strong></div><div class=\"metric\"><small>Tayyor mahsulot zaxirasi</small><strong>"+num(st.finished)+"</strong></div><div class=\"metric\"><small>Yo‘ldagi (kechikkan) yuk</small><strong>"+num(st.pending)+"</strong></div></div>"+
  "<div class=\"field\"><label>"+esc(FIELD_LABEL[f])+"</label>"+input+"</div><button class=\"btn primary\" data-act=\"submitDecision\">Qarorni yuborish</button>"+(cur.my_decision?"<span class=\"ok\" style=\"margin-left:10px\">✓ Yuborilgan (raund yakunlanguncha o‘zgartirish mumkin)</span>":"")+
  "<p class=\"muted\" style=\"margin-top:10px\">Qarorlar jamoa KPI ga ta’sir qiladi: xarid → zaxira va xarajat; yetkazib beruvchi → narx, OTIF, brak; ishlab chiqarish → tayyor mahsulot va quvvat; ombor → xavfsizlik zaxirasi (ATP); transport → xarajat va o‘z vaqtida yetkazish.</p></div>";
}
function viewStudent(){
 const m=S.my,res=m.my_result;
 const hist=m.team_history.map(h=>"<tr><td>"+h.round+"</td><td>"+h.kpi.demand+"</td><td>"+h.kpi.shipped+"</td><td>"+num(h.kpi.service_level_pct)+"</td><td>"+num(h.kpi.otif_pct)+"</td><td>"+num(h.kpi.customer_satisfaction)+"</td><td>"+num(h.kpi.total_cost)+"</td><td><b>"+num(h.kpi.round_score)+"</b></td></tr>").join("");
 const myDecs=m.my_decisions.map(d=>"<tr><td>"+d.round+"</td><td>"+(d.submitted?esc(JSON.stringify(d.payload)):"<span class=\"bad\">topshirilmagan</span>")+"</td><td>"+(d.score===null?"—":num(d.score))+"</td><td>"+esc(d.feedback)+"</td></tr>").join("");
 return "<div class=\"row\" style=\"margin-bottom:10px\"><button class=\"btn\" data-act=\"home\">← Musobaqalar</button><button class=\"btn\" data-act=\"reload\">↻ Yangilash</button></div>"+
  "<div class=\"head\"><div class=\"eyebrow\">TALABA</div><h2>"+esc(m.competition.title)+"</h2><p>"+badge(STATUS,m.competition.status)+"</p></div>"+
  "<div class=\"metrics\"><div class=\"metric\"><small>Jamoa</small><strong>"+esc(m.team||"—")+"</strong></div><div class=\"metric\"><small>Rolim</small><strong style=\"font-size:16px\">"+esc(m.role_name||"—")+"</strong></div><div class=\"metric\"><small>Individual baho</small><strong>"+(res&&res.individual_score!==null?num(res.individual_score):"—")+"</strong><span class=\"good\">"+(res&&res.individual_score!==null&&!res.complete?"oraliq":"Case×0.5 + Qarorlar×0.5")+"</span></div><div class=\"metric\"><small>Raund</small><strong>"+(m.competition.current_round?Math.min(m.competition.current_round,m.competition.rounds_total):0)+" / "+m.competition.rounds_total+"</strong></div></div>"+
  (m.teammates.length?"<div class=\"panel\"><div class=\"panel-head\"><h3>Jamoa a’zolari</h3></div><div class=\"row\">"+m.teammates.map(x=>"<span class=\"badge info\">"+esc(x.name)+" · "+esc(x.role)+"</span>").join("")+"</div></div>":"")+
  decisionCard()+taskCard()+
  (res?"<div class=\"panel\"><div class=\"panel-head\"><h3>Mening natijam</h3><span class=\"sub\">INDIVIDUAL</span></div><div class=\"metrics\" style=\"grid-template-columns:repeat(3,minmax(0,1fr))\"><div class=\"metric\"><small>Case o‘rtacha</small><strong>"+num(res.case_average)+"</strong></div><div class=\"metric\"><small>Qarorlar o‘rtacha</small><strong>"+num(res.decision_average)+"</strong></div><div class=\"metric\"><small>Yakuniy individual</small><strong>"+num(res.individual_score)+"</strong></div></div>"+(myDecs?"<div class=\"table-wrap\"><table><thead><tr><th>Raund</th><th>Qaror</th><th>Ball</th><th>Izoh</th></tr></thead><tbody>"+myDecs+"</tbody></table></div>":"")+"</div>":"")+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Jamoa KPI tarixi</h3><span class=\"sub\">JAMOAVIY NATIJA</span></div>"+(hist?"<div class=\"table-wrap\"><table><thead><tr><th>Raund</th><th>Talab</th><th>Yetkazildi</th><th>Service %</th><th>OTIF %</th><th>Qoniqish</th><th>Xarajat</th><th>Ball</th></tr></thead><tbody>"+hist+"</tbody></table></div>":"<p class=\"muted\">Hali natija yo‘q.</p>")+"</div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Jamoalar reytingi</h3></div>"+teamTable()+"</div>"+
  (m.competition.status==="FINISHED"?"<div class=\"panel\"><div class=\"panel-head\"><h3>Talabalar reytingi</h3></div>"+studTable()+"</div>":"");
}

/* ---------------- chizish ---------------- */
function render(){
 const root=$("root");if(!root)return;
 $("who").textContent=S.me?S.me.full_name+" ("+(S.me.kind==="teacher"?"o‘qituvchi":"talaba")+")":"";
 $("logoutBtn").style.display=S.me?"":"none";
 if(!S.me){root.innerHTML=viewAuth();return}
 if(!S.cid){root.innerHTML=viewHome();return}
 root.innerHTML=S.me.kind==="teacher"?(S.ov?viewTeacher():""):(S.my?viewStudent():"");
}
const val=id=>{const e=$(id);return e?e.value:""};

/* ---------------- amallar ---------------- */
async function reload(){
 if(!S.cid)return;
 if(S.me.kind==="teacher")await refreshTeacher();else await refreshStudent();
}
async function afterLogin(r){
 S.token=r.access_token;sess.set("scw-comp-token",S.token);
 await loadMe();S.cid=null;render();
}
const ACT={
 authMode(){S.authMode=S.authMode==="login"?"register":"login";render()},
 async login(){
  S.base=val("apiBase").trim();store.set("scw-comp-base",S.base);
  await afterLogin(await api("POST","/api/auth/login",{email:val("email"),password:val("password")}));
 },
 async register(){
  S.base=val("apiBase").trim();store.set("scw-comp-base",S.base);
  const r=await api("POST","/api/comp/register",{kind:val("kind"),full_name:val("fullName"),email:val("email"),password:val("password"),invite_code:val("invite")});
  await afterLogin(r);
 },
 logout(){S.token="";S.me=null;S.cid=null;sess.set("scw-comp-token",null);render()},
 async home(){S.cid=null;S.ov=null;S.my=null;S.review=null;await loadMe();render()},
 async open(id){S.cid=id;S.tab="assign";S.round=null;S.review=null;S.ov=null;S.my=null;await reload();if(S.me.kind==="teacher"&&S.ov.status!=="SETUP")S.tab="tasks";render()},
 async reload(){await reload();render()},
 async createComp(){
  const c=await api("POST","/api/comp/competitions",{title:val("newTitle"),rounds_total:Number(val("newRounds"))});
  toast("Musobaqa yaratildi. Sinf kodi: "+c.code);await loadMe();await ACT.open(c.id);
 },
 async join(){
  const r=await api("POST","/api/comp/join",{code:val("joinCode")});
  toast(r.joined?"Sinfga qo‘shildingiz":"Siz allaqachon qo‘shilgansiz");await loadMe();await ACT.open(r.competition.id);
 },
 tab(id){S.tab=id;render()},
 async recheck(){await reload();render()},
 async autoAssign(){const tc=val("teamCount");const r=await api("POST",P("/auto-assign"),{team_count:tc?Number(tc):null});toast(r.teams+" ta jamoa tuzildi");await reload();render()},
 async start(){await api("POST",P("/start"));toast("Musobaqa boshlandi");await reload();S.tab="tasks";render()},
 review(id){S.review=id;render()},
 async approve(id){
  const t=S.tasks.find(x=>x.id===id),body={action:"approve",feedback:val("fb")};
  const crit={};t.content.rubric.forEach((r,i)=>{const v=val("crit"+i);if(v!=="")crit[r.criterion]=Number(v)});
  if(Object.keys(crit).length)body.criteria=crit;
  const total=val("totalScore");if(total!==""&&!body.criteria)body.score=Number(total);
  else if(total!==""&&body.criteria)body.score=Number(total);
  await api("POST",P("/tasks/"+id+"/review"),body);toast("Tasdiqlandi");await reload();render();
 },
 async return(id){await api("POST",P("/tasks/"+id+"/review"),{action:"return",feedback:val("fb")});toast("Qayta ishlashga qaytarildi");await reload();render()},
 async resolve(){const r=await api("POST",P("/rounds/resolve"));toast(r.resolved_round+"-raund hisoblandi");S.round=r.resolved_round;await reload();S.round=r.resolved_round;render()},
 round(id){S.round=Number(id);render()},
 async grade(id){const v=val("ds"+id);if(v==="")throw Error("Ballni kiriting (0–100).");await api("PATCH",P("/decisions/"+id),{score:Number(v)});toast("Saqlandi");await reload();render()},
 async acceptAuto(){const r=await api("POST",P("/decisions/accept-auto"),{});toast(r.graded+" ta qaror baholandi");await reload();render()},
 async finalize(){if(!window.confirm("Musobaqani yakunlaysizmi? Keyin hech narsani o‘zgartirib bo‘lmaydi."))return;await api("POST",P("/finalize"));toast("Musobaqa yakunlandi");S.tab="results";await reload();render()},
 async submitTask(){const a=val("answer").trim();if(!a)throw Error("Javobni yozing.");await api("PUT",P("/task"),{answer:a});toast("Javob topshirildi");await reload();render()},
 async submitDecision(){
  const f=ROLE_FIELD[S.my.role],raw=val("decValue");
  const v=f==="supplier"||f==="mode"?raw:(raw===""?NaN:Number(raw));
  await api("POST",P("/decision"),{payload:{[f]:v}});toast("Qaror yuborildi");await reload();render();
 },
};
const CHANGE={
 async setTeam(id,value){await api("PATCH",P("/enrollments/"+id),{set_team:true,team_id:value||null});await reload();render()},
 async setRole(id,value){await api("PATCH",P("/enrollments/"+id),{set_role:true,role:value||null});await reload();render()},
};
async function run(fn,...args){try{await fn(...args)}catch(e){toast(e.message||"Xato",true);if(e.status===401){ACT.logout()}}}
document.addEventListener("click",ev=>{
 const el=ev.target.closest("[data-act]");if(!el||el.disabled)return;
 const fn=ACT[el.dataset.act];if(fn)run(fn,el.dataset.id);
});
document.addEventListener("change",ev=>{
 const el=ev.target.closest("[data-change]");if(!el)return;
 const fn=CHANGE[el.dataset.change];if(fn)run(fn,el.dataset.id,el.value);
});

window.SCWComp={state:S,render,api,ACT};
(async function init(){
 if(S.token&&S.base){try{await loadMe()}catch(e){}}
 render();
})();
})();
