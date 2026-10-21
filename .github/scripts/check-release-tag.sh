#!/usr/bin/env bash
# Check the release tag $TAG against the commit $SHA being released: the tag
# may be missing (publishing creates it) or point to $SHA, but must not point
# to another commit. Run from a checkout of the repository.
set -euo pipefail

: "${TAG:?TAG is required}"
: "${SHA:?SHA is required}"

# An annotated tag lists its commit as refs/tags/<tag>^{}.
current="$(git ls-remote origin "refs/tags/$TAG^{}" | cut -f1)"
if [ -z "$current" ]; then
  current="$(git ls-remote origin "refs/tags/$TAG" | cut -f1)"
fi

if [ -z "$current" ]; then
  echo "tag $TAG does not exist yet; publishing creates it on $SHA"
elif [ "$current" != "$SHA" ]; then
  echo "::error::tag $TAG already points to $current, not $SHA"
  exit 1
else
  echo "tag $TAG points to $SHA"
fi
