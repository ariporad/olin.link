BEGIN TRANSACTION;

CREATE TABLE migrations (
	migration_number INTEGER PRIMARY KEY
);

INSERT INTO migrations VALUES (0);

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE shortlinks (
	id            citext PRIMARY KEY,
	url             text NOT NULL,
	email           text NOT NULL,
	hit_count    integer NOT NULL DEFAULT 0,
	created_at timestamp NOT NULL DEFAULT now()
);

END TRANSACTION;