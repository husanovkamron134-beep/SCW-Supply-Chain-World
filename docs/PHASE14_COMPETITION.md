# Phase 14 — Talabalar, musobaqa va baholash tizimi

Server-backed (FastAPI) musobaqa: o'qituvchi/talaba hisoblari, sinf kodi bilan qo'shilish, 2–4 jamoa, 5 rol, individual case topshiriqlar (100 ballik rubrika), har raund operatsion qarorlar va KPI simulyatsiyasi, jamoaviy va individual reyting.

Ishga tushirish: `backend/` serverini deploy qiling, `competition.html` sahifasida backend API manzilini kiriting. `index.html` ga ulash ixtiyoriy (havola qo'shing).

## Qoidalar
- Jamoalar: 2–4 ta, har birida kamida 5 talaba; soni `max(2, min(4, n // 5))`, farq ≤ 1 (15 → 3×5; 16–19 → 3 jamoa 5–7; 20 → 4×5). 10 dan kam talabada taqsimot rad etiladi.
- Rollar: Procurement, Supplier, Production, Warehouse, Transport. Har jamoada 5 rol ham bo'lishi shart; bir rolda bir nechta talaba bo'lishi mumkin (jamoaga qarori qo'llanadigani — birinchi topshirgani, hammasi alohida baholanadi).
- O'qituvchi taqsimotni qo'lda o'zgartira oladi (SETUP holatida), boshlangach — yo'q.
- Holatlar: SETUP → RUNNING → FINISHED. Topshiriq: ASSIGNED → SUBMITTED → RETURNED/APPROVED.
- Case: har rolga o'z generatori (seed bo'yicha deterministik), javob kaliti faqat o'qituvchiga. Rubrika 4×25. Qaytarishda fikr-mulohaza majburiy.
- Raund: har rol o'z maydoniga qaror yuboradi (xarid miqdori / yetkazib beruvchi / ishlab chiqarish / xavfsizlik zaxirasi / transport turi). Topshirmagan rol uchun oldingi qaror qo'llanadi, talaba 0 oladi. KPI: service level, OTIF, xarajat, zaxira, qoniqish, foyda; raund bali = 0.30 service + 0.20 OTIF + 0.25 xarajat + 0.10 zaxira + 0.15 qoniqish.
- Individual baho = Case o'rtacha × 0.5 + Qarorlar o'rtacha × 0.5. Ikkalasi ham yo'q bo'lsa ko'rsatilmaydi; bittasi yo'q bo'lsa komponent 0 deb hisoblanib "oraliq" belgisi qo'yiladi.
- Jamoaviy va individual reytinglar alohida. Talaba FINISHED gacha faqat o'z natijasini ko'radi.
- Yakunlash faqat: taqsimot to'g'ri, barcha case tasdiqlangan, barcha raundlar hisoblangan, barcha qarorlar baholangan bo'lsa mumkin.

## API (`/api/comp`)
`POST register` · `GET me` · `POST/GET competitions` · `GET competitions/{id}` · `POST .../auto-assign` · `PATCH .../enrollments/{eid}` · `POST .../start` · `GET .../tasks` · `POST .../tasks/{tid}/review` · `POST join` · `GET .../me` · `PUT .../task` · `POST .../decision` · `POST .../rounds/resolve` · `GET .../decisions` · `PATCH .../decisions/{did}` · `POST .../decisions/accept-auto` · `GET .../finalization` · `POST .../finalize` · `GET .../results/teams` · `GET .../results/students`

Kirish: mavjud `/api/auth/login` (JWT).

## Sozlamalar
- `SCW_TEACHER_INVITE_CODE` (ixtiyoriy): berilsa, o'qituvchi sifatida ro'yxatdan o'tish uchun shu kod kerak. Berilmasa har kim o'qituvchi bo'la oladi — productionda o'rnating.

## Taxminlar va cheklovlar
- Avto-ball faqat taklif; yakuniy qaror ballini o'qituvchi tasdiqlaydi.
- So'rovlar chastotasini cheklash (rate limiting) yo'q.
- Backendni o'zingiz joylashtirishingiz kerak; ma'lumotlar bazasi jadvallari (`comp_*`) ishga tushganda avtomatik yaratiladi.

## Testlar
`cd backend && pytest` — 15/16/17/18/19/20 talaba taqsimoti, 20 virtual talabali to'liq hayot sikli, ruxsatlar, yakunlash bloklari, formula, KPI determinizmi.
