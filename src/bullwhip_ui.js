/* SCW Phase 13 — Bullwhip simulyatori interfeysi. Mexanika: src/bullwhip.js (window.SCWBullwhip).
   Ko‘rinishlar: sozlash → o‘yin (yakka yoki guruh) → natija (+ natija kodi) va alohida o‘qituvchi paneli. */
(function(){
"use strict";
let game=null,view="setup",team={cursor:0,stage:"privacy",pending:{}},report=null;
const ui={mode:"solo",name:"",preset:"",seed:"",role:"0",rounds:"16",codes:""};
const COLORS=["#56a8ff","#61d6a5","#f0bd67","#c79bff"],DEMAND_COLOR="#91a2b9",CLASS_SIZE=20;
const el=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const money=n=>"$"+Number(n).toFixed(2);
const times=n=>n===null||n===undefined?"—":Number(n).toFixed(1)+"×";
const signed=n=>(n>0?"+":"")+money(n);
const say=t=>{if(typeof window.notify==="function")window.notify(t)};
const SEL="width:100%;background:#0a1523;border:1px solid #33465e;color:white;border-radius:9px;padding:10px;font-size:14px";
const B=()=>window.SCWBullwhip;

/* ---------- Sozlash ---------- */
function renderSetup(root){
 const C=B().constants,P=B().presets;
 root.innerHTML=
  "<div class=\"panel\"><div class=\"panel-head\"><h3>1. O‘yinni sozlang</h3><span class=\"sub\">BEER DISTRIBUTION GAME</span></div>"+
  "<p class=\"muted\" style=\"line-height:1.6\">Zanjir: <b>Chakana sotuvchi → Ulgurji sotuvchi → Distribyutor → Zavod</b>. Buyurtma yetkazib beruvchiga <b>2 raundda</b> yetadi, jo‘natma <b>2 raundda</b> qaytib keladi. Har bir rol faqat o‘z raqamlarini ko‘radi. Xarajat: ombordagi 1 dona uchun <b>$0.50</b>, yetkazilmagan 1 dona uchun <b>$1.00</b> (har raund).</p>"+
  "<div class=\"two\"><div class=\"field\"><label>Rejim</label><select id=\"bwMode\" style=\""+SEL+"\"><option value=\"solo\">Yakka — o‘z telefonimda (1 rol, qolganlari avtomatik)</option><option value=\"team\">Guruh — 4 kishi, bitta qurilma (4 rol)</option></select></div>"+
  "<div class=\"field\"><label>Ism (yakka) yoki guruh nomi — natija kodida ko‘rinadi</label><input id=\"bwName\" type=\"text\" maxlength=\""+C.MAX_NAME+"\" placeholder=\"masalan: Ali Valiyev\"></div></div>"+
  "<div class=\"two\"><div class=\"field\"><label>Ssenariy (talab o‘zgarishi)</label><select id=\"bwPreset\" style=\"width:100%;"+SEL.replace("width:100%;","")+"\"><option value=\"\">Tasodifiy</option>"+P.map(p=>"<option value=\""+esc(p.seed)+"\">"+esc(p.label)+"</option>").join("")+"<option value=\"__custom__\">Maxsus kod…</option></select></div>"+
  "<div class=\"field\" id=\"bwRoleBox\"><label>Sizning rolingiz</label><select id=\"bwRole\" style=\"width:100%;"+SEL.replace("width:100%;","")+"\">"+C.ROLES.map((r,i)=>"<option value=\""+i+"\">"+esc(r)+"</option>").join("")+"</select></div></div>"+
  "<div class=\"field\" id=\"bwSeedBox\" style=\"display:none\"><label>Maxsus ssenariy kodi (bir xil kod — bir xil talab o‘zgarishi)</label><input id=\"bwSeed\" type=\"text\" maxlength=\""+C.MAX_SEED+"\" placeholder=\"masalan: guruh-1\"></div>"+
  "<div class=\"field\"><label>Raundlar soni (8–30)</label><input id=\"bwRounds\" type=\"number\" min=\"8\" max=\"30\"></div>"+
  "<div style=\"display:flex;gap:9px;flex-wrap:wrap\"><button class=\"btn primary\" id=\"bwStart\">▶ O‘yinni boshlash</button><button class=\"btn\" id=\"bwTeacher\">👩‍🏫 O‘qituvchi paneli</button></div></div>"+
  "<div class=\"card\" style=\"margin-top:13px\"><h4>Bullwhip effekti nima?</h4><p>Xaridorlar talabi bir marta ozgina o‘zgarsa ham, zanjirda yuqoriga (ishlab chiqaruvchi tomon) qarab buyurtmalar tebranishi tobora kuchayadi. Sababi — kechikishlar, to‘liq ko‘rinmaydigan ma’lumot va har bir bosqichning ehtiyotkor zaxira yig‘ishi.</p></div>"+
  "<div class=\"card\" style=\"margin-top:13px\"><h4>Sinf bilan o‘ynash ("+CLASS_SIZE+" o‘quvchi)</h4><p>Yakka rejimda har bir o‘quvchi o‘z telefonida o‘ynaydi: o‘quvchiga o‘z raqami bo‘yicha ssenariy bering (1-o‘quvchi — Ssenariy 1 va hokazo). O‘yin oxirida «natija kodi» chiqadi — o‘quvchi uni o‘qituvchiga yuboradi. Guruh rejimida 4 kishi bitta qurilmani navbat bilan oladi (5 guruh × 4 kishi). Barcha kodlarni <b>O‘qituvchi paneli</b>ga qo‘ying — reyting avtomatik tuziladi.</p></div>";
 el("bwMode").value=ui.mode;el("bwName").value=ui.name;el("bwPreset").value=ui.preset;el("bwSeed").value=ui.seed;el("bwRole").value=ui.role;el("bwRounds").value=ui.rounds;
 const sync=()=>{el("bwRoleBox").style.display=el("bwMode").value==="team"?"none":"";el("bwSeedBox").style.display=el("bwPreset").value==="__custom__"?"":"none"};
 sync();
 el("bwMode").addEventListener("change",sync);el("bwPreset").addEventListener("change",sync);
 el("bwStart").addEventListener("click",start);
 el("bwTeacher").addEventListener("click",()=>{readSetup();view="teacher";render()});
}
function readSetup(){
 ["Mode","Name","Preset","Seed","Role","Rounds"].forEach(k=>{const n=el("bw"+k);if(n)ui[k.toLowerCase()]=n.value});
}
function start(){
 readSetup();
 try{
  const seed=ui.preset==="__custom__"?ui.seed:ui.preset;
  game=B().newGame({rounds:Number(ui.rounds),seed,humanRoles:ui.mode==="team"?[0,1,2,3]:[Number(ui.role)]});
  team={cursor:0,stage:"privacy",pending:{}};
  view="play";render();
 }catch(e){say(e.message)}
}

/* ---------- O‘yin ---------- */
function stats(r,i){
 const C=B().constants,recent=r.orders.slice(-4).reverse();
 return "<table style=\"min-width:260px\"><tbody>"+
  "<tr><td>"+(i===0?"Xaridorlar buyurtmasi":esc(C.CUSTOMER[i])+" buyurtmasi")+"</td><td><b>"+r.incoming+"</b></td></tr>"+
  "<tr><td>Siz jo‘natdingiz</td><td><b>"+r.shipped+"</b></td></tr>"+
  "<tr><td>Oxirgi buyurtmalaringiz</td><td>"+(recent.length?recent.join(", "):"—")+"</td></tr></tbody></table>";
}
function metricsFor(r){
 return "<div class=\"metrics\"><div class=\"metric\"><small>Raund</small><strong>"+game.round+" / "+game.rounds+"</strong><span class=\"good\">"+esc(r.name)+"</span></div>"+
  "<div class=\"metric\"><small>Omborda</small><strong>"+r.inventory+"</strong><span class=\"good\">dona</span></div>"+
  "<div class=\"metric\"><small>Qarz (backlog)</small><strong style=\"color:"+(r.backlog>0?"var(--red)":"inherit")+"\">"+r.backlog+"</strong><span class=\"good\">yetkazilmagan</span></div>"+
  "<div class=\"metric\"><small>Jami xarajat</small><strong>"+money(r.cost)+"</strong><span class=\"good\">shu paytgacha</span></div></div>";
}
function orderPanel(i,withAuto){
 const C=B().constants,r=game.roles[i];
 return "<div class=\"panel\"><div class=\"panel-head\"><h3>3. Buyurtma bering</h3><span class=\"sub\">"+esc(C.SUPPLIER[i]).toUpperCase()+"</span></div>"+
  "<div class=\"field\"><label>"+esc(C.SUPPLIER[i])+"dan necha dona buyurtma berasiz?</label><input id=\"bwQty\" type=\"number\" min=\"0\" max=\""+C.MAX_ORDER+"\" step=\"1\" value=\""+r.incoming+"\"></div>"+
  "<div style=\"display:flex;gap:9px;flex-wrap:wrap\"><button class=\"btn primary\" id=\"bwOrder\">Buyurtma berish</button>"+(withAuto?"<button class=\"btn\" id=\"bwAuto\">Qolganini avtomatik o‘ynash</button>":"")+"<button class=\"btn\" id=\"bwReset\">↺ Qayta sozlash</button></div></div>";
}
function bindReset(){el("bwReset").addEventListener("click",()=>{if(confirm("O‘yin to‘xtatiladi. Davom etasizmi?")){game=null;view="setup";render()}})}

function renderRound(root){
 const i=game.playerRole,r=game.roles[i];
 root.innerHTML=metricsFor(r)+
  "<div class=\"two\"><div class=\"panel\"><div class=\"panel-head\"><h3>2. Bu raund ma’lumoti</h3><span class=\"sub\">FAQAT SIZNING RAQAMLARINGIZ</span></div>"+stats(r,i)+"</div>"+orderPanel(i,true)+"</div>"+
  "<p class=\"muted\" style=\"margin:12px 2px\">Maslahat: faqat o‘z raqamlaringizga qarab qaror qiling. Boshqa bosqichlar nima ko‘rayotganini bilmaysiz — real ta’minot zanjiridagi kabi.</p>";
 el("bwOrder").addEventListener("click",()=>{try{B().play(game,el("bwQty").value);render()}catch(e){say(e.message)}});
 el("bwAuto").addEventListener("click",()=>{B().autoPlay(game);render()});
 bindReset();
}

function renderTeam(root){
 const C=B().constants,i=team.cursor,r=game.roles[i];
 if(team.stage==="privacy"){
  const done=[0,1,2,3].map(k=>"<span style=\"margin-right:10px\">"+(team.pending[k]!==undefined?"✅":"⬜")+" "+esc(C.ROLES[k])+"</span>").join("");
  root.innerHTML="<div class=\"panel\" style=\"text-align:center;padding:40px 16px\"><div class=\"muted\">Raund "+game.round+" / "+game.rounds+(ui.name?" · "+esc(ui.name):"")+"</div>"+
   "<div style=\"font-size:30px;letter-spacing:6px;color:var(--muted);margin:14px 0\">· · ·</div>"+
   "<h3 style=\"font-size:18px;margin:0 0 8px\">Qurilmani <span style=\"color:"+COLORS[i]+"\">"+esc(r.name)+"</span> ga bering</h3>"+
   "<p class=\"muted\" style=\"margin:0 auto 18px;max-width:440px\">Qolganlar, iltimos, ekranga qaramang. Keyingi ekran faqat shu rolning raqamlarini ko‘rsatadi.</p>"+
   "<button class=\"btn primary\" id=\"bwReveal\">Men "+esc(r.name)+"man — ekranni ko‘rsat</button><p class=\"muted\" style=\"margin-top:16px\">"+done+"</p></div>"+
   "<div style=\"margin-top:10px\"><button class=\"btn\" id=\"bwReset\">↺ Qayta sozlash</button></div>";
  el("bwReveal").addEventListener("click",()=>{team.stage="decide";render()});
  bindReset();
  return;
 }
 root.innerHTML=metricsFor(r)+
  "<div class=\"two\"><div class=\"panel\"><div class=\"panel-head\"><h3>2. Bu raund ma’lumoti</h3><span class=\"sub\">FAQAT "+esc(r.name).toUpperCase()+"</span></div>"+stats(r,i)+"</div>"+orderPanel(i,false)+"</div>";
 el("bwOrder").addEventListener("click",()=>{
  const raw=el("bwQty").value,q=Number(raw);
  if(raw===""||!Number.isInteger(q)||q<0||q>C.MAX_ORDER){say("Buyurtma 0–"+C.MAX_ORDER+" oralig‘ida butun son bo‘lishi kerak.");return}
  team.pending[i]=q;
  if(team.cursor<3){team.cursor+=1;team.stage="privacy"}
  else{
   try{B().play(game,team.pending)}catch(e){say(e.message);return}
   team={cursor:0,stage:"privacy",pending:{}};
  }
  render();
 });
 bindReset();
}

/* ---------- Natija ---------- */
function drawChart(canvas){
 const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height,pl=40,pb=28,pt=10,pr=10,pw=W-pl-pr,ph=H-pt-pb,n=game.rounds;
 const series=[{d:game.demandHistory,c:DEMAND_COLOR,dash:true}].concat(game.roles.map((r,i)=>({d:r.orders,c:COLORS[i],dash:false})));
 const max=Math.max(10,...series.flatMap(s=>s.d))*1.1;
 ctx.clearRect(0,0,W,H);ctx.fillStyle="#0a1524";ctx.fillRect(0,0,W,H);
 ctx.strokeStyle="#26374e";ctx.fillStyle="#91a2b9";ctx.font="11px sans-serif";ctx.lineWidth=1;
 for(let g=0;g<=4;g++){const y=pt+ph-g/4*ph;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(W-pr,y);ctx.stroke();ctx.fillText(String(Math.round(g/4*max)),4,y+4)}
 for(let k=1;k<=n;k+=Math.ceil(n/8)){ctx.fillText(String(k),pl+(k-1)/(n-1)*pw-4,H-9)}
 series.forEach(s=>{ctx.beginPath();ctx.strokeStyle=s.c;ctx.lineWidth=s.dash?2:2.5;ctx.setLineDash(s.dash?[5,4]:[]);
  s.d.forEach((v,k)=>{const x=pl+k/(n-1)*pw,y=pt+ph-v/max*ph;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
  ctx.stroke();ctx.setLineDash([])});
}
function copyText(text,box){
 const done=()=>say("Nusxa olindi");
 try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,()=>fallback())}else fallback()}catch(e){fallback()}
 function fallback(){try{box.focus();box.select();if(document.execCommand("copy"))done();else say("Kodni qo‘lda belgilab nusxalang")}catch(e){say("Kodni qo‘lda belgilab nusxalang")}}
}
function renderEnd(root){
 const s=B().summary(game),b=B().benchmark(game),team_=game.mode==="team",me=game.playerRole;
 const own=team_?s.totalCost:s.roles[me].cost,auto=team_?b.totalCost:b.roles[me].cost,diff=own-auto;
 const legend=["Xaridorlar talabi"].concat(game.roles.map(r=>r.name)),lc=[DEMAND_COLOR].concat(COLORS);
 let code="";try{code=B().resultCode(game,ui.name)}catch(e){code=""}
 root.innerHTML=
  "<div class=\"metrics\"><div class=\"metric\"><small>Talab o‘zgarishi</small><strong>"+s.baseline+" → "+s.newLevel+"</strong><span class=\"good\">"+s.shockRound+"-raunddan</span></div>"+
  "<div class=\"metric\"><small>"+(team_?"Zanjir xarajati":"Sizning xarajatingiz")+"</small><strong>"+money(own)+"</strong><span class=\"good\">"+(team_?"guruh o‘ynadi":esc(s.roles[me].name))+"</span></div>"+
  "<div class=\"metric\"><small>Avtomatik qoida</small><strong>"+money(auto)+"</strong><span class=\"good\">bir xil ssenariy</span></div>"+
  "<div class=\"metric\"><small>Farq</small><strong style=\"color:"+(diff>0?"var(--red)":"var(--green)")+"\">"+signed(diff)+"</strong><span class=\"good\">"+(diff>0?"avtomatikdan qimmatroq":"avtomatikdan arzonroq")+"</span></div></div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Buyurtmalar raundma-raund</h3><span class=\"sub\">SSENARIY: "+esc(s.seed)+"</span></div><canvas id=\"bwChart\" width=\"820\" height=\"340\" style=\"width:100%;border-radius:12px\"></canvas>"+
  "<div class=\"muted\" style=\"display:flex;gap:14px;flex-wrap:wrap;margin-top:9px\">"+legend.map((t,k)=>"<span><span style=\"display:inline-block;width:10px;height:10px;background:"+lc[k]+";margin-right:5px\"></span>"+esc(t)+"</span>").join("")+"</div></div>"+
  "<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Bosqichlar bo‘yicha natija</h3><span class=\"sub\">BULLWHIP KO‘RSATKICHI</span></div><div class=\"table-wrap\"><table><thead><tr><th>Bosqich</th><th>Buyurtma tebranishi (σ)</th><th>Talabga nisbatan</th><th>Eng katta buyurtma</th><th>Xarajat</th></tr></thead><tbody>"+
  s.roles.map((r,k)=>"<tr><td>"+esc(r.name)+(!team_&&k===me?" <b>(siz)</b>":"")+"</td><td>"+r.orderStdev.toFixed(1)+"</td><td>"+times(r.amplification)+"</td><td>"+r.peakOrder+"</td><td>"+money(r.cost)+"</td></tr>").join("")+
  "</tbody></table></div><p class=\"muted\" style=\"margin-top:10px\">Xaridorlar talabi bir marta o‘zgardi. «Talabga nisbatan» ustuni zanjir yuqoriga qarab buyurtmalar tebranishi necha marta kuchayganini ko‘rsatadi.</p></div>"+
  (code?"<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Natija kodi</h3><span class=\"sub\">O‘QITUVCHIGA YUBORING</span></div><div class=\"field\"><label>Bu kod butun o‘yiningizni o‘z ichiga oladi; o‘qituvchi paneli natijani undan qayta hisoblaydi.</label><textarea id=\"bwCode\" readonly rows=\"3\" style=\"width:100%;background:#0a1523;border:1px solid #33465e;color:white;border-radius:9px;padding:10px;font:12px monospace\">"+esc(code)+"</textarea></div><button class=\"btn primary\" id=\"bwCopy\">⧉ Kodni nusxalash</button></div>":"")+
  "<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Muhokama uchun savollar</h3><span class=\"sub\">DEBRIEF</span></div>"+
  ["Grafikka qarang: qaysi raunddan boshlab buyurtmalaringiz haqiqiy talabdan emas, balki qo‘rquv yoki taxminlarga tayana boshladi?",
   "Eng katta buyurtma bergan raundingizni tanlang. O‘sha paytda nimani ko‘rdingiz va nima uchun shunday qaror qildingiz?",
   "Zanjirda faqat chakana sotuvchi haqiqiy talabni ko‘radi. Bu ma’lumot yetishmasligi boshqa bosqichlarga qanday ta’sir qildi?",
   "Agar hamma bosqich bir-biriga real raqamlarini ko‘rsatsa, nima o‘zgarardi? Bu muammo odamlarda edimi yoki zanjir tuzilishidami?"
  ].map(q=>"<div class=\"card\" style=\"margin:9px 0;border-left:3px solid var(--blue)\">"+esc(q)+"</div>").join("")+"</div>"+
  "<div style=\"margin-top:13px;display:flex;gap:9px;flex-wrap:wrap\"><button class=\"btn primary\" id=\"bwAgain\">↺ Yangi o‘yin</button><button class=\"btn\" id=\"bwCsv\">⇩ CSV yuklab olish</button></div>"+
  "<p class=\"muted\" style=\"margin:14px 2px;line-height:1.6\">Manba: J. W. Forrester (1961), <i>Industrial Dynamics</i>; J. D. Sterman (1989), <i>Management Science</i> 35(3). Mexanika va parametrlar jncohen/supply-chain-simulation (CC0 1.0) loyihasidan olingan g‘oyaga asoslangan; kod SCW uchun qayta yozilgan.</p>";
 drawChart(el("bwChart"));
 el("bwAgain").addEventListener("click",()=>{game=null;view="setup";render()});
 el("bwCsv").addEventListener("click",downloadCsv);
 if(code)el("bwCopy").addEventListener("click",()=>copyText(code,el("bwCode")));
}
function downloadCsv(){
 const head=["raund","talab"];game.roles.forEach(r=>head.push(r.name+" buyurtma",r.name+" zaxira",r.name+" qarz"));
 const rows=[head];
 for(let k=0;k<game.rounds;k++){const row=[k+1,game.demandHistory[k]];game.roles.forEach(r=>row.push(r.orders[k],r.inventoryHistory[k],r.backlogHistory[k]));rows.push(row)}
 const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="scw-bullwhip-natijalar.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

/* ---------- O‘qituvchi paneli ---------- */
function soloTable(rows){
 if(!rows.length)return "<p class=\"muted\">Yakka natijalar yo‘q.</p>";
 return "<div class=\"table-wrap\"><table><thead><tr><th>#</th><th>O‘quvchi</th><th>Rol</th><th>Ssenariy</th><th>Xarajat</th><th>Avtomatik</th><th>Farq</th><th>Bullwhip</th></tr></thead><tbody>"+
  rows.map(r=>"<tr><td>"+r.rank+"</td><td>"+esc(r.name)+"</td><td>"+esc(r.role)+"</td><td>"+esc(r.seed)+"</td><td>"+money(r.cost)+"</td><td>"+money(r.benchCost)+"</td><td style=\"color:"+(r.delta>0?"var(--red)":"var(--green)")+"\">"+signed(r.delta)+"</td><td>"+times(r.amplification)+"</td></tr>").join("")+"</tbody></table></div>";
}
function teamTable(rows){
 if(!rows.length)return "<p class=\"muted\">Guruh natijalari yo‘q.</p>";
 return "<div class=\"table-wrap\"><table><thead><tr><th>#</th><th>Guruh</th><th>Ssenariy</th><th>Zanjir xarajati</th><th>Avtomatik</th><th>Farq</th><th>Zavod bullwhip</th></tr></thead><tbody>"+
  rows.map(r=>"<tr><td>"+r.rank+"</td><td>"+esc(r.name)+"</td><td>"+esc(r.seed)+"</td><td>"+money(r.cost)+"</td><td>"+money(r.benchCost)+"</td><td style=\"color:"+(r.delta>0?"var(--red)":"var(--green)")+"\">"+signed(r.delta)+"</td><td>"+times(r.amplification)+"</td></tr>").join("")+"</tbody></table></div>";
}
function renderReport(){
 const box=el("bwReport");if(!box||!report)return;
 const C=B().constants;
 box.innerHTML=
  "<div class=\"metrics\"><div class=\"metric\"><small>Qabul qilingan natijalar</small><strong>"+report.total+" / "+CLASS_SIZE+"</strong><span class=\"good\">"+report.solo.length+" yakka · "+report.team.length+" guruh</span></div>"+
  "<div class=\"metric\"><small>Xato qatorlar</small><strong style=\"color:"+(report.invalid.length?"var(--red)":"inherit")+"\">"+report.invalid.length+"</strong><span class=\"good\">tekshirilsin</span></div>"+
  "<div class=\"metric\"><small>Zavod bullwhip (o‘rtacha)</small><strong>"+times(report.averageAmplification[3])+"</strong><span class=\"good\">talabga nisbatan</span></div>"+
  "<div class=\"metric\"><small>Chakana bullwhip (o‘rtacha)</small><strong>"+times(report.averageAmplification[0])+"</strong><span class=\"good\">talabga nisbatan</span></div></div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Yakka reyting</h3><span class=\"sub\">AVTOMATIK QOIDADAN FARQ BO‘YICHA</span></div>"+soloTable(report.solo)+"</div>"+
  "<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Guruh reytingi</h3><span class=\"sub\">ZANJIR XARAJATI BO‘YICHA</span></div>"+teamTable(report.team)+"</div>"+
  "<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Butun sinf: bosqichlar bo‘yicha o‘rtacha kuchayish</h3><span class=\"sub\">BULLWHIP</span></div><div class=\"table-wrap\"><table><thead><tr>"+C.ROLES.map(r=>"<th>"+esc(r)+"</th>").join("")+"</tr></thead><tbody><tr>"+report.averageAmplification.map(x=>"<td>"+times(x)+"</td>").join("")+"</tr></tbody></table></div><p class=\"muted\" style=\"margin-top:10px\">Zanjir yuqoriga qarab raqam o‘ssa — sinfda bullwhip effekti kuzatildi. Muhokamani shu jadvaldan boshlash mumkin.</p></div>"+
  (report.invalid.length?"<div class=\"panel\" style=\"margin-top:13px;border-color:#9b4d57\"><div class=\"panel-head\"><h3>Xato qatorlar</h3><span class=\"sub\">QABUL QILINMADI</span></div>"+report.invalid.map(x=>"<p class=\"muted\" style=\"margin:4px 0\"><b>"+x.line+"-qator:</b> "+esc(x.error)+"</p>").join("")+"</div>":"");
}
function renderTeacher(root){
 root.innerHTML=
  "<div class=\"panel\"><div class=\"panel-head\"><h3>O‘qituvchi paneli</h3><span class=\"sub\">SINF NATIJALARI</span></div>"+
  "<p class=\"muted\" style=\"line-height:1.6\">Har bir o‘quvchining natija kodini (har biri alohida qatorda) pastga qo‘ying. Panel har bir o‘yinni kodidan qayta o‘ynab, xarajatni o‘zi hisoblaydi, shuning uchun raqamlarni qo‘lda o‘zgartirib bo‘lmaydi. Turli ssenariylar adolatli taqqoslanishi uchun reyting <b>avtomatik qoidadan farq</b> bo‘yicha tuziladi (manfiy farq — o‘quvchi avtomatikdan yaxshiroq o‘ynagan). Kodni boshqa o‘quvchidan ko‘chirib olishning oldini olish uchun har kimga alohida ssenariy bering.</p>"+
  "<div class=\"field\"><label>Natija kodlari (maks. 100 qator)</label><textarea id=\"bwCodes\" rows=\"8\" placeholder=\"SCW1~Ali Valiyev~ssenariy-1~16~S~0~4,4,5,...\" style=\"width:100%;background:#0a1523;border:1px solid #33465e;color:white;border-radius:9px;padding:10px;font:12px monospace\"></textarea></div>"+
  "<div style=\"display:flex;gap:9px;flex-wrap:wrap\"><button class=\"btn primary\" id=\"bwCalc\">▶ Reytingni hisoblash</button><button class=\"btn\" id=\"bwBack\">← O‘yinga qaytish</button></div></div>"+
  "<div id=\"bwReport\" style=\"margin-top:13px\"></div>";
 el("bwCodes").value=ui.codes;
 el("bwCalc").addEventListener("click",()=>{
  ui.codes=el("bwCodes").value;
  const lines=ui.codes.split(/\r?\n/).slice(0,100);
  try{report=B().classReport(lines)}catch(e){say(e.message);return}
  if(!report.total&&!report.invalid.length)say("Kod topilmadi.");
  renderReport();
 });
 el("bwBack").addEventListener("click",()=>{ui.codes=el("bwCodes").value;view="setup";render()});
 if(report)renderReport();
}

function render(){
 const root=el("bullwhipApp");if(!root||!window.SCWBullwhip)return;
 if(view==="teacher")renderTeacher(root);
 else if(!game)renderSetup(root);
 else if(game.finished)renderEnd(root);
 else if(game.mode==="team")renderTeam(root);
 else renderRound(root);
}
window.renderBullwhip=render;
})();
