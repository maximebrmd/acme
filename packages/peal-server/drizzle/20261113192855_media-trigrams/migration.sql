-- The library's search finds text anywhere in a file's name or description
-- with trigram indexes, which pg_trgm gives: a trusted extension, which the
-- database's owner may create, shipped with PostgreSQL's own packages.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
