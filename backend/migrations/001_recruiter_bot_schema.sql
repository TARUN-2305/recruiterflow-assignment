-- Recruiter Bot schema (hand-written DDL).
-- Candidates and jobs keep explicit ids (source order) so URLs stay stable across reseeds.
-- Skills and tags are shared vocabularies; junction tables keep the source display order.
-- A "match" is not stored: it is computed on read from these tables (see ADR-003).

CREATE TABLE candidates (
    id               INTEGER PRIMARY KEY,
    name             TEXT    NOT NULL UNIQUE,
    years_experience INTEGER NOT NULL CHECK (years_experience >= 0),
    availability     TEXT    NOT NULL CHECK (availability IN ('Immediate', '2 weeks', 'Not looking')),
    quirk            TEXT    NOT NULL
);

CREATE TABLE jobs (
    id             INTEGER PRIMARY KEY,
    title          TEXT    NOT NULL UNIQUE,
    min_experience INTEGER NOT NULL CHECK (min_experience >= 0),
    tagline        TEXT    NOT NULL
);

-- Labels are stored already normalised (trimmed, lower-case); the source data satisfies this.
CREATE TABLE skills (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (name <> '' AND name = lower(btrim(name)))
);

-- Shared vocabulary for candidate traits and job culture keywords, so overlap is an id match.
CREATE TABLE tags (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (name <> '' AND name = lower(btrim(name)))
);

CREATE TABLE candidate_skills (
    candidate_id INTEGER  NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    skill_id     INTEGER  NOT NULL REFERENCES skills (id),
    position     SMALLINT NOT NULL CHECK (position >= 1),
    PRIMARY KEY (candidate_id, skill_id),
    UNIQUE (candidate_id, position)
);
CREATE INDEX candidate_skills_skill_id_idx ON candidate_skills (skill_id);

CREATE TABLE job_required_skills (
    job_id   INTEGER  NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    skill_id INTEGER  NOT NULL REFERENCES skills (id),
    position SMALLINT NOT NULL CHECK (position >= 1),
    PRIMARY KEY (job_id, skill_id),
    UNIQUE (job_id, position)
);
CREATE INDEX job_required_skills_skill_id_idx ON job_required_skills (skill_id);

CREATE TABLE candidate_traits (
    candidate_id INTEGER  NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    tag_id       INTEGER  NOT NULL REFERENCES tags (id),
    position     SMALLINT NOT NULL CHECK (position >= 1),
    PRIMARY KEY (candidate_id, tag_id),
    UNIQUE (candidate_id, position)
);
CREATE INDEX candidate_traits_tag_id_idx ON candidate_traits (tag_id);

CREATE TABLE job_culture_keywords (
    job_id   INTEGER  NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    tag_id   INTEGER  NOT NULL REFERENCES tags (id),
    position SMALLINT NOT NULL CHECK (position >= 1),
    PRIMARY KEY (job_id, tag_id),
    UNIQUE (job_id, position)
);
CREATE INDEX job_culture_keywords_tag_id_idx ON job_culture_keywords (tag_id);
