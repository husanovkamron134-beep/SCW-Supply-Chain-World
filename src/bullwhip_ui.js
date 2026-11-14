/* SCW Phase 13 — Bullwhip simulyatori interfeysi. Mexanika: src/bullwhip.js (window.SCWBullwhip). */
(function(){
"use strict";
let game=null;
const COLORS=["#56a8ff","#61d6a5","#f0bd67","#c79bff"],DEMAND_COLOR="#91a2b9";
const el=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const money=n=>"$"+Number(n).toFixed(2);
const say=t=>{if(typeof window.notify==="function")window.notify(t)};

function renderSetup(root){
 const C=SCWBullwhip.constants;
 root.innerHTML=
  "<div class=\"panel\"><div class=\"panel-head\"><h3>1. O‘yinni sozlang</h3><span class=\"sub\">BEER DISTRIBUTION GAME</span></div>"+
  "<p class=\"muted\" style=\"line-height:1.6\">Zanjir: <b>Chakana sotuvchi → Ulgurji sotuvchi → Distribyutor → Zavod</b>. Siz bitta rolni boshqarasiz, qolgan uchta rol avtomatik qoida bo‘yicha buyurtma beradi. Buyurtma yetkazib beruvchiga <b>2 raundda</b> yetadi, jo‘natma <b>2 raundda</b> qaytib keladi. Har bir raundda faqat o‘zingizning raqamlaringizni ko‘rasiz. Xarajat: ombordagi 1 dona uchun <b>$0.50</b>, yetkazilmagan 1 dona uchun <b>$1.00</b> (har raund).</p>"+
  "<div class=\"two\"><div class=\"field\"><label>Sizning rolingiz</label><select id=\"bwRole\" style=\"width:100%;background:#0a1523;border:1px solid #33465e;color:white;border-radius:9px;padding:10px\">"+C.ROLES.map((r,i)=>"<option value=\""+i+"\">"+esc(r)+"</option>").join("")+"</select></div>"+
  "<div class=\"field\"><label>Raundlar soni (8–30)</label><input id=\"bwRounds\" type=\"number\" min=\"8\" max=\"30\" value=\"16\"></div></div>"+
  "<div class=\"field\"><label>Ssenariy kodi (bo‘sh qoldirilsa — tasodifiy). Bir xil kod — bir xil talab o‘zgarishi.</label><input id=\"bwSeed\" type=\"text\" maxlength=\"40\" placeholder=\"masalan: guruh-1\"></div>"+
  "<button class=\"btn primary\" id=\"bwStart\">▶ O‘yinni boshlash</button></div>"+
  "<div class=\"card\" style=\"margin-top:13px\"><h4>Bullwhip effekti nima?</h4><p>Xaridorlar talabi bir marta ozgina o‘zgarsa ham, zanjirda yuqoriga (ishlab chiqaruvchi tomon) qarab buyurtmalar tebranishi tobora kuchayadi. Sababi — kechikishlar, to‘liq ko‘rinmaydigan ma’lumot va har bir bosqichning ehtiyotkor zaxira yig‘ishi.</p></div>";
 el("bwStart").addEventListener("click",start);
}

function start(){
 try{
  game=SCWBullwhip.newGame({rounds:Number(el("bwRounds").value),seed:el("bwSeed").value,playerRole:Number(el("bwRole").value)});
  render();
 }catch(e){say(e.message)}
}

function renderRound(root){
 const C=SCWBullwhip.constants,i=game.playerRole,r=game.roles[i];
 const recent=r.orders.slice(-4).reverse();
 root.innerHTML=
  "<div class=\"metrics\"><div class=\"metric\"><small>Raund</small><strong>"+game.round+" / "+game.rounds+"</strong><span class=\"good\">"+esc(r.name)+"</span></div>"+
  "<div class=\"metric\"><small>Omborda</small><strong>"+r.inventory+"</strong><span class=\"good\">dona</span></div>"+
  "<div class=\"metric\"><small>Qarz (backlog)</small><strong style=\"color:"+(r.backlog>0?"var(--red)":"inherit")+"\">"+r.backlog+"</strong><span class=\"good\">yetkazilmagan</span></div>"+
  "<div class=\"metric\"><small>Jami xarajat</small><strong>"+money(r.cost)+"</strong><span class=\"good\">shu paytgacha</span></div></div>"+
  "<div class=\"two\"><div class=\"panel\"><div class=\"panel-head\"><h3>2. Bu raund ma’lumoti</h3><span class=\"sub\">FAQAT SIZNING RAQAMLARINGIZ</span></div>"+
  "<table style=\"min-width:260px\"><tbody>"+
  "<tr><td>"+(i===0?"Xaridorlar buyurtmasi":esc(C.CUSTOMER[i])+" buyurtmasi")+"</td><td><b>"+r.incoming+"</b></td></tr>"+
  "<tr><td>Siz jo‘natdingiz</td><td><b>"+r.shipped+"</b></td></tr>"+
  "<tr><td>Oxirgi buyurtmalaringiz</td><td>"+(recent.length?recent.join(", "):"—")+"</td></tr></tbody></table></div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>3. Buyurtma bering</h3><span class=\"sub\">"+esc(C.SUPPLIER[i]).toUpperCase()+"</span></div>"+
  "<div class=\"field\"><label>"+esc(C.SUPPLIER[i])+"dan necha dona buyurtma berasiz?</label><input id=\"bwQty\" type=\"number\" min=\"0\" max=\""+C.MAX_ORDER+"\" step=\"1\" value=\""+r.incoming+"\"></div>"+
  "<div style=\"display:flex;gap:9px;flex-wrap:wrap\"><button class=\"btn primary\" id=\"bwOrder\">Buyurtma berish</button><button class=\"btn\" id=\"bwAuto\">Qolganini avtomatik o‘ynash</button><button class=\"btn\" id=\"bwReset\">↺ Qayta sozlash</button></div></div></div>"+
  "<p class=\"muted\" style=\"margin:12px 2px\">Maslahat: faqat o‘z raqamlaringizga qarab qaror qiling. Boshqa bosqichlar nima ko‘rayotganini bilmaysiz — real ta’minot zanjiridagi kabi.</p>";
 el("bwOrder").addEventListener("click",()=>{try{SCWBullwhip.play(game,el("bwQty").value);render()}catch(e){say(e.message)}});
 el("bwAuto").addEventListener("click",()=>{SCWBullwhip.autoPlay(game);render()});
 el("bwReset").addEventListener("click",()=>{game=null;render()});
}

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

function renderEnd(root){
 const s=SCWBullwhip.summary(game),b=SCWBullwhip.benchmark(game),me=game.playerRole;
 const legend=["Xaridorlar talabi"].concat(game.roles.map(r=>r.name)),lc=[DEMAND_COLOR].concat(COLORS);
 const diff=s.totalCost-b.totalCost;
 root.innerHTML=
  "<div class=\"metrics\"><div class=\"metric\"><small>Talab o‘zgarishi</small><strong>"+s.baseline+" → "+s.newLevel+"</strong><span class=\"good\">"+s.shockRound+"-raunddan</span></div>"+
  "<div class=\"metric\"><small>Zanjir jami xarajati</small><strong>"+money(s.totalCost)+"</strong><span class=\"good\">siz o‘ynadingiz</span></div>"+
  "<div class=\"metric\"><small>Avtomatik rejim</small><strong>"+money(b.totalCost)+"</strong><span class=\"good\">bir xil ssenariy</span></div>"+
  "<div class=\"metric\"><small>Farq</small><strong style=\"color:"+(diff>0?"var(--red)":"var(--green)")+"\">"+(diff>0?"+":"")+money(diff)+"</strong><span class=\"good\">"+(diff>0?"siz qimmatroq":"siz arzonroq")+"</span></div></div>"+
  "<div class=\"panel\"><div class=\"panel-head\"><h3>Buyurtmalar raundma-raund</h3><span class=\"sub\">SSENARIY: "+esc(s.seed)+"</span></div><canvas id=\"bwChart\" width=\"820\" height=\"340\" style=\"width:100%;border-radius:12px\"></canvas>"+
  "<div class=\"muted\" style=\"display:flex;gap:14px;flex-wrap:wrap;margin-top:9px\">"+legend.map((t,k)=>"<span><span style=\"display:inline-block;width:10px;height:10px;background:"+lc[k]+";margin-right:5px\"></span>"+esc(t)+"</span>").join("")+"</div></div>"+
  "<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Bosqichlar bo‘yicha natija</h3><span class=\"sub\">BULLWHIP KO‘RSATKICHI</span></div><div class=\"table-wrap\"><table><thead><tr><th>Bosqich</th><th>Buyurtma tebranishi (σ)</th><th>Talabga nisbatan</th><th>Eng katta buyurtma</th><th>Xarajat</th></tr></thead><tbody>"+
  s.roles.map((r,k)=>"<tr><td>"+esc(r.name)+(k===me?" <b>(siz)</b>":"")+"</td><td>"+r.orderStdev.toFixed(1)+"</td><td>"+(r.amplification===null?"—":r.amplification.toFixed(1)+"×")+"</td><td>"+r.peakOrder+"</td><td>"+money(r.cost)+"</td></tr>").join("")+
  "</tbody></table></div><p class=\"muted\" style=\"margin-top:10px\">Xaridorlar talabi bir marta o‘zgardi. «Talabga nisbatan» ustuni zanjir yuqoriga qarab buyurtmalar tebranishi necha marta kuchayganini ko‘rsatadi.</p></div>"+
  "<div class=\"panel\" style=\"margin-top:13px\"><div class=\"panel-head\"><h3>Muhokama uchun savollar</h3><span class=\"sub\">DEBRIEF</span></div>"+
  ["Grafikka qarang: qaysi raunddan boshlab buyurtmalaringiz haqiqiy talabdan emas, balki qo‘rquv yoki taxminlarga tayana boshladi?",
   "Eng katta buyurtma bergan raundingizni tanlang. O‘sha paytda nimani ko‘rdingiz va nima uchun shunday qaror qildingiz?",
   "Zanjirda faqat chakana sotuvchi haqiqiy talabni ko‘radi. Bu ma’lumot yetishmasligi boshqa bosqichlarga qanday ta’sir qildi?",
   "Agar hamma bosqich bir-biriga real raqamlarini ko‘rsatsa, nima o‘zgarardi? Bu muammo odamlarda edimi yoki zanjir tuzilishidami?"
  ].map(q=>"<div class=\"card\" style=\"margin:9px 0;border-left:3px solid var(--blue)\">"+esc(q)+"</div>").join("")+"</div>"+
  "<div style=\"margin-top:13px;display:flex;gap:9px;flex-wrap:wrap\"><button class=\"btn primary\" id=\"bwAgain\">↺ Yangi o‘yin</button><button class=\"btn\" id=\"bwCsv\">⇩ CSV yuklab olish</button></div>"+
  "<p class=\"muted\" style=\"margin:14px 2px;line-height:1.6\">Manba: J. W. Forrester (1961), <i>Industrial Dynamics</i>; J. D. Sterman (1989), <i>Management Science</i> 35(3). Mexanika va parametrlar jncohen/supply-chain-simulation (CC0 1.0) loyihasidan olingan g‘oyaga asoslangan; kod SCW uchun qayta yozilgan.</p>";
 drawChart(el("bwChart"));
 el("bwAgain").addEventListener("click",()=>{game=null;render()});
 el("bwCsv").addEventListener("click",downloadCsv);
}

function downloadCsv(){
 const head=["raund","talab"];game.roles.forEach(r=>head.push(r.name+" buyurtma",r.name+" zaxira",r.name+" qarz"));
 const rows=[head];
 for(let k=0;k<game.rounds;k++){const row=[k+1,game.demandHistory[k]];game.roles.forEach(r=>row.push(r.orders[k],r.inventoryHistory[k],r.backlogHistory[k]));rows.push(row)}
 const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="scw-bullwhip-natijalar.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function render(){
 const root=el("bullwhipApp");if(!root||!window.SCWBullwhip)return;
 if(!game)renderSetup(root);else if(game.finished)renderEnd(root);else renderRound(root);
}
window.renderBullwhip=render;
})();
