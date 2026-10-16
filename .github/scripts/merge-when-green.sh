#!/usr/bin/env bash
# Usage: merge-when-green.sh <branch> <pull-request-number>
#
# For pull requests opened by a workflow with GITHUB_TOKEN. Such a PR gets no CI of its own, and no workflow event is
# chained from runs the Actions token started, so the workflow that opened it has to do the rest itself: run CI on the
# branch, wait for it, merge, then dispatch Release and Playground (workflow_dispatch is the one event the Actions
# token may start). Needs actions: write, contents: write and pull-requests: write, and GH_TOKEN set.
set -euo pipefail
branch="$1"
pr="$2"

sha=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)
echo "Running CI on $branch @ ${sha:0:7} for #$pr"
gh workflow run ci.yml --ref "$branch"

run=""
for _ in $(seq 1 36); do
  run=$(gh run list --workflow ci.yml --branch "$branch" --event workflow_dispatch --limit 10 \
    --json databaseId,headSha --jq "[.[] | select(.headSha == \"$sha\")][0].databaseId // empty")
  [ -n "$run" ] && break
  sleep 5
done
[ -n "$run" ] || { echo "::error::The CI run for $branch did not appear." >&2; exit 1; }

echo "Waiting for CI run $run"
gh run watch "$run" --interval 15 --exit-status

# The head must still be the commit CI tested; a newer push means a newer run will handle it.
now=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)
[ "$now" = "$sha" ] || { echo "#$pr changed while CI ran; leaving it for the next run."; exit 0; }

gh pr merge "$pr" --squash --delete-branch
echo "Merged #$pr"
gh workflow run release.yml --ref main -f dry_run=false
gh workflow run pages.yml --ref main
