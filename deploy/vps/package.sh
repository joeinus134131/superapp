#!/bin/sh
# Produce a source-free installer. No real env files are read or copied.
set -eu
cd "$(dirname "$0")"
output=${1:-/tmp/whenya-installer.tar.gz}
case "$output" in /*) ;; *) output="$PWD/$output" ;; esac
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT HUP INT TERM
mkdir "$stage/whenya"
docker compose --env-file .env.example -f compose.yaml config \
  --no-interpolate --no-env-resolution --no-path-resolution --format json |
  node -e '
    let input = "";
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      const config = JSON.parse(input);
      for (const service of Object.values(config.services)) delete service.build;
      process.stdout.write(JSON.stringify(config, null, 2) + "\n");
    });
  ' > "$stage/whenya/compose.yaml"
cp .env.example api.env.example web.env.example Caddyfile compose.existing-proxy.yaml Caddyfile.existing-proxy.example README.md "$stage/whenya/"
tar -czf "$output" -C "$stage" whenya
printf 'Installer: %s\n' "$output"
