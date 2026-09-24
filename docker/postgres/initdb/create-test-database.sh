#!/bin/sh
# Creates the database used by the API e2e tests next to the main one.
# Runs only when the data volume is empty (the first `docker compose up`).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE "$POSTGRES_TEST_DB";
EOSQL
