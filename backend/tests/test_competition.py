import math
import os
from collections import Counter
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

SECRET = "test-secret-that-is-at-least-32-characters-long"
os.environ["SCW_JWT_SECRET"] = SECRET
os.environ.pop("GEMINI_API_KEY", None)
os.environ.pop("SCW_TEACHER_INVITE_CODE", None)

from main import create_app
import competition_logic as L

PW = "strong-password-123"


def make_client(tmp_path):
    return TestClient(create_app(f"sqlite:///{tmp_path / 'c.db'}", SECRET))


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def reg(client, kind, name, email, **extra):
    r = client.post("/api/comp/register", json={"kind": kind, "full_name": name, "email": email, "password": PW, **extra})
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


class Env:
    """Virtual o'qituvchi va N ta virtual talaba bilan musobaqa."""

    def __init__(self, client, n, rounds=3, join=True):
        self.c, self.n, self.rounds = client, n, rounds
        self.t = auth(reg(client, "teacher", "O'qituvchi", "teacher@example.com"))
        comp = client.post("/api/comp/competitions", headers=self.t, json={"title": "Test musobaqa", "rounds_total": rounds, "seed": "seed1"}).json()
        self.cid, self.code = comp["id"], comp["code"]
        self.s = []
        for i in range(n):
            h = auth(reg(client, "student", f"Talaba {i + 1:02d}", f"s{i + 1}@example.com"))
            self.s.append(h)
            if join:
                assert client.post("/api/comp/join", headers=h, json={"code": self.code}).status_code == 200

    def url(self, tail=""):
        return f"/api/comp/competitions/{self.cid}{tail}"

    def overview(self):
        return self.c.get(self.url(), headers=self.t).json()

    def assign(self, team_count=None):
        return self.c.post(self.url("/auto-assign"), headers=self.t, json={"team_count": team_count})

    def start(self):
        return self.c.post(self.url("/start"), headers=self.t)

    def me(self, i):
        return self.c.get(self.url("/me"), headers=self.s[i]).json()

    def tasks(self):
        return self.c.get(self.url("/tasks"), headers=self.t).json()

    def decide(self, i, value):
        role = self.me(i)["role"]
        return self.c.post(self.url("/decision"), headers=self.s[i], json={"payload": {L.DECISION_FIELDS[role]: value}})


GOOD = {"order_qty": 400, "supplier": "B", "production_qty": 350, "safety_stock": 80, "mode": "van"}


def decide_all(env, values=None):
    for i in range(env.n):
        role = env.me(i)["role"]
        r = env.decide(i, (values or GOOD)[L.DECISION_FIELDS[role]])
        assert r.status_code == 200, r.text


def approve_all_tasks(env, score=80):
    for t in env.tasks():
        if t["status"] != "SUBMITTED":
            continue
        r = env.c.post(env.url(f"/tasks/{t['id']}/review"), headers=env.t, json={"action": "approve", "score": score, "feedback": "Yaxshi"})
        assert r.status_code == 200, r.text


def submit_all_tasks(env):
    for i in range(env.n):
        assert env.c.put(env.url("/task"), headers=env.s[i], json={"answer": f"Javob {i}"}).status_code == 200


# ------------------------------------------------------------------ hisoblar va ruxsatlar
def test_register_login_and_kinds(tmp_path):
    c = make_client(tmp_path)
    t = auth(reg(c, "teacher", "Ustoz", "t@example.com"))
    s = auth(reg(c, "student", "Talaba", "s@example.com"))
    assert c.get("/api/comp/me", headers=t).json()["kind"] == "teacher"
    login = c.post("/api/auth/login", json={"email": "s@example.com", "password": PW})
    assert login.status_code == 200 and c.get("/api/comp/me", headers=auth(login.json()["access_token"])).json()["kind"] == "student"
    assert c.post("/api/comp/register", json={"kind": "student", "full_name": "X Y", "email": "S@example.com", "password": PW}).status_code == 409
    assert c.post("/api/comp/register", json={"kind": "admin", "full_name": "X Y", "email": "a@example.com", "password": PW}).status_code == 422
    assert c.post("/api/comp/competitions", headers=s, json={"title": "Hack"}).status_code == 403
    assert c.post("/api/comp/join", headers=t, json={"code": "ABCDEF"}).status_code == 403


def test_teacher_invite_code(tmp_path, monkeypatch):
    c = make_client(tmp_path)
    monkeypatch.setenv("SCW_TEACHER_INVITE_CODE", "maxfiy-kod")
    body = {"kind": "teacher", "full_name": "Ustoz", "email": "t@example.com", "password": PW}
    assert c.post("/api/comp/register", json=body).status_code == 403
    assert c.post("/api/comp/register", json={**body, "invite_code": "xato"}).status_code == 403
    assert c.post("/api/comp/register", json={**body, "invite_code": "maxfiy-kod"}).status_code == 201
    assert c.post("/api/comp/register", json={**body, "kind": "student", "email": "s@example.com"}).status_code == 201


def test_join_rules_and_isolation(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 10)
    assert c.post("/api/comp/join", headers=env.s[0], json={"code": "ZZZZZZ"}).status_code == 404
    again = c.post("/api/comp/join", headers=env.s[0], json={"code": env.code.lower()})
    assert again.status_code == 200 and again.json()["joined"] is False
    other = auth(reg(c, "teacher", "Boshqa ustoz", "t2@example.com"))
    assert c.get(env.url(), headers=other).status_code == 404
    assert c.get(env.url(), headers=env.s[0]).status_code == 403
    assert c.post(env.url("/start"), headers=other).status_code == 404
    assert env.assign().status_code == 200 and env.start().status_code == 200
    late = auth(reg(c, "student", "Kech", "late@example.com"))
    assert c.post("/api/comp/join", headers=late, json={"code": env.code}).status_code == 409
    assert c.get(env.url("/me"), headers=late).status_code == 404


# ------------------------------------------------------------------ jamoalarga taqsimlash (hujjatdagi test holatlari)
@pytest.mark.parametrize("n,teams", [(15, 3), (16, 3), (17, 3), (18, 3), (19, 3), (20, 4)])
def test_distribution_for_class_sizes(tmp_path, n, teams):
    c = make_client(tmp_path)
    env = Env(c, n)
    assert env.assign().status_code == 200
    ov = env.overview()
    sizes = sorted(t["size"] for t in ov["teams"])
    assert len(ov["teams"]) == teams and sum(sizes) == n
    assert sizes[-1] - sizes[0] <= 1 and sizes[0] >= 5
    assert ov["problems"] == []
    for t in ov["teams"]:
        roles = Counter(e["role"] for e in ov["enrollments"] if e["team_id"] == t["id"])
        assert set(roles) == set(L.ROLES), roles
    if n in (15, 20):
        assert set(sizes) == {5}
    assert env.start().status_code == 200
    tasks = env.tasks()
    assert len(tasks) == n and all(t["status"] == "ASSIGNED" for t in tasks)
    for e in ov["enrollments"]:
        assert next(t for t in tasks if t["student_id"] == e["student_id"])["role"] == e["role"]


def test_not_enough_students_and_team_bounds(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 9)
    assert env.assign().status_code == 422
    assert env.start().status_code == 409
    c2 = make_client(tmp_path / "x") if (tmp_path / "x").mkdir() is None else None
    env2 = Env(c2, 15)
    assert env2.assign(1).status_code == 422 and env2.assign(5).status_code == 422
    assert env2.assign(4).status_code == 422  # 15 talaba 4 jamoaga yetmaydi (har birida >=5)
    assert env2.assign(2).status_code == 200
    assert sorted(t["size"] for t in env2.overview()["teams"]) == [7, 8]


def test_teacher_edits_and_start_validation(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 20)
    assert env.start().status_code == 409  # taqsimlanmagan
    env.assign()
    ov = env.overview()
    teams = [t["id"] for t in ov["teams"]]
    a = next(e for e in ov["enrollments"] if e["team_id"] == teams[0])
    # talabani boshqa jamoaga o'tkazish — 1-jamoada 4 qoladi
    assert c.patch(env.url(f"/enrollments/{a['id']}"), headers=env.t, json={"set_team": True, "team_id": teams[1]}).status_code == 200
    r = env.start()
    assert r.status_code == 409 and any("kamida 5" in p for p in r.json()["detail"]["problems"])
    # qaytarish va rolni olib tashlash
    c.patch(env.url(f"/enrollments/{a['id']}"), headers=env.t, json={"set_team": True, "team_id": teams[0]})
    c.patch(env.url(f"/enrollments/{a['id']}"), headers=env.t, json={"set_role": True, "role": None})
    r = env.start()
    assert r.status_code == 409 and any("rol" in p.lower() for p in r.json()["detail"]["problems"])
    assert c.patch(env.url(f"/enrollments/{a['id']}"), headers=env.t, json={"set_role": True, "role": "ceo"}).status_code == 422
    assert c.patch(env.url(f"/enrollments/{a['id']}"), headers=env.t, json={"set_role": True, "role": a["role"]}).status_code == 200
    assert env.start().status_code == 200
    # boshlangandan keyin tayinlovlarni o'zgartirib bo'lmaydi
    assert c.patch(env.url(f"/enrollments/{a['id']}"), headers=env.t, json={"set_role": True, "role": "supplier"}).status_code == 409
    assert env.assign().status_code == 409


# ------------------------------------------------------------------ case topshiriqlar va baholash
def test_task_workflow_review_and_privacy(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15)
    env.assign(); env.start()
    mine = env.me(0)["task"]
    assert "reference" not in mine["content"] and mine["status"] == "ASSIGNED"
    assert "reference" in env.tasks()[0]["content"]  # o'qituvchi tayyor javobni ko'radi
    assert sum(x["max"] for x in mine["content"]["rubric"]) == 100
    tid = next(t["id"] for t in env.tasks() if t["student_id"] == c.get("/api/comp/me", headers=env.s[0]).json()["id"])
    rv = lambda body: c.post(env.url(f"/tasks/{tid}/review"), headers=env.t, json=body)
    assert rv({"action": "approve", "score": 90}).status_code == 409  # javob hali yo'q
    assert c.put(env.url("/task"), headers=env.s[0], json={"answer": ""}).status_code == 422
    assert c.put(env.url("/task"), headers=env.s[0], json={"answer": "Mening javobim"}).json()["status"] == "SUBMITTED"
    assert c.put(env.url("/task"), headers=env.s[0], json={"answer": "Qayta"}).status_code == 409  # tekshiruvda
    assert rv({"action": "approve"}).status_code == 422  # raqamli ball shart
    assert rv({"action": "approve", "score": 101}).status_code == 422
    assert rv({"action": "return"}).status_code == 422  # izohsiz qaytarib bo'lmaydi
    assert rv({"action": "return", "feedback": "Formulani yozing"}).json()["status"] == "RETURNED"
    view = env.me(0)["task"]
    assert view["status"] == "RETURNED" and view["feedback"] == "Formulani yozing" and view["score"] is None
    assert c.put(env.url("/task"), headers=env.s[0], json={"answer": "Tuzatilgan javob"}).status_code == 200
    names = [x["criterion"] for x in mine["content"]["rubric"]]
    assert rv({"action": "approve", "criteria": {names[0]: 26}}).status_code == 422
    assert rv({"action": "approve", "criteria": {"yo'q": 5}}).status_code == 422
    assert rv({"action": "approve", "score": 50, "criteria": {names[0]: 20, names[1]: 20, names[2]: 20}}).status_code == 422
    ok = rv({"action": "approve", "criteria": {names[0]: 20, names[1]: 20, names[2]: 20, names[3]: 15}, "feedback": "Yaxshi"}).json()
    assert ok["status"] == "APPROVED" and ok["score"] == 75
    seen = env.me(0)["task"]
    assert seen["score"] == 75 and seen["criteria"][names[3]] == 15
    other = env.me(1)["task"]
    assert other["score"] is None  # boshqa talaba ballini ko'rmaydi
    assert c.get(env.url("/tasks"), headers=env.s[0]).status_code == 403


# ------------------------------------------------------------------ qarorlar va raundlar
def test_decision_validation_and_defaults(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15)
    env.assign(); env.start()
    assert env.decide(0, 1).status_code in (200, 422)
    by_role = {env.me(i)["role"]: i for i in range(15)}
    i_sup, i_pro, i_tr = by_role["supplier"], by_role["procurement"], by_role["transport"]
    assert env.decide(i_sup, "Z").status_code == 422
    assert env.decide(i_tr, "rocket").status_code == 422
    assert env.decide(i_pro, -5).status_code == 422
    assert env.decide(i_pro, 10 ** 6).status_code == 422
    assert env.decide(i_pro, 12.5).status_code == 422
    assert env.decide(i_pro, True).status_code == 422
    assert c.post(env.url("/decision"), headers=env.s[i_pro], json={"payload": {"supplier": "A"}}).status_code == 422  # boshqa rol maydoni
    f = env.me(i_pro)["current_round"]["forecast"]
    ideal = math.ceil((1.3 * f - L.START_STATE["raw"]) / (1 - L.SUPPLIERS["B"]["defect"]))  # B — standart yetkazib beruvchi
    assert env.decide(i_pro, 450).status_code == 200 and env.decide(i_pro, ideal).status_code == 200  # almashtirish mumkin
    assert env.me(i_pro)["current_round"]["my_decision"] == {"order_qty": ideal}
    res = c.post(env.url("/rounds/resolve"), headers=env.t)
    assert res.status_code == 200 and res.json()["resolved_round"] == 1
    decs = c.get(env.url("/decisions?round=1"), headers=env.t).json()
    assert len(decs) == 15
    ghost = [d for d in decs if not d["submitted"]]
    assert len(ghost) >= 13 and all(d["auto_score"] == 0 for d in ghost)  # topshirmaganlar 0
    sub = next(d for d in decs if d["submitted"] and d["role"] == "Procurement Manager")
    assert sub["applied"] is True and sub["auto_score"] > 95  # ideal miqdorga teng qaror
    teams = c.get(env.url("/results/teams"), headers=env.t).json()
    assert all(t["rounds_played"] == 1 for t in teams)
    for t in teams:
        assert t["rounds"][0]["applied"]["supplier"] == "B"  # standart qaror (prognozdan)
    assert env.me(0)["current_round"]["round"] == 2


def test_duplicate_role_uses_first_submitted_and_scores_both(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 16)
    env.assign(); env.start()
    ov = env.overview()
    sixers = [t for t in ov["teams"] if t["size"] == 6]
    team = sixers[0]["id"]
    dup = [e for e in ov["enrollments"] if e["team_id"] == team and e["role"] == "procurement"]
    assert len(dup) == 2
    idx = {e["student_id"]: i for i, e in enumerate(ov["enrollments"])}
    ids = {c.get("/api/comp/me", headers=h).json()["id"]: i for i, h in enumerate(env.s)}
    first, second = ids[dup[0]["student_id"]], ids[dup[1]["student_id"]]
    assert env.decide(second, 111).status_code == 200  # faqat ikkinchisi topshirdi -> o'sha qo'llanadi
    c.post(env.url("/rounds/resolve"), headers=env.t)
    teams = {t["team_id"]: t for t in c.get(env.url("/results/teams"), headers=env.t).json()}
    assert teams[team]["rounds"][0]["applied"]["order_qty"] == 111
    decs = {d["student"]: d for d in c.get(env.url("/decisions?round=1"), headers=env.t).json()}
    assert decs[f"Talaba {second + 1:02d}"]["applied"] is True
    assert decs[f"Talaba {first + 1:02d}"]["submitted"] is False and decs[f"Talaba {first + 1:02d}"]["auto_score"] == 0


# ------------------------------------------------------------------ to'liq hayot sikli, yakunlash shartlari, baho formulasi
def run_to_end(env):
    submit_all_tasks(env)
    for _ in range(env.rounds):
        decide_all(env)
        assert env.c.post(env.url("/rounds/resolve"), headers=env.t).status_code == 200
    assert env.c.post(env.url("/rounds/resolve"), headers=env.t).status_code == 409  # raundlar tugagan


def test_full_lifecycle_with_20_students(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 20, rounds=3)
    env.assign(); env.start()
    assert len(env.overview()["teams"]) == 4
    assert env.c.post(env.url("/finalize"), headers=env.t).status_code == 409
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False and any("case" in b.lower() for b in fin["blockers"])
    run_to_end(env)
    # hali baholanmagan: bloklanadi
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False
    assert any("tasdiqlanmagan" in b for b in fin["blockers"]) and any("qaror" in b for b in fin["blockers"])
    approve_all_tasks(env, 80)
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False and not any("tasdiqlanmagan" in b for b in fin["blockers"])
    # operatsion qarorlarni qo'lda 60 ball bilan baholash (bittasi tashqari), qolganlarini avtomatik qabul qilish
    decs = c.get(env.url("/decisions"), headers=env.t).json()
    assert len(decs) == 20 * 3
    for d in decs:
        assert c.patch(env.url(f"/decisions/{d['id']}"), headers=env.t, json={"score": 60}).status_code == 200
    assert c.patch(env.url(f"/decisions/{decs[0]['id']}"), headers=env.t, json={"score": 120}).status_code == 422
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin == {"ready": True, "blockers": []}
    # yakunlashdan oldin talaba reytingi yopiq, faqat o'zi
    own = c.get(env.url("/results/students"), headers=env.s[0]).json()
    assert len(own) == 1 and own[0]["case_average"] == 80 and own[0]["decision_average"] == 60 and own[0]["individual_score"] == 70
    assert c.post(env.url("/finalize"), headers=env.s[0]).status_code in (403, 404, 405)
    done = c.post(env.url("/finalize"), headers=env.t)
    assert done.status_code == 200 and done.json()["status"] == "FINISHED"
    # yakunlangach: o'zgartirib bo'lmaydi, reyting ochiladi
    t0 = env.tasks()[0]
    assert c.post(env.url(f"/tasks/{t0['id']}/review"), headers=env.t, json={"action": "approve", "score": 10}).status_code == 409
    assert c.patch(env.url(f"/decisions/{decs[0]['id']}"), headers=env.t, json={"score": 1}).status_code == 409
    assert c.post(env.url("/decisions/accept-auto"), headers=env.t, json={}).status_code == 409
    assert c.post(env.url("/finalize"), headers=env.t).status_code == 409
    allr = c.get(env.url("/results/students"), headers=env.s[0]).json()
    assert len(allr) == 20 and all("student_id" not in r for r in allr)
    assert allr[0]["rank"] == 1 and all(r["individual_score"] == 70 for r in allr)
    teams = c.get(env.url("/results/teams"), headers=env.s[3]).json()
    assert len(teams) == 4 and [t["rank"] for t in teams] == [1, 2, 3, 4]
    assert all(t["rounds_played"] == 3 for t in teams)
    assert [t["team_score"] for t in teams] == sorted((t["team_score"] for t in teams), reverse=True)


def test_team_result_and_individual_result_are_separate(tmp_path):
    """Jamoaning yuqori natijasi har bir talabaga avtomatik yuqori individual baho bermaydi."""
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    env.assign(); env.start()
    run_to_end(env)
    approve_all_tasks(env, 40)
    c.post(env.url("/decisions/accept-auto"), headers=env.t, json={})
    teams = c.get(env.url("/results/teams"), headers=env.t).json()
    studs = c.get(env.url("/results/students"), headers=env.t).json()
    assert max(t["team_score"] for t in teams) > 85  # jamoa KPI yaxshi
    assert all(s["individual_score"] <= 70.01 for s in studs)  # lekin case 40 bo'lgani uchun individual yuqori emas (40*0.5 + 100*0.5 = 70)
    assert all(s["individual_score"] < t["team_score"] for s in studs for t in teams)
    assert all(abs(s["individual_score"] - (40 * 0.5 + s["decision_average"] * 0.5)) < 0.01 for s in studs)


def test_accept_auto_scores_and_finalize_15_students(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    env.assign(); env.start()
    run_to_end(env)
    approve_all_tasks(env, 90)
    assert c.post(env.url("/decisions/accept-auto"), headers=env.t, json={"round": 1}).json()["graded"] == 15
    assert c.get(env.url("/finalization"), headers=env.t).json()["ready"] is False  # 2 va 3-raund baholanmagan
    assert c.post(env.url("/decisions/accept-auto"), headers=env.t, json={}).json()["graded"] == 30
    assert c.post(env.url("/finalize"), headers=env.t).status_code == 200


def test_finalize_blocked_when_a_role_task_is_missing(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    env.assign(); env.start()
    run_to_end(env)
    approve_all_tasks(env, 70)
    c.post(env.url("/decisions/accept-auto"), headers=env.t, json={})
    tasks = env.tasks()
    one = tasks[0]
    # tasdiqlangan topshiriqni qaytarish — endi baholanmagan
    assert c.post(env.url(f"/tasks/{one['id']}/review"), headers=env.t, json={"action": "return", "feedback": "Qayta ishlang"}).status_code == 200
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False and any("tasdiqlanmagan" in b for b in fin["blockers"])
    assert c.post(env.url("/finalize"), headers=env.t).status_code == 409


def test_individual_score_formula_unit():
    assert L.individual_score(None, None) is None
    assert L.individual_score(80, 60) == 70
    assert L.individual_score(100, 100) == 100
    assert L.individual_score(80, None) == 40  # bitta komponent yo'q — formulaga so'zma-so'z
    assert L.individual_score(None, 60) == 30
    assert L.individual_score(0, 0) == 0


def test_class_size_helpers():
    for n, k in [(10, 2), (14, 2), (15, 3), (19, 3), (20, 4), (50, 4)]:
        assert L.team_count_for(n) == k
    with pytest.raises(ValueError):
        L.team_count_for(9)
    for n in range(10, 61):
        rows = L.assign_teams([f"s{i}" for i in range(n)], None, "z")
        per = Counter(r["team"] for r in rows)
        assert min(per.values()) >= 5 and max(per.values()) - min(per.values()) <= 1
        for t in per:
            assert {r["role"] for r in rows if r["team"] == t} == set(L.ROLES)


def test_simulation_is_deterministic_and_rewards_good_decisions():
    dem = L.make_demand("s", 6)
    assert dem == L.make_demand("s", 6) and dem != L.make_demand("t", 6)

    def play(policy):
        st, scores = dict(L.START_STATE), []
        for d in dem:
            st, k = L.simulate_round(st, policy(d["forecast"]), d)
            scores.append(k["round_score"])
        return sum(scores) / len(scores)
    good = play(lambda f: {"order_qty": int(1.1 * f), "supplier": "B", "production_qty": f, "safety_stock": int(0.25 * f), "mode": "van" if f < 400 else "truck"})
    bad = play(lambda f: {"order_qty": 0, "supplier": "A", "production_qty": 0, "safety_stock": 1000, "mode": "express"})
    assert good > 85 > 50 > bad
    assert play(lambda f: L.default_decisions(f)) == play(lambda f: L.default_decisions(f))


def test_case_references_are_correct():
    for seed in ("a", "b", "c"):
        c = L.make_case("warehouse", seed)
        d, r = c["data"], c["reference"]
        assert r["atp"] == d["on_hand"] - d["allocated"] + d["on_order"]
        assert r["rop"] == d["daily_demand"] * d["lead_days"] + d["safety_stock"]
        t = L.make_case("transport", seed)
        best = min(t["reference"]["options"], key=lambda o: o["expected_total"])
        assert best["vehicle"] == t["reference"]["best_vehicle"]
        for o in t["reference"]["options"]:
            veh = next(v for v in t["data"]["vehicles"] if v["name"] == o["vehicle"])
            assert o["trips"] * veh["capacity_kg"] >= t["data"]["total_weight_kg"] > (o["trips"] - 1) * veh["capacity_kg"]
        p = L.make_case("procurement", seed)
        assert p["reference"]["net_requirement"] == max(0, p["data"]["monthly_demand"] + p["data"]["safety_stock"] - p["data"]["on_hand"] - p["data"]["on_order"])
        for s in p["reference"]["suppliers"]:
            moq = next(x["moq"] for x in p["data"]["suppliers"] if x["name"] == s["name"])
            assert s["order_qty"] >= moq
    assert L.make_case("production", "a") == L.make_case("production", "a") and L.make_case("production", "a") != L.make_case("production", "b")


def test_cors_preflight_allows_patch(tmp_path):
    c = make_client(tmp_path)
    r = c.options("/api/comp/competitions/x/enrollments/y", headers={"Origin": "https://example.com", "Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "authorization,content-type"})
    assert r.status_code == 200 and "PATCH" in r.headers["access-control-allow-methods"]
