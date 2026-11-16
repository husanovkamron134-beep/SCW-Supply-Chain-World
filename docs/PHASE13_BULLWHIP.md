# Phase 13 — Bullwhip effekti simulyatori

Interaktiv Beer Distribution Game: 4 bosqichli ta’minot zanjirida (Chakana sotuvchi → Ulgurji sotuvchi → Distribyutor → Zavod) talabning bir martalik o‘zgarishi buyurtmalar tebranishini qanday kuchaytirishini ko‘rsatadi.

## Fayllar
- `bullwhip.html` — mustaqil sahifa (SCW uslubida). Brauzerda ochish kifoya; `index.html`ni o‘zgartirish shart emas.
- `src/bullwhip.js` — mexanika (`window.SCWBullwhip`): `newGame`, `play`, `autoPlay`, `summary`, `benchmark`, `presets`, `resultCode`, `replay`, `classReport`.
- `src/bullwhip_ui.js` — interfeys (`window.renderBullwhip`), `#bullwhipApp` ichiga chiziladi.
- `tests/bullwhip.test.js` — mexanika testlari (`node --test tests/*.test.js`).

## Ishga tushirish
`bullwhip.html` faylini oching. Sahifa `src/bullwhip.js` va `src/bullwhip_ui.js` ni yuklaydi.

## Asosiy ilovaga (`index.html`) yon menyu orqali ulash
Bu to‘rt o‘zgartirish bullwhip o‘yinini SCW yon menyusiga qo‘shadi. Har biri `index.html` ichida bir marta uchraydigan joyga qo‘yiladi.

1. Yon menyuda `<button class="nav" data-page="academy">` oldiga qo‘shing:
   ```html
   <button class="nav" data-page="bullwhip">⟲ &nbsp; Bullwhip o‘yini</button>
   ```
2. `<section class="section" id="academy">` oldiga qo‘shing:
   ```html
   <section class="section" id="bullwhip"><div class="head"><div><div class="eyebrow">SUPPLY CHAIN GAME</div><h2>Bullwhip effekti simulyatori</h2><p>Talab o‘zgarishi zanjir bo‘ylab qanday kuchayishini o‘zingiz boshdan kechiring.</p></div></div><div id="bullwhipApp"></div></section>
   ```
3. `<script src="src/cloud_sync.js"></script>` dan keyin qo‘shing:
   ```html
   <script src="src/bullwhip.js"></script>
   <script src="src/bullwhip_ui.js"></script>
   ```
4. Sahifa almashtirish qismida (`document.querySelectorAll(".nav")...` bloki oxirida) `if(b.dataset.page==="intelligence")runIntelligence()` dan keyin qo‘shing:
   ```js
   ;if(b.dataset.page==="bullwhip")renderBullwhip()
   ```

## Qoidalar
- Buyurtma 2 raundda yetkazib beruvchiga yetadi, jo‘natma 2 raundda qaytadi.
- Xarajat: omborda 1 dona uchun $0.50, yetkazilmagan 1 dona uchun $1.00 (har raund).
- Talab 4 dona/raund; 4–7-raundlar orasida bir marta +2…+9 ga o‘sadi. Ssenariy kodi (seed) bir xil bo‘lsa, talab o‘zgarishi ham bir xil bo‘ladi.
- O‘yinchi bitta rolni boshqaradi; qolgan rollar avtomatik qoida bo‘yicha buyurtma beradi (prognoz + zaxira tuzatishi + yo‘ldagi yukni qisman hisobga olish).
- Yakunda: buyurtmalar grafigi, bosqichlar bo‘yicha tebranish (σ) va talabga nisbati, xarajat, avtomatik rejim bilan taqqoslash, muhokama savollari, CSV eksport.

## Sinf rejimi (20 o‘quvchi)
- **Yakka rejim:** har bir o‘quvchi o‘z telefonida o‘ynaydi (1 rol, qolganlari avtomatik). 20 ta tayyor ssenariy (`presets`) bor — har bir o‘quvchiga o‘z raqami bo‘yicha ssenariy bering; talab o‘zgarishi hammada har xil bo‘ladi.
- **Guruh rejimi:** 4 kishi bitta qurilmada (4 rol), har bir rol uchun «qurilmani uzating» ekrani bor — boshqalar raqamlarni ko‘rmaydi. 20 o‘quvchi = 5 guruh × 4.
- **Natija kodi:** o‘yin tugagach `SCW1~ism~ssenariy~raundlar~rejim~rol~buyurtmalar~nazorat` ko‘rinishidagi kod beriladi; o‘quvchi uni o‘qituvchiga yuboradi.
- **O‘qituvchi paneli:** kodlar ro‘yxati qo‘yiladi, panel har bir o‘yinni qayta o‘ynab xarajatni o‘zi hisoblaydi (kodni qo‘lda o‘zgartirsa, nazorat belgisi mos kelmaydi). Reyting avtomatik qoidadan farq bo‘yicha (turli ssenariylar adolatli taqqoslanadi); sinf bo‘yicha o‘rtacha bullwhip kuchayishi ko‘rsatiladi.
- Cheklov: nazorat belgisi — tasodifiy xatoni aniqlaydi, qasddan soxtalashtirishdan to‘liq himoya qilmaydi (kod ichidagi buyurtmalarni qayta yozib, belgisini ham hisoblash mumkin). Sinfda har kimga alohida ssenariy berish ko‘chirishni qiyinlashtiradi.

## Cheklovlar
Bu o‘quv modeli: real ta’minot zanjiri ma’lumotlari ishlatilmaydi, ma’lumotlar saqlanmaydi (sahifa yangilansa o‘yin tugaydi). Avtomatik qoida parametrlari (`FORECAST_SMOOTHING`, `STOCK_ADJUST`, `SUPPLY_LINE_ADJUST`) o‘quv maqsadida tanlangan.

## Manba va litsenziya
Mexanika J. W. Forrester (1961, *Industrial Dynamics*, MIT Press) va J. D. Sterman (1989, *Management Science* 35(3), 321–339) ishlariga asoslangan. Parametrlar va o‘yin tuzilishi g‘oyasi [jncohen/supply-chain-simulation](https://github.com/jncohen/supply-chain-simulation) (CC0 1.0, public domain) loyihasidan olingan; kod SCW uchun qayta yozilgan, mustaqil mavjud. Loyiha MIT bilan bog‘liq emas.
