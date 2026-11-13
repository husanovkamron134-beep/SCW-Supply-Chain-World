# Phase 6 — Talab prognozi va xarid rejalashtirish

## Imkoniyatlar
- SKU va hafta yakuni sanasi bo‘yicha haftalik talab tarixini kiritish.
- Bir SKU va bir hafta qayta kiritilsa, yozuvni yangilash (dublikat yaratmaslik).
- Uchta prognoz usuli: so‘nggi 3 kuzatuvning oddiy o‘rtachasi (SMA), og‘irlikli o‘rtacha (WMA: 20/30/50%), eksponensial silliqlash (SES, alpha 0.35).
- Yetkazib beruvchi lead time, mavjud qoldiq va ochiq PO miqdorini hisobga olgan qayta buyurtma nuqtasi.
- Tavsiya etilgan xarid miqdori va mavjud Procurement moduliga PO yaratish amali.

## Hisoblash qoidalari
- Talab ma'lumotlari haftalik dona/kg miqdorida kiritiladi.
- WMA — asosiy rejalashtirish prognozi; so‘nggi hafta 50%, undan oldingi hafta 30%, undan oldingi hafta 20% vazn oladi.
- Safety stock = prognoz haftalik talabning 20%i.
- Lead-time demand = haftalik prognoz × yetkazib berish kunlari / 7.
- Reorder point = lead-time demand + safety stock.
- Inventory position = mavjud qoldiq + ochiq/qisman qabul qilingan PO qoldig‘i.
- Tavsiya faqat tarix mavjud bo‘lsa va inventory position reorder pointdan oshmasa ko‘rsatiladi.
- Target stock — lead time va kamida ikki haftalik talabni qoplash uchun hisoblangan daraja.

## Cheklovlar
- Talab tarixi foydalanuvchi tomonidan qo‘lda kiritiladi; hozircha POS/ERP yoki jo‘natilgan buyurtmalardan avtomatik import yo‘q.
- Prognoz demo usullari; mavsumiylik, trend, bayramlar, tashqi omillar va prognoz xatolik monitoringi kiritilmagan.
- Yetkazib beruvchi va lead time demo master ma'lumotlaridan olinadi.
- PO faqat tavsiya asosida foydalanuvchi tasdiqlab yaratadi; avtomatik xarid yuborilmaydi.
- localStorage asosida, server va ko‘p foydalanuvchili sinxronlash mavjud emas.
