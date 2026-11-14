# Phase 13 — Bullwhip effekti simulyatori

Interaktiv Beer Distribution Game: 4 bosqichli ta’minot zanjirida (Chakana sotuvchi → Ulgurji sotuvchi → Distribyutor → Zavod) talabning bir martalik o‘zgarishi buyurtmalar tebranishini qanday kuchaytirishini ko‘rsatadi.

## Fayllar
- `src/bullwhip.js` — mexanika (`window.SCWBullwhip`): `newGame`, `play`, `autoPlay`, `summary`, `benchmark`.
- `src/bullwhip_ui.js` — interfeys (`window.renderBullwhip`), `#bullwhipApp` ichiga chiziladi.
- `tests/bullwhip.test.js` — mexanika testlari (`node --test tests/*.test.js`).

## Qoidalar
- Buyurtma 2 raundda yetkazib beruvchiga yetadi, jo‘natma 2 raundda qaytadi.
- Xarajat: omborda 1 dona uchun $0.50, yetkazilmagan 1 dona uchun $1.00 (har raund).
- Talab 4 dona/raund; 4–7-raundlar orasida bir marta +2…+9 ga o‘sadi. Ssenariy kodi (seed) bir xil bo‘lsa, talab o‘zgarishi ham bir xil bo‘ladi.
- O‘yinchi bitta rolni boshqaradi; qolgan rollar avtomatik qoida bo‘yicha buyurtma beradi (prognoz + zaxira tuzatishi + yo‘ldagi yukni qisman hisobga olish).
- Yakunda: buyurtmalar grafigi, bosqichlar bo‘yicha tebranish (σ) va talabga nisbati, xarajat, avtomatik rejim bilan taqqoslash, muhokama savollari, CSV eksport.

## Cheklovlar
Bu o‘quv modeli: real ta’minot zanjiri ma’lumotlari ishlatilmaydi, ma’lumotlar saqlanmaydi (sahifa yangilansa o‘yin tugaydi). Avtomatik qoida parametrlari (`FORECAST_SMOOTHING`, `STOCK_ADJUST`, `SUPPLY_LINE_ADJUST`) o‘quv maqsadida tanlangan.

## Manba va litsenziya
Mexanika J. W. Forrester (1961, *Industrial Dynamics*, MIT Press) va J. D. Sterman (1989, *Management Science* 35(3), 321–339) ishlariga asoslangan. Parametrlar va o‘yin tuzilishi g‘oyasi [jncohen/supply-chain-simulation](https://github.com/jncohen/supply-chain-simulation) (CC0 1.0, public domain) loyihasidan olingan; kod SCW uchun qayta yozilgan, mustaqil mavjud. Loyiha MIT bilan bog‘liq emas.
