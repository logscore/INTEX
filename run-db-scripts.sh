#!/bin/sh
set -e

apk add --no-cache postgresql-client

# Setup .pgpass (REPLACE YOUR_PASSWORD)
echo "*:5432:postgres:postgres:wlmckv5UtxtVqZRv2OfP" > ~/.pgpass
chmod 600 ~/.pgpass

# Run SQL scripts
for file in ./sql/*.sql; do
 [ -f "$file" ] || continue
 printf "Running %s\n" "$file"
 psql -h intex-db-2.cc1q8sccapis.us-east-1.rds.amazonaws.com -U postgres -d postgres -p 54320 -f "$file"
done
