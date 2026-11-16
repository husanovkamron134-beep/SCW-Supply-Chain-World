"""SCW Phase 14 — musobaqa tizimining sof mantiqi (ma'lumotlar bazasisiz, to'liq testlanadi).

Mundarija: jamoalarga teng taqsimlash va rollar, rolga mos case topshiriqlar (tayyor javob bilan),
jamoaviy KPI simulyatsiyasi, qarorlarni avtomatik baholash va individual yakuniy baho formulasi.
Barcha qiymatlar o'quv simulyatsiyasi uchun shartli; real kompaniya ma'lumotlari emas.
"""
from __future__ import annotations

import math
import random
from typing import Any

ROLES = ["procurement", "supplier", "production", "warehouse", "transport"]
ROLE_NAMES = {
    "procurement": "Procurement Manager",
    "supplier": "Supplier Manager",
    "production": "Production Manager",
    "warehouse": "Warehouse Manager",
    "transport": "Transport Manager",
}
MIN_TEAMS, MAX_TEAMS, MIN_TEAM_SIZE = 2, 4, 5
MIN_ROUNDS, MAX_ROUNDS = 3, 12


# ---------------------------------------------------------------- taqsimot
def team_count_for(n_students: int) -> int:
    """Jamoalar soni: har bir jamoada kamida 5 talaba, 2–4 jamoa (15→3, 16–19→3, 20→4)."""
    if n_students < MIN_TEAMS * MIN_TEAM_SIZE:
        raise ValueError(f"Musobaqa uchun kamida {MIN_TEAMS * MIN_TEAM_SIZE} talaba kerak.")
    return max(MIN_TEAMS, min(MAX_TEAMS, n_students // MIN_TEAM_SIZE))


def check_team_count(n_students: int, team_count: int) -> None:
    if not MIN_TEAMS <= team_count <= MAX_TEAMS:
        raise ValueError(f"Jamoalar soni {MIN_TEAMS}–{MAX_TEAMS} oralig'ida bo'lishi kerak.")
    if n_students < team_count * MIN_TEAM_SIZE:
        raise ValueError(f"{team_count} ta jamoa uchun kamida {team_count * MIN_TEAM_SIZE} talaba kerak.")


def balanced_sizes(n_students: int, team_count: int) -> list[int]:
    base, extra = divmod(n_students, team_count)
    return [base + 1] * extra + [base] * (team_count - extra)


def assign_teams(student_ids: list[str], team_count: int | None, seed: str) -> list[dict[str, Any]]:
    """Talabalarni tasodifiy (seed bo'yicha takrorlanadigan), lekin teng taqsimlaydi va rol beradi.
    Har bir jamoada 5 rol to'liq qoplanadi; 5 dan ortiq a'zo bo'lsa rollar navbat bilan takrorlanadi."""
    n = len(student_ids)
    k = team_count if team_count is not None else team_count_for(n)
    check_team_count(n, k)
    order = sorted(student_ids)
    random.Random(f"assign:{seed}").shuffle(order)
    out, pos = [], 0
    for t, size in enumerate(balanced_sizes(n, k)):
        for j, sid in enumerate(order[pos:pos + size]):
            out.append({"student": sid, "team": t, "role": ROLES[j % len(ROLES)]})
        pos += size
    return out


def validate_assignment(rows: list[dict[str, Any]], team_ids: list[Any]) -> list[str]:
    """rows: [{student, team, role}] — musobaqani boshlash shartlari. Xatolar ro'yxatini qaytaradi."""
    problems: list[str] = []
    if not MIN_TEAMS <= len(team_ids) <= MAX_TEAMS:
        problems.append(f"Jamoalar soni {MIN_TEAMS}–{MAX_TEAMS} bo'lishi kerak (hozir {len(team_ids)}).")
    for r in rows:
        if r["team"] is None:
            problems.append(f"{r['student']}: jamoaga biriktirilmagan.")
        if r["role"] is None:
            problems.append(f"{r['student']}: rol berilmagan.")
    for tid in team_ids:
        members = [r for r in rows if r["team"] == tid]
        if len(members) < MIN_TEAM_SIZE:
            problems.append(f"{tid}: jamoada kamida {MIN_TEAM_SIZE} talaba bo'lishi kerak (hozir {len(members)}).")
        missing = [ROLE_NAMES[x] for x in ROLES if not any(m["role"] == x for m in members)]
        if missing:
            problems.append(f"{tid}: yetishmayotgan rollar: {', '.join(missing)}.")
    return problems


# ---------------------------------------------------------------- case topshiriqlar
def _rubric(*names: str) -> list[dict[str, Any]]:
    return [{"criterion": n, "max": 25} for n in names]


RUBRICS = {
    "procurement": _rubric("Formula", "Hisob-kitob", "MOQ", "Qaror asoslash"),
    "supplier": _rubric("KPI tahlili", "Xavf", "Muzokara", "Tanlov"),
    "production": _rubric("Yield", "Material", "Xarajat", "Ishlab chiqarish rejasi"),
    "warehouse": _rubric("ATP/ROP", "Inventar", "Xarajat", "Strategiya"),
    "transport": _rubric("Qatnovlar", "Xarajat", "Kechikish", "Transport qarori"),
}


def _r2(x: float) -> float:
    return round(x + 1e-9, 2)


def make_case(role: str, seed: str) -> dict[str, Any]:
    """Rolga mos individual case topshiriq: sharoit (raqamlar seed bo'yicha), savollar, o'qituvchi uchun tayyor javob."""
    if role not in ROLES:
        raise ValueError("Noma'lum rol.")
    rng = random.Random(f"case:{seed}:{role}")
    return globals()[f"_case_{role}"](rng)


def _case_procurement(rng):
    demand, on_hand, on_order, safety = rng.randrange(800, 1501, 50), rng.randrange(100, 301, 20), rng.randrange(50, 201, 10), rng.randrange(100, 251, 10)
    sup = [{"name": n, "price": _r2(rng.uniform(7, 12)), "moq": rng.choice([200, 300, 400, 500, 600]),
            "defect_pct": rng.choice([1, 2, 3, 5, 6]), "fixed_cost": rng.choice([40, 60, 80, 120])} for n in ("A", "B", "C")]
    need = max(0, demand + safety - on_hand - on_order)
    ref_sup = []
    for s in sup:
        usable_rate = 1 - s["defect_pct"] / 100
        qty = max(math.ceil(need / usable_rate), s["moq"])
        total = qty * s["price"] + s["fixed_cost"]
        ref_sup.append({"name": s["name"], "order_qty": qty, "total_cost": _r2(total), "cost_per_usable_unit": _r2(total / (qty * usable_rate))})
    best = min(ref_sup, key=lambda x: x["cost_per_usable_unit"])
    return {"title": "Xarid miqdori va yetkazib beruvchi tanlash",
            "scenario": [f"Oylik talab: {demand} dona. Omborda: {on_hand} dona, yo'lda (ochiq buyurtma): {on_order} dona. Xavfsizlik zaxirasi: {safety} dona.",
                         "Uchta yetkazib beruvchi taklifi ma'lumotlar jadvalida (narx, MOQ, brak foizi, buyurtma uchun qat'iy xarajat)."],
            "data": {"monthly_demand": demand, "on_hand": on_hand, "on_order": on_order, "safety_stock": safety, "suppliers": sup},
            "questions": ["1. Talab qilinadigan sof xarid miqdorini hisoblang va formulasini yozing.",
                          "2. Har bir yetkazib beruvchi uchun brakni va MOQ ni hisobga olgan buyurtma miqdorini toping.",
                          "3. Har bir variantning jami xarajatini va foydali birlik narxini hisoblang.",
                          "4. Eng maqbul xarid qarorini asoslang."],
            "reference": {"net_requirement": need, "suppliers": ref_sup, "best_supplier": best["name"]},
            "rubric": RUBRICS["procurement"]}


def _case_supplier(rng):
    sup = [{"name": n, "otif_pct": rng.choice([78, 82, 88, 92, 95, 98]), "defect_pct": rng.choice([1, 2, 3, 5, 7]),
            "price": _r2(rng.uniform(8, 12)), "lead_days": rng.choice([2, 4, 6, 9]), "financial_rating": rng.choice([2, 3, 4, 5])} for n in ("A", "B", "C")]
    annual = rng.randrange(40000, 90001, 5000)
    lo = min(s["price"] for s in sup)
    ref = []
    for s in sup:
        score = 0.35 * s["otif_pct"] + 0.25 * (100 - s["defect_pct"] * 10) + 0.25 * (100 * lo / s["price"]) + 0.15 * (s["financial_rating"] * 20)
        ref.append({"name": s["name"], "score": _r2(score), "risk": "yuqori" if s["financial_rating"] <= 2 or s["otif_pct"] < 85 else "o'rtacha" if s["financial_rating"] == 3 else "past"})
    best = max(ref, key=lambda x: x["score"])
    bp = next(s["price"] for s in sup if s["name"] == best["name"])
    return {"title": "Yetkazib beruvchilarni baholash va muzokara",
            "scenario": [f"Yillik hajm: {annual} dona. Uch yetkazib beruvchining OTIF, brak, narx, yetkazish muddati va moliyaviy reytingi (1–5) berilgan.",
                         "Reyting formulasi: 35% OTIF + 25% sifat (100 − 10×brak%) + 25% narx (eng arzon/narx×100) + 15% moliyaviy reyting (×20)."],
            "data": {"annual_volume": annual, "suppliers": sup, "target_discount_pct": 5},
            "questions": ["1. Har bir yetkazib beruvchining OTIF va brak ko'rsatkichini tahlil qiling.",
                          "2. Yuqoridagi formula bo'yicha umumiy ballni hisoblang.",
                          "3. Har birining xavf darajasini baholang (OTIF, moliyaviy reyting).",
                          "4. Eng yaxshisini tanlang va 5% chegirma muzokarasidan yillik tejamni hisoblang."],
            "reference": {"scores": ref, "best_supplier": best["name"], "annual_saving_at_discount": _r2(annual * bp * 0.05)},
            "rubric": RUBRICS["supplier"]}


def _case_production(rng):
    qty, yld = rng.randrange(400, 901, 50), rng.choice([90, 92, 94, 96])
    start = math.ceil(qty / (yld / 100))
    mats = start - rng.randrange(20, 120, 10)
    daily, days, unit_cost, mat_price = rng.randrange(80, 121, 10), rng.randrange(4, 8), _r2(rng.uniform(3, 6)), _r2(rng.uniform(6, 10))
    cap = daily * days
    shortage = max(0, start - mats)
    overtime = max(0, start - cap)
    regular = start - overtime
    total = regular * unit_cost + overtime * unit_cost * 1.5 + shortage * mat_price * 1.4
    return {"title": "Ishlab chiqarish hajmi va favqulodda xarajat",
            "scenario": [f"Buyurtma: {qty} dona tayyor mahsulot. Yield (yaroqli chiqish): {yld}%. Mavjud material: {mats} birlik (1 birlik = 1 dona ishga tushirish).",
                         f"Liniya quvvati: kuniga {daily} dona, {days} ish kuni. Oddiy ishlab chiqarish: {unit_cost} /dona; qo'shimcha smena 1.5× narxda; yetishmagan materialni shoshilinch olish: {mat_price} ×1.4 /birlik."],
            "data": {"order_qty": qty, "yield_pct": yld, "materials_on_hand": mats, "daily_capacity": daily, "work_days": days, "unit_cost": unit_cost, "material_price": mat_price},
            "questions": ["1. Yieldni hisobga olib nechta birlik ishga tushirish kerak?",
                          "2. Materiallar yetarlimi? Yetishmovchilikni toping.",
                          "3. Quvvat yetadimi? Qo'shimcha smena hajmini toping.",
                          "4. Favqulodda xarajatni hisoblab, ishlab chiqarish rejasini yozing."],
            "reference": {"units_to_start": start, "material_shortage": shortage, "capacity": cap, "overtime_units": overtime, "total_cost": _r2(total)},
            "rubric": RUBRICS["production"]}


def _case_warehouse(rng):
    on_hand, allocated, on_order = rng.randrange(300, 701, 20), rng.randrange(50, 201, 10), rng.randrange(0, 301, 20)
    d, lead, ss, unit_cost, hold_pct, q = rng.randrange(30, 61, 5), rng.randrange(4, 10), rng.randrange(50, 151, 10), _r2(rng.uniform(10, 40)), rng.choice([15, 20, 25]), rng.randrange(200, 501, 50)
    atp = on_hand - allocated + on_order
    rop = d * lead + ss
    ip = on_hand + on_order - allocated
    monthly_hold = (ss + q / 2) * unit_cost * hold_pct / 100 / 12
    return {"title": "ATP, ROP va inventar pozitsiyasi",
            "scenario": [f"Omborda: {on_hand} dona; band qilingan (allocated): {allocated}; ochiq xarid: {on_order}. Kunlik talab: {d}, yetkazish muddati: {lead} kun, xavfsizlik zaxirasi: {ss}.",
                         f"Birlik qiymati: {unit_cost}; yillik saqlash stavkasi: {hold_pct}%; buyurtma partiyasi: {q} dona."],
            "data": {"on_hand": on_hand, "allocated": allocated, "on_order": on_order, "daily_demand": d, "lead_days": lead, "safety_stock": ss, "unit_cost": unit_cost, "holding_pct": hold_pct, "order_qty": q},
            "questions": ["1. Available-to-Promise (ATP) ni hisoblang (omborda − band + ochiq xarid).",
                          "2. Reorder Point (ROP) ni aniqlang.",
                          "3. Inventory Position ni toping va yangi buyurtma kerakligini aniqlang.",
                          "4. Oylik saqlash xarajatini hisoblang va zaxira strategiyasini asoslang."],
            "reference": {"atp": atp, "rop": rop, "inventory_position": ip, "reorder_needed": ip <= rop, "monthly_holding_cost": _r2(monthly_hold)},
            "rubric": RUBRICS["warehouse"]}


def _case_transport(rng):
    weight = rng.randrange(8000, 20001, 500)
    veh = [{"name": "Furgon", "capacity_kg": 1200, "cost_per_trip": 90, "late_prob_pct": 3},
           {"name": "O'rta yuk mashinasi", "capacity_kg": 5000, "cost_per_trip": 260, "late_prob_pct": 7},
           {"name": "Og'ir yuk mashinasi", "capacity_kg": 12000, "cost_per_trip": 520, "late_prob_pct": 12}]
    penalty = rng.choice([150, 200, 300])
    ref = []
    for v in veh:
        trips = math.ceil(weight / v["capacity_kg"])
        exp_pen = trips * v["late_prob_pct"] / 100 * penalty
        ref.append({"vehicle": v["name"], "trips": trips, "transport_cost": trips * v["cost_per_trip"], "expected_penalty": _r2(exp_pen), "expected_total": _r2(trips * v["cost_per_trip"] + exp_pen)})
    best = min(ref, key=lambda x: x["expected_total"])
    return {"title": "Qatnovlar soni va transport strategiyasi",
            "scenario": [f"Jo'natiladigan yuk: {weight} kg. Uch xil transport; har bir qatnov kechiksa jarima: {penalty} (kechikish ehtimoli jadvalda).",
                         "Kutilayotgan jarima = qatnovlar soni × kechikish ehtimoli × jarima."],
            "data": {"total_weight_kg": weight, "vehicles": veh, "late_penalty_per_trip": penalty},
            "questions": ["1. Har bir transport turi uchun kerakli qatnovlar sonini hisoblang.",
                          "2. Transport xarajatini taqqoslang.",
                          "3. Kechikish xavfi va kutilayotgan jarimani hisoblang.",
                          "4. Eng maqbul transport strategiyasini tanlab asoslang."],
            "reference": {"options": ref, "best_vehicle": best["vehicle"]},
            "rubric": RUBRICS["transport"]}


# ---------------------------------------------------------------- KPI simulyatsiya
SUPPLIERS = {"A": {"price": 8.0, "otif": 0.80, "defect": 0.06, "lead_days": 6},
             "B": {"price": 9.5, "otif": 0.92, "defect": 0.03, "lead_days": 4},
             "C": {"price": 11.5, "otif": 0.98, "defect": 0.01, "lead_days": 2}}
MODES = {"van": {"cap": 100, "cost": 60.0, "ontime": 0.97},
         "truck": {"cap": 400, "cost": 180.0, "ontime": 0.93},
         "express": {"cap": 250, "cost": 320.0, "ontime": 0.995}}
PROD_CAP, OT_CAP, PROD_COST, OT_FACTOR = 450, 100, 3.0, 2.0
HOLD_RAW, HOLD_FIN, LATE_PENALTY, SALE_PRICE, REF_UNIT_COST = 0.2, 0.5, 1.0, 18.0, 14.0
MAX_DECISION_QTY = 5000
START_STATE = {"raw": 300, "finished": 200, "pending": 0}
DECISION_FIELDS = {"procurement": "order_qty", "supplier": "supplier", "production": "production_qty",
                   "warehouse": "safety_stock", "transport": "mode"}


def make_demand(seed: str, rounds: int) -> list[dict[str, Any]]:
    """Barcha jamoalar uchun bir xil: haqiqiy talab, shoshilinch ulushi va talabaga ko'rinadigan taxminiy prognoz."""
    rng = random.Random(f"demand:{seed}")
    out = []
    for t in range(rounds):
        d = 300 + 15 * t + rng.randint(-40, 80)
        out.append({"round": t + 1, "demand": d, "urgent_share": round(rng.uniform(0.10, 0.30), 3),
                    "forecast": int(round(d * (1 + rng.uniform(-0.10, 0.10)) / 10.0) * 10)})
    return out


def default_decisions(forecast: int, last: dict[str, Any] | None = None) -> dict[str, Any]:
    if last:
        return dict(last)
    return {"order_qty": forecast, "supplier": "B", "production_qty": forecast, "safety_stock": int(0.2 * forecast), "mode": "van"}


def validate_decision(role: str, payload: dict[str, Any]) -> dict[str, Any]:
    field = DECISION_FIELDS[role]
    if not isinstance(payload, dict) or field not in payload:
        raise ValueError(f"'{field}' qiymati kerak.")
    v = payload[field]
    if role == "supplier":
        if v not in SUPPLIERS:
            raise ValueError("Yetkazib beruvchi: A, B yoki C.")
        return {field: v}
    if role == "transport":
        if v not in MODES:
            raise ValueError("Transport turi: van, truck yoki express.")
        return {field: v}
    if isinstance(v, bool) or not isinstance(v, int) or not 0 <= v <= MAX_DECISION_QTY:
        raise ValueError(f"'{field}' 0–{MAX_DECISION_QTY} oralig'ida butun son bo'lishi kerak.")
    return {field: v}


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def simulate_round(state: dict[str, Any], applied: dict[str, Any], demand: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Bitta jamoaning bitta raundi. state: raw, finished, pending. Yangi holat va KPI qaytaradi (deterministik)."""
    raw, fin, pending = state["raw"], state["finished"], state["pending"]
    q, sname, p, ss, mname = applied["order_qty"], applied["supplier"], applied["production_qty"], applied["safety_stock"], applied["mode"]
    s, m = SUPPLIERS[sname], MODES[mname]
    # Xarid va yetkazib berish: OTIF ulushi shu raundda keladi, qolgani keyingi raundda; brak keladigan miqdordan chiqariladi.
    on_time = round(q * s["otif"])
    usable_now = math.floor(on_time * (1 - s["defect"]))
    usable_late = math.floor((q - on_time) * (1 - s["defect"]))
    raw += pending + usable_now
    new_pending = usable_late
    procurement_cost = q * s["price"]
    # Ishlab chiqarish
    producible = min(p, raw)
    regular = min(producible, PROD_CAP)
    overtime = min(producible - regular, OT_CAP)
    produced = regular + overtime
    raw -= produced
    fin += produced
    production_cost = regular * PROD_COST + overtime * PROD_COST * OT_FACTOR
    # Talabni bajarish: oddiy talab faqat ATP (zaxiradan xavfsizlik zaxirasi ayirilgan) dan, shoshilinch talab — butun zaxiradan.
    d = demand["demand"]
    urgent = round(d * demand["urgent_share"])
    regular_d = d - urgent
    atp = max(0, fin - ss)
    ship_reg = min(regular_d, atp)
    ship_urg = min(urgent, fin - ship_reg)
    shipped = ship_reg + ship_urg
    fin -= shipped
    # Transport
    trips = math.ceil(shipped / m["cap"]) if shipped else 0
    transport_cost = trips * m["cost"]
    late_units = shipped * (1 - m["ontime"])
    late_penalty = late_units * LATE_PENALTY
    holding = raw * HOLD_RAW + fin * HOLD_FIN
    total_cost = procurement_cost + production_cost + transport_cost + late_penalty + holding
    service = shipped / d if d else 1.0
    otif = (shipped - late_units) / d if d else 1.0
    satisfaction = 100 * (0.5 * service + 0.5 * otif)
    inv = raw + fin
    cost_score = _clamp(100 * REF_UNIT_COST / (total_cost / max(shipped, 1)))
    inv_score = _clamp(100 * (1 - max(0.0, inv - 2 * d) / (2 * d)))
    score = 0.30 * 100 * service + 0.20 * 100 * otif + 0.25 * cost_score + 0.10 * inv_score + 0.15 * satisfaction
    kpi = {"demand": d, "shipped": shipped, "lost_sales": d - shipped, "inventory": inv, "raw_inventory": raw, "finished_inventory": fin,
           "procurement_cost": _r2(procurement_cost), "production_cost": _r2(production_cost), "transport_cost": _r2(transport_cost),
           "holding_cost": _r2(holding), "late_penalty": _r2(late_penalty), "total_cost": _r2(total_cost),
           "lead_time_days": s["lead_days"], "otif_pct": _r2(100 * otif), "service_level_pct": _r2(100 * service),
           "capacity_utilization_pct": _r2(100 * produced / PROD_CAP), "customer_satisfaction": _r2(satisfaction),
           "profit": _r2(shipped * SALE_PRICE - total_cost), "round_score": _r2(score)}
    return {"raw": raw, "finished": fin, "pending": new_pending}, kpi


# ---------------------------------------------------------------- qarorlarni avtomatik baholash (o'qituvchi tasdiqlaydi)
def _closeness(value: float, ideal: float, floor: float) -> float:
    return _r2(100 * max(0.0, 1 - abs(value - ideal) / max(ideal, floor)))


def auto_score(role: str, payload: dict[str, Any], state: dict[str, Any], applied: dict[str, Any], forecast: int) -> float:
    """Qarorni raund boshidagi holat va KO'RINADIGAN prognoz bo'yicha baholaydi (kelajak talabidan foydalanmaydi)."""
    f = forecast
    if role == "procurement":
        s = SUPPLIERS[applied["supplier"]]
        ideal = max(0, math.ceil((1.3 * f - state["raw"] - state["pending"]) / (1 - s["defect"])))
        return _closeness(payload["order_qty"], ideal, 50) if ideal or payload["order_qty"] else 100.0
    if role == "supplier":
        lo = min(x["price"] / (1 - x["defect"]) for x in SUPPLIERS.values())
        hi = max(x["otif"] for x in SUPPLIERS.values())
        value = {k: 0.5 * (lo / (x["price"] / (1 - x["defect"]))) + 0.5 * (x["otif"] / hi) for k, x in SUPPLIERS.items()}
        vmin, vmax = min(value.values()), max(value.values())
        return _r2(60 + 40 * (value[payload["supplier"]] - vmin) / (vmax - vmin)) if vmax > vmin else 100.0
    if role == "production":
        ideal = min(PROD_CAP, max(0, math.ceil(1.1 * f + applied["safety_stock"] - state["finished"])), state["raw"] + state["pending"])
        return _closeness(payload["production_qty"], ideal, 50) if ideal or payload["production_qty"] else 100.0
    if role == "warehouse":
        return _closeness(payload["safety_stock"], 0.25 * f, 30)
    if role == "transport":
        vol = 0.9 * f

        def cost(mn: str) -> float:
            m = MODES[mn]
            return math.ceil(vol / m["cap"]) * m["cost"] + vol * (1 - m["ontime"]) * LATE_PENALTY
        best = min(cost(k) for k in MODES)
        return _r2(100 * best / cost(payload["mode"]))
    raise ValueError("Noma'lum rol.")


# ---------------------------------------------------------------- baho formulasi
def average(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def individual_score(case_avg: float | None, decision_avg: float | None) -> float | None:
    """Individual Score = Case × 0.5 + Decision × 0.5. Ikkala komponent ham yo'q bo'lsa baho ko'rsatilmaydi (None).
    Bitta komponent yo'q bo'lsa, u 0 hisoblanadi (formulaga so'zma-so'z amal qilinadi)."""
    if case_avg is None and decision_avg is None:
        return None
    return _r2((case_avg or 0.0) * 0.5 + (decision_avg or 0.0) * 0.5)
