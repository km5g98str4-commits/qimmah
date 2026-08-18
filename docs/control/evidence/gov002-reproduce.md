# GOV-002 reproduction commands

MAIN=cc60adfc0da0f893b101230269d4847d33490429
CAND=dc031fa36929e07c3b00fa025a676ed64327ce59

## containment (criterion 1)
git merge-base --is-ancestor $MAIN $CAND   # => true
git rev-list --count $CAND..$MAIN          # => 0

## what main has that the candidate lacks
comm -23 <(git ls-tree -r --name-only $MAIN|sort) <(git ls-tree -r --name-only $CAND|sort)  # => 50 PNGs only

## per-branch ledger
for each remote head: git merge-base --is-ancestor <sha> $CAND ; git cherry $CAND <sha>

## media licensing finding
git show $CAND:src/data/exerciseGifs.ts   # empty map, watermark removal documented

## CI
gh/API: actions runs for ci.yml filtered by branch; candidate run 32174357740 = success
