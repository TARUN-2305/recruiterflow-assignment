from decimal import Decimal
from fractions import Fraction

import pytest

from app.domain.matching import (
    experience_fraction,
    rank_candidates_for_job,
    rank_jobs_for_candidate,
    round_half_up,
    score_pair,
)
from app.domain.models import Availability, CandidateProfile, JobProfile


def candidate(
    id: int = 1,
    name: str = "Cand",
    skills: tuple[str, ...] = ("a", "b"),
    years: int = 5,
    availability: Availability = "Immediate",
    traits: tuple[str, ...] = (),
) -> CandidateProfile:
    return CandidateProfile(id, name, years, availability, skills, traits, quirk="")


def job(
    id: int = 1,
    title: str = "Job",
    skills: tuple[str, ...] = ("a", "b"),
    minimum: int = 3,
    keywords: tuple[str, ...] = ("k1", "k2"),
) -> JobProfile:
    return JobProfile(id, title, minimum, skills, keywords, tagline="")


class TestSkillOverlap:
    def test_full_overlap_earns_all_skill_points(self) -> None:
        r = score_pair(candidate(skills=("a", "b")), job(skills=("a", "b")))
        assert r.skill_fraction == 1
        assert r.matched_skills == ("a", "b") and r.missing_skills == ()

    def test_partial_overlap_is_proportional_to_the_jobs_list(self) -> None:
        r = score_pair(candidate(skills=("a", "x", "y")), job(skills=("a", "b", "c")))
        assert r.skill_fraction == Fraction(1, 3)
        assert r.missing_skills == ("b", "c")

    def test_extra_candidate_skills_do_not_reduce_the_score(self) -> None:
        lean = score_pair(candidate(skills=("a", "b")), job())
        broad = score_pair(candidate(skills=("a", "b", "x", "y", "z")), job())
        assert lean.score == broad.score

    def test_zero_overlap_scores_zero_even_with_great_experience(self) -> None:
        r = score_pair(candidate(skills=("woodworking",), years=50), job(skills=("a", "b")))
        assert r.score == 0
        assert r.reason == "No required skills matched (0/2)."

    def test_matching_ignores_case_and_surrounding_spaces(self) -> None:
        r = score_pair(candidate(skills=(" A ",)), job(skills=("a",)))
        assert r.matched_skills == ("a",)

    def test_no_synonyms_calm_is_not_calm_under_pressure(self) -> None:
        r = score_pair(candidate(traits=("calm",)), job(keywords=("calm-under-pressure",)))
        assert r.matched_keywords == ()


class TestExperience:
    @pytest.mark.parametrize(
        ("years", "minimum", "expected"),
        [
            (2, 4, Fraction(1, 2)),  # below minimum: linear partial credit
            (0, 4, Fraction(0)),
            (4, 4, Fraction(1)),  # exactly at minimum
            (20, 4, Fraction(1)),  # above minimum: no bonus, no over-qualification penalty
            (0, 0, Fraction(1)),  # minimum 0 guard (no division by zero)
        ],
    )
    def test_experience_fraction(self, years: int, minimum: int, expected: Fraction) -> None:
        assert experience_fraction(years, minimum) == expected

    def test_below_minimum_is_stated_in_the_reason(self) -> None:
        r = score_pair(candidate(years=3), job(minimum=5))
        assert "3 yrs experience, below the 5-yr minimum." in r.reason


class TestAvailability:
    @pytest.mark.parametrize(
        ("availability", "points"),
        [("Immediate", 10), ("2 weeks", 5), ("Not looking", 0)],
    )
    def test_availability_points(self, availability: Availability, points: int) -> None:
        base = score_pair(candidate(availability="Not looking"), job())
        r = score_pair(candidate(availability=availability), job())
        assert r.score - base.score == points

    def test_not_looking_is_penalised_not_excluded(self) -> None:
        ranked = rank_candidates_for_job(job(), [candidate(availability="Not looking")])
        assert len(ranked) == 1 and ranked[0].score > 0


class TestScoreFormula:
    def test_weights_add_up_to_100_for_a_perfect_match(self) -> None:
        r = score_pair(candidate(traits=("k1", "k2")), job())
        assert r.score == 100

    def test_sales_engineer_example_from_the_docs(self) -> None:
        dwight = candidate(
            skills=("sales", "negotiation", "security", "loyalty"),
            years=9,
            traits=("intense", "loyal"),
        )
        sales = job(
            skills=("sales", "public-speaking", "negotiation"),
            minimum=3,
            keywords=("enthusiastic", "persistent"),
        )
        r = score_pair(dwight, sales)
        assert r.score == Fraction(50 * 2, 3) + 30 + 0 + 10
        assert round_half_up(r.score) == Decimal("73.3")
        assert r.reason == (
            "Matches 2/3 required skills (sales, negotiation); missing public-speaking. "
            "9 yrs experience (min 3). Available immediately. "
            "No culture keyword overlap (enthusiastic, persistent)."
        )


class TestRounding:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (
                Fraction(7325, 100),
                "73.3",
            ),  # exact half rounds up (banker's rounding would give 73.2)
            (Fraction(7324, 100), "73.2"),
            (Fraction(100, 3), "33.3"),
            (Fraction(200, 3), "66.7"),
            (Fraction(0), "0.0"),
            (Fraction(100), "100.0"),
        ],
    )
    def test_round_half_up(self, value: Fraction, expected: str) -> None:
        assert round_half_up(value) == Decimal(expected)


class TestRanking:
    def test_higher_score_ranks_first(self) -> None:
        strong = candidate(id=1, name="Zed", skills=("a", "b"))
        weak = candidate(id=2, name="Amy", skills=("a",))
        assert [r.candidate.id for r in rank_candidates_for_job(job(), [weak, strong])] == [1, 2]

    def test_equal_scores_prefer_higher_skill_coverage(self) -> None:
        j = job(minimum=3)
        # 50 skills + 0 experience + 0 culture + 10 availability = 60
        full_skills = candidate(id=1, name="Zed", skills=("a", "b"), years=0)
        # 25 skills + 30 experience + 5 culture + 0 availability = 60
        half_skills = candidate(
            id=2, name="Amy", skills=("a",), years=5, availability="Not looking", traits=("k1",)
        )
        assert score_pair(full_skills, j).score == score_pair(half_skills, j).score == 60
        ranked = rank_candidates_for_job(j, [half_skills, full_skills])
        assert [r.candidate.name for r in ranked] == ["Zed", "Amy"]

    def test_equal_score_and_coverage_prefer_better_experience_fit(self) -> None:
        j = job(minimum=3)
        # 50 + 0 experience + 10 culture + 10 availability = 70
        no_experience = candidate(id=1, name="Amy", years=0, traits=("k1", "k2"))
        # 50 + 20 experience (2/3 of 30) + 0 culture + 0 availability = 70
        some_experience = candidate(id=2, name="Zed", years=2, availability="Not looking")
        assert score_pair(no_experience, j).score == score_pair(some_experience, j).score == 70
        ranked = rank_candidates_for_job(j, [no_experience, some_experience])
        assert [r.candidate.name for r in ranked] == ["Zed", "Amy"]

    def test_full_ties_break_by_name_then_id(self) -> None:
        a = candidate(id=3, name="beta")
        b = candidate(id=2, name="Alpha")
        c = candidate(id=1, name="Alpha")
        ranked = rank_candidates_for_job(job(), [a, b, c])
        assert [r.candidate.id for r in ranked] == [1, 2, 3]

    def test_both_directions_produce_identical_pair_results(self) -> None:
        cands = [candidate(id=1, skills=("a",)), candidate(id=2, skills=("b", "c"))]
        jobs = [job(id=1, skills=("a", "b")), job(id=2, title="Other", skills=("c",))]
        by_job = {
            (r.candidate.id, r.job.id): r for j in jobs for r in rank_candidates_for_job(j, cands)
        }
        by_cand = {
            (r.candidate.id, r.job.id): r for c in cands for r in rank_jobs_for_candidate(c, jobs)
        }
        assert by_job == by_cand
