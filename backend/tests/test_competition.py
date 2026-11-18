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


def student_id(env, i):
    return env.c.get("/api/comp/me", headers=env.s[i]).json()["id"]


def answers_for(env, i, perfect=True):
    ref = {t["student_id"]: t for t in env.tasks()}[student_id(env, i)]["content"]["reference"]["answers"]
    out = {}
    for f in env.me(i)["task"]["content"]["fields"]:
        v = ref[f["key"]]
        out[f["key"]] = v if perfect else (v * 2 + 1000 if f["type"] == "number" else next(o for o in f["options"] if o != v))
    return out


def submit_all_tasks(env, perfect=True, only=None):
    for i in (only if only is not None else range(env.n)):
        r = env.c.put(env.url("/task"), headers=env.s[i], json={"answers": answers_for(env, i, perfect)})
        assert r.status_code == 200, r.text


def play_bullwhip(env, i, perfect=True):
    bw = env.me(i)["bullwhip"]
    orders = L.bullwhip_policy_orders(bw["seed"], bw["rounds"], bw["role_index"]) if perfect else [0] * bw["rounds"]
    r = env.c.post(env.url("/bullwhip"), headers=env.s[i], json={"orders": orders})
    assert r.status_code == 200, r.text
    return r.json()


def play_all_bullwhip(env, perfect=True, only=None):
    for i in (only if only is not None else range(env.n)):
        play_bullwhip(env, i, perfect)


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
def test_task_is_graded_automatically_and_teacher_can_override(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15)
    env.assign(); env.start()
    mine = env.me(0)["task"]
    assert "reference" not in mine["content"] and mine["status"] == "ASSIGNED"
    assert "reference" in env.tasks()[0]["content"]  # o'qituvchi tayyor javobni ko'radi
    assert sum(x["max"] for x in mine["content"]["rubric"]) == 100 and sum(f["points"] for f in mine["content"]["fields"]) == 100
    url = env.url("/task")
    put = lambda body: c.put(url, headers=env.s[0], json=body)
    assert put({}).status_code == 422 and put({"answers": {}}).status_code == 422
    good = answers_for(env, 0)
    first = mine["content"]["fields"][0]["key"]
    assert put({"answers": dict(good, **{first: "abc"})}).status_code == 422
    assert put({"answers": {k: v for k, v in good.items() if k != first}}).status_code == 422
    assert env.me(0)["task"]["status"] == "ASSIGNED"  # xato yuborish topshirmaydi
    done = put({"answers": good}).json()
    assert done["status"] == "APPROVED" and done["score"] == 100 and sum(done["criteria"].values()) == 100
    assert put({"answers": good}).status_code == 409  # qayta topshirib bo'lmaydi
    other = env.me(1)["task"]
    assert other["score"] is None and other["status"] == "ASSIGNED"  # boshqa talaba ballini ko'rmaydi
    assert c.get(env.url("/tasks"), headers=env.s[0]).status_code == 403
    tid = next(t["id"] for t in env.tasks() if t["student_id"] == student_id(env, 0))
    rv = lambda body: c.post(env.url(f"/tasks/{tid}/review"), headers=env.t, json=body)
    assert rv({"action": "return"}).status_code == 422
    assert rv({"action": "return", "feedback": "Qayta urinib ko'ring"}).json()["status"] == "RETURNED"
    assert env.me(0)["task"]["score"] is None
    wrong = put({"answers": answers_for(env, 0, perfect=False)}).json()
    assert wrong["status"] == "APPROVED" and wrong["score"] == 0
    names = [x["criterion"] for x in mine["content"]["rubric"]]
    assert rv({"action": "approve", "criteria": {names[0]: 26}}).status_code == 422
    assert rv({"action": "approve", "criteria": {"yo'q": 5}}).status_code == 422
    ok = rv({"action": "approve", "criteria": {n: 10 for n in names[:3]}, "feedback": "O'qituvchi bahosi"}).json()
    assert ok["score"] == 30 and env.me(0)["task"]["score"] == 30


def test_case_grading_partial_credit_and_all_roles():
    for role in L.ROLES:
        content = L.make_case(role, "z")
        ref = content["reference"]["answers"]
        assert sum(f["points"] for f in content["fields"]) == 100 and set(ref) == {f["key"] for f in content["fields"]}
        clean = L.check_answers(content, ref)
        assert L.grade_case(content, clean, ref)[0] == 100
        f = next(f for f in content["fields"] if f["type"] == "number")
        r0 = ref[f["key"]]
        off = dict(clean, **{f["key"]: r0 + (max(0.5, 0.01 * abs(r0)) + max(1.0, 0.05 * abs(r0))) / 2})  # to'liq va yarim chegara oralig'i -> yarim ball
        score, crit, _ = L.grade_case(content, off, ref)
        assert score == 100 - f["points"] / 2 and crit[f["label"]] == f["points"] / 2
        far = dict(clean, **{f["key"]: ref[f["key"]] * 2 + 10})
        assert L.grade_case(content, far, ref)[0] == 100 - f["points"]
        tiny = dict(clean, **{f["key"]: ref[f["key"]] + 0.4})  # 0.5 ichida -> to'liq
        assert L.grade_case(content, tiny, ref)[0] == 100
        with pytest.raises(ValueError):
            L.check_answers(content, dict(ref, **{f["key"]: float("nan")}))
        with pytest.raises(ValueError):
            L.check_answers(content, dict(ref, **{f["key"]: True}))
    prod = L.make_case("production", "q")
    assert L.check_answers(prod, {k: str(v).replace(".", ",") for k, v in prod["reference"]["answers"].items()})


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
    sub = next(d for d in decs if d["student"] == f"Talaba {i_pro + 1:02d}")
    assert sub["applied"] is True and sub["auto_score"] > 95  # ideal miqdorga teng qaror
    assert all(d["score"] == d["auto_score"] for d in decs)  # ball avtomatik qo'yiladi
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


# ------------------------------------------------------------------ to'liq hayot sikli, avtomatik yakunlash, baho formulasi
def play_rounds(env):
    for k in range(env.rounds):
        assert env.me(0)["current_round"]["round"] == k + 1
        decide_all(env)  # oxirgi talaba yuborgach raund o'zi hisoblanadi


def test_full_lifecycle_is_automatic_for_20_students(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 20, rounds=3)
    env.assign(); env.start()
    assert len(env.overview()["teams"]) == 4
    assert env.c.post(env.url("/finalize"), headers=env.t).status_code == 409
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False and any("tasdiqlanmagan" in b for b in fin["blockers"])
    submit_all_tasks(env)
    for k in range(3):
        decide_all(env)  # o'qituvchi hech narsa bosmaydi
        assert env.overview()["current_round"] == k + 2
    assert env.overview()["status"] == "RUNNING"  # bullwhip hali yo'q
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False and any("Bullwhip" in b for b in fin["blockers"]) and fin["can_force"] is True
    own = c.get(env.url("/results/students"), headers=env.s[0]).json()
    assert len(own) == 1 and own[0]["case_average"] == 100 and own[0]["bullwhip_score"] is None
    play_all_bullwhip(env, only=range(19))
    assert env.overview()["status"] == "RUNNING"
    r = play_bullwhip(env, 19)
    assert r["score"] == 100 and r["cost"] == r["bench_cost"]
    assert env.overview()["status"] == "FINISHED"  # o'zi yakunlandi
    studs = c.get(env.url("/results/students"), headers=env.t).json()
    assert len(studs) == 20 and all(abs(s["individual_score"] - (100 * 0.4 + s["decision_average"] * 0.4 + 100 * 0.2)) < 0.01 for s in studs)
    assert [s["rank"] for s in studs] == list(range(1, 21))
    allr = c.get(env.url("/results/students"), headers=env.s[0]).json()
    assert len(allr) == 20 and all("student_id" not in r for r in allr)
    teams = c.get(env.url("/results/teams"), headers=env.s[3]).json()
    assert len(teams) == 4 and [t["rank"] for t in teams] == [1, 2, 3, 4] and all(t["rounds_played"] == 3 for t in teams)
    me = env.me(5)
    assert me["winner"]["team"] == teams[0]["name"] and me["winner"]["team_score"] == teams[0]["team_score"]
    assert 0 < me["winner"]["service_level_pct"] <= 100 and 0 < me["winner"]["otif_pct"] <= 100
    t0 = env.tasks()[0]
    assert c.post(env.url(f"/tasks/{t0['id']}/review"), headers=env.t, json={"action": "approve", "score": 10}).status_code == 409
    assert c.post(env.url("/decisions/accept-auto"), headers=env.t, json={}).status_code == 409
    assert c.post(env.url("/finalize"), headers=env.t).status_code == 409
    assert c.post(env.url("/bullwhip"), headers=env.s[0], json={"orders": [4] * 12}).status_code == 409
    assert c.post(env.url("/decision"), headers=env.s[0], json={"payload": {"order_qty": 1}}).status_code == 409


def test_force_finalize_gives_zero_to_missing_parts(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    env.assign(); env.start()
    assert c.post(env.url("/finalize"), headers=env.t, json={"force": True}).status_code == 409  # raundlar tugamagan
    submit_all_tasks(env, only=range(14))
    play_all_bullwhip(env, only=range(13))
    play_rounds(env)
    assert env.overview()["status"] == "RUNNING"
    fin = c.get(env.url("/finalization"), headers=env.t).json()
    assert fin["ready"] is False and fin["can_force"] is True
    done = c.post(env.url("/finalize"), headers=env.t, json={"force": True}).json()
    assert done["status"] == "FINISHED" and done["final"]["forced"] is True
    studs = done["final"]["students"]
    assert len(studs) == 15 and all(s["individual_score"] is not None for s in studs)
    assert sum(1 for s in studs if s["bullwhip_score"] == 0) == 2 and sum(1 for s in studs if s["case_average"] == 0) == 1
    assert done["final"]["winner"]["team"]


def test_team_result_and_individual_result_are_separate(tmp_path):
    """Jamoaning yuqori natijasi har bir talabaga avtomatik yuqori individual baho bermaydi."""
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    env.assign(); env.start()
    submit_all_tasks(env, perfect=False)  # case 0 ball
    play_rounds(env)
    play_all_bullwhip(env)
    assert env.overview()["status"] == "FINISHED"
    teams = c.get(env.url("/results/teams"), headers=env.t).json()
    studs = c.get(env.url("/results/students"), headers=env.t).json()
    assert max(t["team_score"] for t in teams) > 85  # jamoa KPI yaxshi
    assert all(s["case_average"] == 0 for s in studs)
    assert all(abs(s["individual_score"] - (s["decision_average"] * 0.4 + 100 * 0.2)) < 0.01 for s in studs)
    assert all(s["individual_score"] <= 60.01 < max(t["team_score"] for t in teams) for s in studs)  # case 0 bo'lgani uchun individual yuqori emas


def test_round_resolves_only_when_everyone_submitted(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    env.assign(); env.start()
    for i in range(14):
        r = env.decide(i, GOOD[L.DECISION_FIELDS[env.me(i)["role"]]])
        assert r.status_code == 200 and r.json()["round_resolved"] is False
    assert env.overview()["current_round"] == 1
    r = env.decide(14, GOOD[L.DECISION_FIELDS[env.me(14)["role"]]])
    assert r.json()["round_resolved"] is True and env.overview()["current_round"] == 2
    decs = c.get(env.url("/decisions?round=1"), headers=env.t).json()
    assert len(decs) == 15 and all(d["submitted"] and d["score"] == d["auto_score"] for d in decs)
    assert c.post(env.url("/rounds/resolve"), headers=env.t).json()["resolved_round"] == 2  # o'qituvchi majburan yakunlashi mumkin
    d2 = c.get(env.url("/decisions?round=2"), headers=env.t).json()
    assert all(d["score"] == 0 and not d["submitted"] for d in d2)


def test_bullwhip_submission_rules(tmp_path):
    c = make_client(tmp_path)
    env = Env(c, 15, rounds=3)
    assert c.post(env.url("/bullwhip"), headers=env.s[0], json={"orders": [4] * 12}).status_code == 409  # boshlanmagan
    env.assign(); env.start()
    bw = env.me(0)["bullwhip"]
    assert bw["rounds"] == 12 and 0 <= bw["role_index"] <= 3 and bw["done"] is False and bw["seed"].startswith("bw-")
    assert len({env.me(i)["bullwhip"]["seed"] for i in range(15)}) == 15  # har bir talabaga alohida ssenariy
    post = lambda i, orders: c.post(env.url("/bullwhip"), headers=env.s[i], json={"orders": orders})
    assert post(0, [4] * 11).status_code == 422 and post(0, [4] * 13).status_code == 422
    assert post(0, [-1] + [4] * 11).status_code == 422 and post(0, [1.5] + [4] * 11).status_code == 422
    assert post(0, ["x"] + [4] * 11).status_code == 422 and post(0, [True] + [4] * 11).status_code == 422
    assert post(0, [5000] + [4] * 11).status_code == 422
    assert c.post(env.url("/bullwhip"), headers=env.t, json={"orders": [4] * 12}).status_code == 403
    zero = post(0, [0] * 12).json()
    assert zero["cost"] > zero["bench_cost"] and 0 < zero["score"] < 100
    assert abs(zero["score"] - 100 * zero["bench_cost"] / zero["cost"]) < 0.01
    assert post(0, [4] * 12).status_code == 409  # bir marta
    mine = env.me(0)["bullwhip"]
    assert mine["done"] is True and mine["result"]["score"] == zero["score"]
    assert env.me(1)["bullwhip"]["done"] is False and env.me(1)["my_result"]["bullwhip_score"] is None


def test_bullwhip_python_matches_javascript_engine():
    """src/bullwhip.js bilan node orqali solishtirilgan qiymatlar."""
    r = L.bullwhip_grade("bw-abc123def456", 12, 0, [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12])
    assert r["cost"] == 49 and r["bench_cost"] == 40.5
    r = L.bullwhip_grade("bw-zzz", 12, 1, L.bullwhip_policy_orders("bw-zzz", 12, 1))
    assert r["score"] == 100 and r["cost"] == r["bench_cost"]


def test_individual_score_formula_unit():
    assert L.individual_score(None, None, None) is None
    assert L.individual_score(80, 60, 100) == 80 * 0.4 + 60 * 0.4 + 100 * 0.2
    assert L.individual_score(100, 100, 100) == 100
    assert L.individual_score(80, None, None) == 32  # yo'q komponent 0 hisoblanadi
    assert L.individual_score(None, 60, None) == 24
    assert L.individual_score(None, None, 50) == 10
    assert L.individual_score(0, 0, 0) == 0


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
