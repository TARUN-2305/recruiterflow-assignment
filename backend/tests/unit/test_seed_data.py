"""Seed fidelity: the JSON must match the assignment PDF (Section B, pp. 7-10) exactly."""

from collections import Counter

import pytest

from app.domain.matching import rank_candidates_for_job, round_half_up
from scripts.seed import SEED_FILE, SeedData, load_seed
from tests.helpers import seed_profiles


@pytest.fixture(scope="module")
def data() -> SeedData:
    return load_seed()


def test_counts_and_ids_follow_source_order(data: SeedData) -> None:
    assert [c.id for c in data.candidates] == list(range(1, 16))
    assert [j.id for j in data.jobs] == list(range(1, 7))
    assert [c.name for c in data.candidates] == [
        "Sherlock H.",
        "Hermione G.",
        "Tony S.",
        "Leslie K.",
        "Ron S.",
        "Rick S.",
        "Elle W.",
        "MacGyver",
        "Sheldon C.",
        "Katniss E.",
        "Michael S.",
        "Olivia P.",
        "Ted L.",
        "Miranda P.",
        "Dwight S.",
    ]
    assert [j.title for j in data.jobs] == [
        "Backend Detective",
        "Rapid Prototyping Engineer",
        "Developer Relations Lead",
        "Engineering Manager, Chaos Team",
        "Incident Commander",
        "Sales Engineer",
    ]


def test_spot_check_values_against_the_pdf(data: SeedData) -> None:
    sherlock, macgyver, michael, dwight = (data.candidates[i] for i in (0, 7, 10, 14))
    assert sherlock.skills == ["deduction", "pattern-recognition", "forensics"]
    assert (sherlock.years_experience, sherlock.availability) == (8, "Immediate")
    assert sherlock.traits == ["analytical", "blunt"]
    assert macgyver.skills == [
        "rapid-prototyping",
        "resourcefulness",
        "chemistry",
        "systems-design",
    ]
    assert macgyver.traits == ["calm", "improviser"]
    assert michael.quirk == "World's best boss, according to a mug he bought himself."
    assert dwight.skills == ["sales", "negotiation", "security", "loyalty"]
    assert data.candidates[8].quirk == "Correct 95% of the time, insufferable 100% of the time."

    detective, prototyping, _, _, incident, _ = data.jobs
    assert detective.min_experience == 3
    assert detective.tagline == "We have a bug. We have no leads. We have you."
    assert prototyping.tagline == "Ship first, document never (kidding — please document)."
    assert incident.culture_keywords == ["decisive", "calm-under-pressure"]


def test_derived_totals(data: SeedData) -> None:
    assert Counter(c.availability for c in data.candidates) == {
        "Immediate": 8,
        "2 weeks": 3,
        "Not looking": 4,
    }
    assert sum(len(c.skills) for c in data.candidates) == 50
    assert sum(len(c.traits) for c in data.candidates) == 30
    assert sum(len(j.required_skills) for j in data.jobs) == 16
    assert sum(len(j.culture_keywords) for j in data.jobs) == 12


def test_seed_file_has_no_zero_width_spaces() -> None:
    # The PDF's text layer contains U+200B characters; they must not leak into seed data.
    assert "​" not in SEED_FILE.read_text(encoding="utf-8")


def test_top_match_per_job_on_seed_data(data: SeedData) -> None:
    candidates, jobs = seed_profiles(data)
    top = {
        j.title: (r.candidate.name, str(round_half_up(r.score)))
        for j in jobs
        for r in rank_candidates_for_job(j, candidates)[:1]
    }
    assert top == {
        "Backend Detective": ("Sherlock H.", "95.0"),
        "Rapid Prototyping Engineer": ("Rick S.", "90.0"),
        "Developer Relations Lead": ("Elle W.", "90.0"),
        "Engineering Manager, Chaos Team": ("Miranda P.", "63.3"),
        "Incident Commander": ("Olivia P.", "90.0"),
        "Sales Engineer": ("Dwight S.", "73.3"),
    }
