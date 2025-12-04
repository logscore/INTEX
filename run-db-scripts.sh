#!/bin/sh
set -e

# Setup .pgpass (REPLACE YOUR_PASSWORD)
echo "*:54320:postgres:postgres:postgres" > ~/.pgpass
chmod 600 ~/.pgpass

# Run SQL scripts
for file in ./sql/*.sql; do
 [ -f "$file" ] || continue
 printf "Running %s\n" "$file"
 psql -h localhost -U postgres -d postgres -p 54320 -f "$file"
done
