# Phase 5 — Ishlab chiqarish boshqaruvi

## Qo‘shilgan imkoniyatlar
- BOM (materiallar spetsifikatsiyasi) va tayyor mahsulot retsepti.
- Ishlab chiqarish buyurtmasi (MO), sana bo‘yicha rejalashtirish.
- Ikki demo ishlab chiqarish liniyasi, kunlik quvvat va taxminiy mehnat xarajati.
- Ish boshlanganda xomashyo inventardan LOT kesimida sarflanadi.
- Ish yakunida tayyor mahsulot inventarga yangi LOT bilan kirim qilinadi.
- Holatlar: PLANNED → IN_PROGRESS → COMPLETED; faqat boshlanmagan buyurtma bekor qilinadi.

## Model qarorlari
- Zaxiraning yagona manbasi SCWDomain inventar ledgeridir; ikkinchi stock hisoblagichi yo‘q.
- Demo BOM: 1 dona SCW-004 uchun 1 kg SCW-002 va 1 dona SCW-001. Bu o‘quv normasi, real texnologik standart emas.
- Xomashyo sarfi ISSUE, tayyor mahsulot chiqishi RECEIPT sifatida audit jurnaliga yoziladi.
- Liniya quvvati ishlab chiqarish sanasi bo‘yicha rejalashtirilgan, bekor qilinmagan miqdorlar bilan tekshiriladi.

## Cheklovlar
- BOM hozircha kod ichidagi bitta demo retsept; UI orqali tahrirlanmaydi.
- Materiallar oldindan rezerv qilinmaydi; start vaqtida qoldiq qayta tekshiriladi.
- Vaqt/xarajat taxminiy. Real MES, smena kalendari, chiqit/yield, sifat nazorati va ERP integratsiyasi yo‘q.
- Ma’lumotlar brauzer localStorageida saqlanadi; server va ko‘p foydalanuvchili sinxronlash yo‘q.
