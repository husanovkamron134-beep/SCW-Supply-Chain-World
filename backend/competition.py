"""SCW Phase 14 — musobaqa, jamoalar, case topshiriqlar, baholash va yakuniy natijalar (FastAPI router).

main.py'ga `install(...)` orqali ulanadi. Jadvallar alohida metadata'da (mavjud jadvallarga tegmaydi).
Sof mantiq: competition_logic.py.
"""
from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

try:
    import competition_logic as L
except ImportError:  # paket sifatida ishga tushirilganda
    from . import competition_logic as L

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class CompBase(DeclarativeBase):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _id() -> str:
    return str(uuid4())


class Account(CompBase):
    __tablename__ = "comp_accounts"
    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(10))  # teacher | student
    full_name: Mapped[str] = mapped_column(String(100))


class Competition(CompBase):
    __tablename__ = "comp_competitions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    teacher_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(10), default="SETUP")  # SETUP | RUNNING | FINISHED
    rounds_total: Mapped[int] = mapped_column(Integer, default=6)
    current_round: Mapped[int] = mapped_column(Integer, default=0)
    seed: Mapped[str] = mapped_column(String(40))
    plan: Mapped[Any] = mapped_column(JSON, default=list)
    final: Mapped[Any] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Team(CompBase):
    __tablename__ = "comp_teams"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(60))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Enrollment(CompBase):
    __tablename__ = "comp_enrollments"
    __table_args__ = (UniqueConstraint("competition_id", "student_id", name="uq_comp_student"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str] = mapped_column(String(36), index=True)
    team_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CaseTask(CompBase):
    __tablename__ = "comp_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    enrollment_id: Mapped[str] = mapped_column(String(36), unique=True)
    student_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[Any] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(12), default="ASSIGNED")  # ASSIGNED|SUBMITTED|RETURNED|APPROVED
    answer: Mapped[str] = mapped_column(Text, default="")
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    criteria: Mapped[Any] = mapped_column(JSON, nullable=True)
    feedback: Mapped[str] = mapped_column(Text, default="")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Decision(CompBase):
    __tablename__ = "comp_decisions"
    __table_args__ = (UniqueConstraint("enrollment_id", "round", name="uq_comp_decision"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    enrollment_id: Mapped[str] = mapped_column(String(36), index=True)
    team_id: Mapped[str] = mapped_column(String(36))
    role: Mapped[str] = mapped_column(String(20))
    round: Mapped[int] = mapped_column(Integer)
    payload: Mapped[Any] = mapped_column(JSON, nullable=True)
    submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    applied: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    feedback: Mapped[str] = mapped_column(Text, default="")


class TeamState(CompBase):
    __tablename__ = "comp_team_states"
    team_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    state: Mapped[Any] = mapped_column(JSON)
    last_applied: Mapped[Any] = mapped_column(JSON, nullable=True)


class RoundResult(CompBase):
    __tablename__ = "comp_round_results"
    __table_args__ = (UniqueConstraint("team_id", "round", name="uq_comp_round"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    team_id: Mapped[str] = mapped_column(String(36))
    round: Mapped[int] = mapped_column(Integer)
    applied: Mapped[Any] = mapped_column(JSON)
    kpi: Mapped[Any] = mapped_column(JSON)


class BullwhipResult(CompBase):
    __tablename__ = "comp_bullwhip"
    enrollment_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    competition_id: Mapped[str] = mapped_column(String(36), index=True)
    orders: Mapped[Any] = mapped_column(JSON)
    cost: Mapped[float] = mapped_column(Float)
    bench_cost: Mapped[float] = mapped_column(Float)
    score: Mapped[float] = mapped_column(Float)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------- kirish ma'lumotlari
class CompRegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["teacher", "student"]
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    invite_code: str = Field(default="", max_length=100)


class CompetitionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=2, max_length=120)
    rounds_total: int = Field(default=6, ge=L.MIN_ROUNDS, le=L.MAX_ROUNDS)
    seed: str = Field(default="", max_length=40)


class JoinIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=4, max_length=10)


class AutoAssignIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    team_count: int | None = Field(default=None, ge=1, le=10)


class EnrollmentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    team_id: str | None = None
    role: str | None = None
    set_team: bool = False
    set_role: bool = False


class AnswerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(default="", max_length=20000)  # eski (matnli) topshiriqlar uchun
    answers: dict[str, Any] | None = None  # avtomatik tekshiriladigan maydonlar


class BullwhipIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    orders: list[Any]


class FinalizeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    force: bool = False  # topshirmaganlar 0 ball bilan yakunlash


class ReviewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["approve", "return"]
    score: float | None = Field(default=None, ge=0, le=100)
    feedback: str = Field(default="", max_length=4000)
    criteria: dict[str, float] | None = None


class DecisionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payload: dict[str, Any]


class DecisionGradeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    score: float = Field(ge=0, le=100)
    feedback: str = Field(default="", max_length=2000)


class AcceptAutoIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    round: int | None = Field(default=None, ge=1)


def install(app, db_session, current_user, token_for, hasher, user_model, engine) -> None:
    CompBase.metadata.create_all(engine)

    # ------------------------------------------------------------ yordamchilar
    def account_of(user, db: Session) -> Account | None:
        return db.get(Account, user.id)

    def require_kind(user, db: Session, kind: str) -> Account:
        acc = account_of(user, db)
        if not acc or acc.kind != kind:
            raise HTTPException(403, "Bu amal faqat " + ("o'qituvchi" if kind == "teacher" else "talaba") + " uchun.")
        return acc

    def teacher_comp(cid: str, user, db: Session) -> Competition:
        require_kind(user, db, "teacher")
        comp = db.get(Competition, cid)
        if not comp or comp.teacher_id != user.id:
            raise HTTPException(404, "Musobaqa topilmadi.")
        return comp

    def student_enrollment(cid: str, user, db: Session) -> tuple[Competition, Enrollment]:
        require_kind(user, db, "student")
        comp = db.get(Competition, cid)
        enr = db.scalar(select(Enrollment).where(Enrollment.competition_id == cid, Enrollment.student_id == user.id))
        if not comp or not enr:
            raise HTTPException(404, "Musobaqa topilmadi yoki siz unga qo'shilmagansiz.")
        return comp, enr

    def not_finished(comp: Competition) -> None:
        if comp.status == "FINISHED":
            raise HTTPException(409, "Musobaqa yakunlangan; o'zgartirish mumkin emas.")

    def enrollments_of(db: Session, cid: str) -> list[Enrollment]:
        return list(db.scalars(select(Enrollment).where(Enrollment.competition_id == cid).order_by(Enrollment.joined_at, Enrollment.id)))

    def names_of(db: Session, ids: list[str]) -> dict[str, dict[str, str]]:
        if not ids:
            return {}
        rows = db.execute(select(Account.user_id, Account.full_name, user_model.email).join(user_model, user_model.id == Account.user_id).where(Account.user_id.in_(ids))).all()
        return {r[0]: {"name": r[1], "email": r[2]} for r in rows}

    def teams_of(db: Session, cid: str) -> list[Team]:
        return list(db.scalars(select(Team).where(Team.competition_id == cid).order_by(Team.position)))

    def comp_dict(c: Competition) -> dict[str, Any]:
        return {"id": c.id, "title": c.title, "code": c.code, "status": c.status, "rounds_total": c.rounds_total,
                "current_round": c.current_round, "created_at": c.created_at}

    def problems_of(db: Session, comp: Competition) -> list[str]:
        enrs, teams = enrollments_of(db, comp.id), teams_of(db, comp.id)
        label = {t.id: t.name for t in teams}
        nm = names_of(db, [e.student_id for e in enrs])
        rows = [{"student": nm[e.student_id]["name"], "team": e.team_id, "role": e.role} for e in enrs]
        if len(enrs) < L.MIN_TEAMS * L.MIN_TEAM_SIZE:
            return [f"Kamida {L.MIN_TEAMS * L.MIN_TEAM_SIZE} talaba kerak (hozir {len(enrs)})."]
        out = L.validate_assignment(rows, [t.id for t in teams])
        for i, msg in enumerate(out):  # jamoa id'sini nomga almashtirish
            for tid, tn in label.items():
                out[i] = out[i].replace(tid, tn)
        return out

    def enrollment_dict(e: Enrollment, nm: dict[str, dict[str, str]]) -> dict[str, Any]:
        return {"id": e.id, "student_id": e.student_id, "name": nm.get(e.student_id, {}).get("name", "?"),
                "email": nm.get(e.student_id, {}).get("email", ""), "team_id": e.team_id, "role": e.role,
                "role_name": L.ROLE_NAMES.get(e.role or "", None)}

    def task_public(t: CaseTask) -> dict[str, Any]:
        content = {k: v for k, v in t.content.items() if k != "reference"}
        return {"id": t.id, "role": t.role, "status": t.status, "content": content, "answer": t.answer,
                "score": t.score if t.status == "APPROVED" else None, "feedback": t.feedback,
                "criteria": t.criteria if t.status == "APPROVED" else None}

    def task_teacher(t: CaseTask, nm: dict[str, dict[str, str]]) -> dict[str, Any]:
        return {"id": t.id, "student_id": t.student_id, "student": nm.get(t.student_id, {}).get("name", "?"), "role": t.role,
                "status": t.status, "content": t.content, "answer": t.answer, "score": t.score, "criteria": t.criteria,
                "feedback": t.feedback, "submitted_at": t.submitted_at}

    def results_students(db: Session, comp: Competition, fill: bool = False) -> list[dict[str, Any]]:
        enrs = enrollments_of(db, comp.id)
        bws = {b.enrollment_id: b for b in db.scalars(select(BullwhipResult).where(BullwhipResult.competition_id == comp.id))}
        nm = names_of(db, [e.student_id for e in enrs])
        teams = {t.id: t.name for t in teams_of(db, comp.id)}
        tasks = {t.enrollment_id: t for t in db.scalars(select(CaseTask).where(CaseTask.competition_id == comp.id))}
        decs: dict[str, list[Decision]] = {}
        for d in db.scalars(select(Decision).where(Decision.competition_id == comp.id)):
            decs.setdefault(d.enrollment_id, []).append(d)
        rows = []
        for e in enrs:
            t = tasks.get(e.id)
            case_vals = [t.score] if t and t.status == "APPROVED" and t.score is not None else []
            dec_vals = [d.score for d in decs.get(e.id, []) if d.score is not None]
            case_avg, dec_avg = L.average(case_vals), L.average(dec_vals)
            bw = bws.get(e.id)
            bw_score = bw.score if bw else None
            if fill:  # majburan yakunlash: topshirilmagan komponent 0 ball
                case_avg = 0.0 if case_avg is None else case_avg
                dec_avg = 0.0 if dec_avg is None else dec_avg
                bw_score = 0.0 if bw_score is None else bw_score
            rows.append({"enrollment_id": e.id, "student_id": e.student_id, "name": nm.get(e.student_id, {}).get("name", "?"),
                         "team": teams.get(e.team_id or "", None), "role": L.ROLE_NAMES.get(e.role or "", None),
                         "case_average": None if case_avg is None else round(case_avg, 2),
                         "decision_average": None if dec_avg is None else round(dec_avg, 2),
                         "bullwhip_score": None if bw_score is None else round(bw_score, 2),
                         "individual_score": L.individual_score(case_avg, dec_avg, bw_score),
                         "complete": case_avg is not None and dec_avg is not None and bw_score is not None})
        rows.sort(key=lambda r: (r["individual_score"] is None, -(r["individual_score"] or 0), r["name"]))
        rank = 0
        for r in rows:
            if r["individual_score"] is not None:
                rank += 1
                r["rank"] = rank
            else:
                r["rank"] = None
        return rows

    def results_teams(db: Session, comp: Competition) -> list[dict[str, Any]]:
        rows = []
        for t in teams_of(db, comp.id):
            rr = list(db.scalars(select(RoundResult).where(RoundResult.team_id == t.id).order_by(RoundResult.round)))
            ks = [r.kpi for r in rr]

            def avg(key: str) -> float | None:
                return round(sum(k[key] for k in ks) / len(ks), 2) if ks else None
            rows.append({"team_id": t.id, "name": t.name, "rounds_played": len(ks), "team_score": avg("round_score"),
                         "avg_service_level_pct": avg("service_level_pct"), "avg_otif_pct": avg("otif_pct"),
                         "avg_customer_satisfaction": avg("customer_satisfaction"),
                         "total_cost": round(sum(k["total_cost"] for k in ks), 2), "total_profit": round(sum(k["profit"] for k in ks), 2),
                         "rounds": [{"round": r.round, "applied": r.applied, "kpi": r.kpi} for r in rr]})
        rows.sort(key=lambda r: (r["team_score"] is None, -(r["team_score"] or 0), r["name"]))
        for i, r in enumerate(rows, 1):
            r["rank"] = i if r["team_score"] is not None else None
        return rows

    def finalization_blockers(db: Session, comp: Competition, force: bool = False) -> list[str]:
        out: list[str] = []
        if comp.status != "RUNNING":
            return ["Musobaqa boshlanmagan yoki allaqachon yakunlangan."]
        if force:  # faqat raundlar tugashi shart; topshirilmaganlar 0 ball bilan hisoblanadi
            return [f"Barcha raundlar yakunlanmagan: {comp.current_round - 1} / {comp.rounds_total}."] if comp.current_round <= comp.rounds_total else []
        enrs = enrollments_of(db, comp.id)
        nm = names_of(db, [e.student_id for e in enrs])
        who = lambda ids: ", ".join(nm.get(i, {}).get("name", "?") for i in ids[:5]) + (" ..." if len(ids) > 5 else "")
        tasks = {t.enrollment_id: t for t in db.scalars(select(CaseTask).where(CaseTask.competition_id == comp.id))}
        no_task = [e.student_id for e in enrs if e.id not in tasks]
        if no_task:
            out.append(f"Case topshirig'i tayinlanmagan talabalar: {who(no_task)}.")
        pending = [t.student_id for t in tasks.values() if not (t.status == "APPROVED" and t.score is not None)]
        if pending:
            out.append(f"Baholanib tasdiqlanmagan case topshiriqlar: {len(pending)} ta ({who(pending)}).")
        for team in teams_of(db, comp.id):
            for role in L.ROLES:
                done = [t for e in enrs if e.team_id == team.id and e.role == role for t in [tasks.get(e.id)] if t and t.status == "APPROVED"]
                if not done:
                    out.append(f"{team.name}: {L.ROLE_NAMES[role]} topshirig'i bajarilmagan.")
        if comp.current_round <= comp.rounds_total:
            out.append(f"Barcha raundlar yakunlanmagan: {comp.current_round - 1} / {comp.rounds_total}.")
        ungraded = [d for d in db.scalars(select(Decision).where(Decision.competition_id == comp.id)) if d.score is None]
        if ungraded:
            out.append(f"Baholanmagan operatsion qarorlar: {len(ungraded)} ta.")
        no_bw = {b.enrollment_id for b in db.scalars(select(BullwhipResult).where(BullwhipResult.competition_id == comp.id))}
        missing_bw = [e.student_id for e in enrs if e.id not in no_bw]
        if missing_bw:
            out.append(f"Bullwhip o'yinini tugatmagan talabalar: {len(missing_bw)} ta ({who(missing_bw)}).")
        incomplete = [r["student_id"] for r in results_students(db, comp) if not r["complete"]]
        if incomplete and not missing_bw and not pending and not no_task:
            out.append(f"Individual baho hisoblash uchun ma'lumot yetarli emas: {who(incomplete)}.")
        return out

    def finalize_now(db: Session, comp: Competition, force: bool = False) -> None:
        teams, studs = results_teams(db, comp), results_students(db, comp, fill=force)
        top = next((t for t in teams if t["rank"] == 1), None)
        top_s = next((x for x in studs if x["rank"] == 1), None)
        winner = top and {"team": top["name"], "team_score": top["team_score"], "service_level_pct": top["avg_service_level_pct"],
                          "otif_pct": top["avg_otif_pct"], "customer_satisfaction": top["avg_customer_satisfaction"]}
        comp.final = {"teams": [{k: v for k, v in t.items() if k != "rounds"} for t in teams], "students": studs,
                      "winner": winner, "top_student": top_s and {"name": top_s["name"], "individual_score": top_s["individual_score"]},
                      "forced": force, "finalized_at": _now().isoformat()}
        comp.status = "FINISHED"

    def try_autofinalize(db: Session, comp: Competition) -> bool:
        """Raundlar tugagan va barcha topshiriqlar bajarilgan bo'lsa, musobaqa o'zi yakunlanadi."""
        if comp.status == "RUNNING" and comp.current_round > comp.rounds_total and not finalization_blockers(db, comp):
            finalize_now(db, comp)
            return True
        return False

    def bullwhip_view(db: Session, comp: Competition, enr: Enrollment) -> dict[str, Any] | None:
        if comp.status == "SETUP":
            return None
        sc = L.bullwhip_scenario(comp.seed, enr.student_id)
        res = db.get(BullwhipResult, enr.id)
        return {**sc, "done": res is not None,
                "result": res and {"cost": res.cost, "bench_cost": res.bench_cost, "score": res.score}}

    def do_resolve(db: Session, comp: Competition) -> dict[str, Any]:
        cid, r = comp.id, comp.current_round
        plan = comp.plan[r - 1]
        enrs = enrollments_of(db, cid)
        existing = {d.enrollment_id: d for d in db.scalars(select(Decision).where(Decision.competition_id == cid, Decision.round == r))}
        out = []
        for team in teams_of(db, cid):
            ts = db.get(TeamState, team.id)
            members = [e for e in enrs if e.team_id == team.id]
            applied = L.default_decisions(plan["forecast"], ts.last_applied)
            chosen: dict[str, Decision] = {}
            for role in L.ROLES:
                for e in members:
                    d = existing.get(e.id)
                    if e.role == role and d and d.submitted:
                        chosen[role] = d
                        applied[L.DECISION_FIELDS[role]] = d.payload[L.DECISION_FIELDS[role]]
                        break
            before = dict(ts.state)
            new_state, kpi = L.simulate_round(before, applied, plan)
            for e in members:
                d = existing.get(e.id)
                if not d:
                    d = Decision(competition_id=cid, enrollment_id=e.id, team_id=team.id, role=e.role, round=r)
                    db.add(d)
                d.resolved = True
                d.applied = chosen.get(e.role) is d if d.submitted else False
                d.auto_score = L.auto_score(e.role, d.payload, before, applied, plan["forecast"]) if d.submitted else 0.0
                d.score = d.auto_score  # avtomatik ball; o'qituvchi xohlasa o'zgartiradi
            ts.state, ts.last_applied = new_state, applied
            db.add(RoundResult(competition_id=cid, team_id=team.id, round=r, applied=applied, kpi=kpi))
            out.append({"team": team.name, "kpi": kpi})
        comp.current_round = r + 1
        db.flush()
        try_autofinalize(db, comp)
        return {"resolved_round": r, "next_round": comp.current_round if comp.current_round <= comp.rounds_total else None,
                "teams": out, "finished": comp.status == "FINISHED"}

    # ------------------------------------------------------------ ro'yxatdan o'tish
    @app.post("/api/comp/register", status_code=201)
    def comp_register(body: CompRegisterIn, db: Session = Depends(db_session)):
        invite = os.getenv("SCW_TEACHER_INVITE_CODE", "")
        if body.kind == "teacher" and invite and not secrets.compare_digest(body.invite_code, invite):
            raise HTTPException(403, "O'qituvchi taklif kodi noto'g'ri.")
        email = body.email.strip().lower()
        if db.scalar(select(user_model).where(user_model.email == email)):
            raise HTTPException(409, "Bu email avval ro'yxatdan o'tgan.")
        user = user_model(email=email, password_hash=hasher.hash(body.password))
        db.add(user)
        db.flush()
        db.add(Account(user_id=user.id, kind=body.kind, full_name=body.full_name.strip()))
        db.commit()
        return {**token_for(user), "user": {"id": user.id, "email": user.email},
                "account": {"kind": body.kind, "full_name": body.full_name.strip()}}

    @app.get("/api/comp/me")
    def comp_me(user=Depends(current_user), db: Session = Depends(db_session)):
        acc = account_of(user, db)
        if not acc:
            raise HTTPException(404, "Musobaqa hisobi topilmadi. /api/comp/register orqali ro'yxatdan o'ting.")
        return {"id": user.id, "email": user.email, "kind": acc.kind, "full_name": acc.full_name}

    # ------------------------------------------------------------ o'qituvchi: musobaqa va taqsimot
    @app.post("/api/comp/competitions", status_code=201)
    def create_competition(body: CompetitionIn, user=Depends(current_user), db: Session = Depends(db_session)):
        require_kind(user, db, "teacher")
        for _ in range(20):
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
            if not db.scalar(select(Competition.id).where(Competition.code == code)):
                break
        else:
            raise HTTPException(500, "Sinf kodini yaratib bo'lmadi.")
        comp = Competition(teacher_id=user.id, title=body.title.strip(), code=code, rounds_total=body.rounds_total,
                           seed=(body.seed.strip() or secrets.token_hex(4)))
        db.add(comp)
        db.commit()
        return comp_dict(comp)

    @app.get("/api/comp/competitions")
    def list_competitions(user=Depends(current_user), db: Session = Depends(db_session)):
        acc = account_of(user, db)
        if not acc:
            raise HTTPException(403, "Avval /api/comp/register orqali ro'yxatdan o'ting.")
        if acc.kind == "teacher":
            rows = db.scalars(select(Competition).where(Competition.teacher_id == user.id).order_by(Competition.created_at.desc()))
        else:
            rows = db.scalars(select(Competition).join(Enrollment, Enrollment.competition_id == Competition.id).where(
                Enrollment.student_id == user.id).order_by(Competition.created_at.desc()))
        return [comp_dict(c) for c in rows]

    @app.get("/api/comp/competitions/{cid}")
    def competition_overview(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        enrs = enrollments_of(db, cid)
        nm = names_of(db, [e.student_id for e in enrs])
        teams = teams_of(db, cid)
        return {**comp_dict(comp), "teams": [{"id": t.id, "name": t.name, "size": sum(1 for e in enrs if e.team_id == t.id)} for t in teams],
                "enrollments": [enrollment_dict(e, nm) for e in enrs],
                "problems": problems_of(db, comp) if comp.status == "SETUP" else [],
                "suggested_team_count": L.team_count_for(len(enrs)) if len(enrs) >= L.MIN_TEAMS * L.MIN_TEAM_SIZE else None}

    @app.post("/api/comp/competitions/{cid}/auto-assign")
    def auto_assign(cid: str, body: AutoAssignIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        if comp.status != "SETUP":
            raise HTTPException(409, "Taqsimotni faqat musobaqa boshlanishidan oldin o'zgartirish mumkin.")
        enrs = enrollments_of(db, cid)
        try:
            plan = L.assign_teams([e.id for e in enrs], body.team_count, comp.seed)
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        for t in teams_of(db, cid):
            db.delete(t)
        k = max(r["team"] for r in plan) + 1
        teams = [Team(competition_id=cid, name=f"Jamoa {i + 1}", position=i) for i in range(k)]
        db.add_all(teams)
        db.flush()
        by_id = {e.id: e for e in enrs}
        for r in plan:
            e = by_id[r["student"]]
            e.team_id, e.role = teams[r["team"]].id, r["role"]
        db.commit()
        return {"teams": k, "problems": problems_of(db, comp)}

    @app.patch("/api/comp/competitions/{cid}/enrollments/{eid}")
    def patch_enrollment(cid: str, eid: str, body: EnrollmentPatch, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        if comp.status != "SETUP":
            raise HTTPException(409, "Tayinlovlarni faqat musobaqa boshlanishidan oldin o'zgartirish mumkin.")
        e = db.get(Enrollment, eid)
        if not e or e.competition_id != cid:
            raise HTTPException(404, "Talaba topilmadi.")
        if body.set_team:
            if body.team_id is not None:
                t = db.get(Team, body.team_id)
                if not t or t.competition_id != cid:
                    raise HTTPException(422, "Jamoa topilmadi.")
            e.team_id = body.team_id
        if body.set_role:
            if body.role is not None and body.role not in L.ROLES:
                raise HTTPException(422, "Noma'lum rol.")
            e.role = body.role
        db.commit()
        return {"ok": True, "problems": problems_of(db, comp)}

    @app.post("/api/comp/competitions/{cid}/start")
    def start_competition(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        if comp.status != "SETUP":
            raise HTTPException(409, "Musobaqa allaqachon boshlangan.")
        problems = problems_of(db, comp)
        if problems:
            raise HTTPException(409, {"message": "Musobaqani boshlash mumkin emas.", "problems": problems})
        enrs = enrollments_of(db, cid)
        comp.plan = L.make_demand(comp.seed, comp.rounds_total)
        for e in enrs:
            db.add(CaseTask(competition_id=cid, enrollment_id=e.id, student_id=e.student_id, role=e.role,
                            content=L.make_case(e.role, f"{comp.seed}:{e.student_id}")))
        for t in teams_of(db, cid):
            db.add(TeamState(team_id=t.id, competition_id=cid, state=dict(L.START_STATE), last_applied=None))
        comp.status, comp.current_round = "RUNNING", 1
        db.commit()
        return comp_dict(comp)

    # ------------------------------------------------------------ o'qituvchi: topshiriqlar
    @app.get("/api/comp/competitions/{cid}/tasks")
    def list_tasks(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        teacher_comp(cid, user, db)
        tasks = list(db.scalars(select(CaseTask).where(CaseTask.competition_id == cid)))
        nm = names_of(db, [t.student_id for t in tasks])
        return [task_teacher(t, nm) for t in tasks]

    @app.post("/api/comp/competitions/{cid}/tasks/{tid}/review")
    def review_task(cid: str, tid: str, body: ReviewIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        not_finished(comp)
        t = db.get(CaseTask, tid)
        if not t or t.competition_id != cid:
            raise HTTPException(404, "Topshiriq topilmadi.")
        if t.status not in {"SUBMITTED", "APPROVED"}:
            raise HTTPException(409, "Faqat talaba topshirgan javobni baholash mumkin.")
        if body.action == "approve":
            score, criteria = body.score, None
            if body.criteria is not None:
                maxes = {c["criterion"]: c["max"] for c in t.content["rubric"]}
                for name, pts in body.criteria.items():
                    if name not in maxes or not 0 <= pts <= maxes[name]:
                        raise HTTPException(422, f"'{name}' mezoni yoki balli noto'g'ri (0–{maxes.get(name, '?')}).")
                criteria = body.criteria
                total = round(sum(criteria.values()), 2)
                if score is not None and abs(score - total) > 0.01:
                    raise HTTPException(422, f"Umumiy ball ({score}) mezonlar yig'indisiga ({total}) teng emas.")
                score = total
            if score is None:
                raise HTTPException(422, "Tasdiqlash uchun 0–100 oralig'ida raqamli ball shart.")
            t.status, t.score, t.criteria, t.feedback = "APPROVED", float(score), criteria, body.feedback
        else:
            if not body.feedback.strip():
                raise HTTPException(422, "Qayta ishlash uchun qaytarishda izoh (feedback) shart.")
            t.status, t.score, t.criteria, t.feedback = "RETURNED", None, None, body.feedback
        t.reviewed_at = _now()
        db.commit()
        return task_teacher(t, names_of(db, [t.student_id]))

    # ------------------------------------------------------------ talaba: qo'shilish va ishlash
    @app.post("/api/comp/join")
    def join(body: JoinIn, user=Depends(current_user), db: Session = Depends(db_session)):
        require_kind(user, db, "student")
        comp = db.scalar(select(Competition).where(Competition.code == body.code.strip().upper()))
        if not comp:
            raise HTTPException(404, "Sinf kodi noto'g'ri.")
        exist = db.scalar(select(Enrollment).where(Enrollment.competition_id == comp.id, Enrollment.student_id == user.id))
        if exist:
            return {"competition": comp_dict(comp), "joined": False}
        if comp.status != "SETUP":
            raise HTTPException(409, "Musobaqa boshlangan; yangi talaba qo'shilmaydi.")
        db.add(Enrollment(competition_id=comp.id, student_id=user.id))
        db.commit()
        return {"competition": comp_dict(comp), "joined": True}

    @app.get("/api/comp/competitions/{cid}/me")
    def my_view(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        comp, enr = student_enrollment(cid, user, db)
        team = db.get(Team, enr.team_id) if enr.team_id else None
        mates, state, history = [], None, []
        if team:
            members = [e for e in enrollments_of(db, cid) if e.team_id == team.id]
            nm = names_of(db, [e.student_id for e in members])
            mates = [{"name": nm[e.student_id]["name"], "role": L.ROLE_NAMES.get(e.role or "", None)} for e in members]
            ts = db.get(TeamState, team.id)
            state = ts.state if ts else None
            history = [{"round": r.round, "applied": r.applied, "kpi": r.kpi} for r in db.scalars(
                select(RoundResult).where(RoundResult.team_id == team.id).order_by(RoundResult.round))]
        task = db.scalar(select(CaseTask).where(CaseTask.enrollment_id == enr.id))
        decs = list(db.scalars(select(Decision).where(Decision.enrollment_id == enr.id).order_by(Decision.round)))
        current = None
        if comp.status == "RUNNING" and comp.current_round <= comp.rounds_total and enr.role:
            plan = comp.plan[comp.current_round - 1]
            mine = next((d for d in decs if d.round == comp.current_round), None)
            current = {"round": comp.current_round, "forecast": plan["forecast"], "decision_field": L.DECISION_FIELDS[enr.role],
                       "my_decision": mine.payload if mine and mine.submitted else None}
        mine_res = next((r for r in results_students(db, comp) if r["enrollment_id"] == enr.id), None)
        return {"competition": comp_dict(comp), "team": team.name if team else None, "role": enr.role,
                "role_name": L.ROLE_NAMES.get(enr.role or "", None), "teammates": mates, "team_state": state, "team_history": history,
                "task": task_public(task) if task else None, "current_round": current,
                "my_decisions": [{"round": d.round, "payload": d.payload, "submitted": d.submitted, "score": d.score,
                                  "feedback": d.feedback} for d in decs if d.resolved],
                "my_result": mine_res and {k: mine_res[k] for k in ("case_average", "decision_average", "bullwhip_score", "individual_score", "complete", "rank")},
                "options": {"suppliers": L.SUPPLIERS, "modes": L.MODES}, "bullwhip": bullwhip_view(db, comp, enr) if enr.role else None,
                "winner": (comp.final or {}).get("winner") if comp.status == "FINISHED" else None}

    @app.put("/api/comp/competitions/{cid}/task")
    def submit_task(cid: str, body: AnswerIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp, enr = student_enrollment(cid, user, db)
        not_finished(comp)
        task = db.scalar(select(CaseTask).where(CaseTask.enrollment_id == enr.id))
        if not task:
            raise HTTPException(404, "Sizga hali topshiriq tayinlanmagan (musobaqa boshlanmagan).")
        if task.status not in {"ASSIGNED", "RETURNED"}:
            raise HTTPException(409, "Javob allaqachon topshirilgan." if task.status == "APPROVED" else "Javob topshirilgan; o'qituvchi tekshirishini kuting.")
        if task.content.get("fields"):  # avtomatik tekshiriladigan topshiriq
            if body.answers is None:
                raise HTTPException(422, "Barcha maydonlarni to'ldiring.")
            try:
                clean = L.check_answers(task.content, body.answers)
            except ValueError as exc:
                raise HTTPException(422, str(exc))
            score, criteria, feedback = L.grade_case(task.content, clean, task.content["reference"]["answers"])
            task.answer = json.dumps(clean, ensure_ascii=False)
            task.status, task.score, task.criteria, task.feedback = "APPROVED", score, criteria, feedback
            task.submitted_at = task.reviewed_at = _now()
            try_autofinalize(db, comp)
        else:  # eski, matnli topshiriq: o'qituvchi qo'lda baholaydi
            if not body.answer.strip():
                raise HTTPException(422, "Javobni yozing.")
            task.answer, task.status, task.submitted_at = body.answer, "SUBMITTED", _now()
        db.commit()
        return task_public(task)

    @app.get("/api/comp/competitions/{cid}/bullwhip")
    def bullwhip_info(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        comp, enr = student_enrollment(cid, user, db)
        return bullwhip_view(db, comp, enr)

    @app.post("/api/comp/competitions/{cid}/bullwhip")
    def submit_bullwhip(cid: str, body: BullwhipIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp, enr = student_enrollment(cid, user, db)
        if comp.status != "RUNNING":
            raise HTTPException(409, "Bullwhip natijasini faqat musobaqa davomida yuborish mumkin.")
        if db.get(BullwhipResult, enr.id):
            raise HTTPException(409, "Bullwhip natijasi allaqachon yuborilgan.")
        sc = L.bullwhip_scenario(comp.seed, enr.student_id)
        try:
            res = L.bullwhip_grade(sc["seed"], sc["rounds"], sc["role_index"], body.orders)
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        db.add(BullwhipResult(enrollment_id=enr.id, competition_id=cid, orders=body.orders, cost=res["cost"], bench_cost=res["bench_cost"], score=res["score"]))
        db.flush()
        try_autofinalize(db, comp)
        db.commit()
        return res

    @app.post("/api/comp/competitions/{cid}/decision")
    def submit_decision(cid: str, body: DecisionIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp, enr = student_enrollment(cid, user, db)
        if comp.status != "RUNNING" or comp.current_round > comp.rounds_total:
            raise HTTPException(409, "Hozir qaror qabul qilinmaydi.")
        try:
            payload = L.validate_decision(enr.role, body.payload)
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        d = db.scalar(select(Decision).where(Decision.enrollment_id == enr.id, Decision.round == comp.current_round))
        if not d:
            d = Decision(competition_id=cid, enrollment_id=enr.id, team_id=enr.team_id, role=enr.role, round=comp.current_round)
            db.add(d)
        d.payload, d.submitted = payload, True
        db.flush()
        rnd = comp.current_round
        submitted = {x.enrollment_id for x in db.scalars(select(Decision).where(Decision.competition_id == cid, Decision.round == rnd, Decision.submitted.is_(True)))}
        auto = all(e.id in submitted for e in enrollments_of(db, cid))  # hamma yuborgan -> raund o'zi hisoblanadi
        if auto:
            do_resolve(db, comp)
        db.commit()
        return {"round": rnd, "payload": d.payload, "round_resolved": auto}

    # ------------------------------------------------------------ raundlar va qarorlar baholash
    @app.post("/api/comp/competitions/{cid}/rounds/resolve")
    def resolve_round(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        if comp.status != "RUNNING":
            raise HTTPException(409, "Musobaqa davom etmayapti.")
        if comp.current_round > comp.rounds_total:
            raise HTTPException(409, "Barcha raundlar yakunlangan.")
        res = do_resolve(db, comp)
        db.commit()
        return res

    @app.get("/api/comp/competitions/{cid}/decisions")
    def list_decisions(cid: str, round: int | None = None, user=Depends(current_user), db: Session = Depends(db_session)):
        teacher_comp(cid, user, db)
        q = select(Decision).where(Decision.competition_id == cid, Decision.resolved.is_(True))
        if round is not None:
            q = q.where(Decision.round == round)
        decs = list(db.scalars(q.order_by(Decision.round, Decision.team_id)))
        enr = {e.id: e for e in enrollments_of(db, cid)}
        nm = names_of(db, [e.student_id for e in enr.values()])
        teams = {t.id: t.name for t in teams_of(db, cid)}
        return [{"id": d.id, "round": d.round, "student": nm.get(enr[d.enrollment_id].student_id, {}).get("name", "?"),
                 "team": teams.get(d.team_id), "role": L.ROLE_NAMES.get(d.role), "payload": d.payload, "submitted": d.submitted,
                 "applied": d.applied, "auto_score": d.auto_score, "score": d.score, "feedback": d.feedback} for d in decs]

    @app.patch("/api/comp/competitions/{cid}/decisions/{did}")
    def grade_decision(cid: str, did: str, body: DecisionGradeIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        not_finished(comp)
        d = db.get(Decision, did)
        if not d or d.competition_id != cid or not d.resolved:
            raise HTTPException(404, "Qaror topilmadi yoki raund hali yakunlanmagan.")
        d.score, d.feedback = body.score, body.feedback
        db.commit()
        return {"id": d.id, "score": d.score}

    @app.post("/api/comp/competitions/{cid}/decisions/accept-auto")
    def accept_auto(cid: str, body: AcceptAutoIn, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        not_finished(comp)
        q = select(Decision).where(Decision.competition_id == cid, Decision.resolved.is_(True), Decision.score.is_(None))
        if body.round is not None:
            q = q.where(Decision.round == body.round)
        n = 0
        for d in db.scalars(q):
            if d.auto_score is not None:
                d.score = d.auto_score
                n += 1
        db.commit()
        return {"graded": n}

    # ------------------------------------------------------------ yakunlash va natijalar
    @app.get("/api/comp/competitions/{cid}/finalization")
    def finalization(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        blockers = finalization_blockers(db, comp)
        return {"ready": not blockers, "blockers": blockers, "can_force": not finalization_blockers(db, comp, True)}

    @app.post("/api/comp/competitions/{cid}/finalize")
    def finalize(cid: str, body: FinalizeIn | None = None, user=Depends(current_user), db: Session = Depends(db_session)):
        comp = teacher_comp(cid, user, db)
        force = bool(body and body.force)
        blockers = finalization_blockers(db, comp, force)
        if blockers:
            raise HTTPException(409, {"message": "Musobaqani yakunlash bloklandi.", "blockers": blockers})
        finalize_now(db, comp, force)
        db.commit()
        return {"status": comp.status, "final": comp.final}

    @app.get("/api/comp/competitions/{cid}/results/teams")
    def team_results_api(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        acc = account_of(user, db)
        if not acc:
            raise HTTPException(403, "Ruxsat yo'q.")
        comp = teacher_comp(cid, user, db) if acc.kind == "teacher" else student_enrollment(cid, user, db)[0]
        return results_teams(db, comp)

    @app.get("/api/comp/competitions/{cid}/results/students")
    def student_results_api(cid: str, user=Depends(current_user), db: Session = Depends(db_session)):
        acc = account_of(user, db)
        if not acc:
            raise HTTPException(403, "Ruxsat yo'q.")
        if acc.kind == "teacher":
            return results_students(db, teacher_comp(cid, user, db))
        comp, enr = student_enrollment(cid, user, db)
        rows = results_students(db, comp)
        if comp.status != "FINISHED":  # reyting yakunlangach ochiladi; oldin faqat o'zingiznikini ko'rasiz
            rows = [r for r in rows if r["enrollment_id"] == enr.id]
        return [{k: v for k, v in r.items() if k not in {"enrollment_id", "student_id"}} for r in rows]
