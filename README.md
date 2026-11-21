# makefun-csv-reader-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/penawarlawas/makefun-csv-reader-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/penawarlawas/makefun-csv-reader-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A drop-in replacement for the house `csv-reader 1.0.0` that produces byte-identical
output on every input while using about a third of the CPU. The reference builds each
field one character at a time (`value += c`) and calls a closure per character; this
reads the text in runs, finding each delimiter with `charCodeAt` comparisons and
slicing whole runs in one allocation. Semantics are the reference's, branch for branch:
BOM handling, CRLF vs lone CR, doubled quotes, unterminated quotes, `quote_junk`,
`stray_cr`, `short_row`/`long_row`, and the header/width rules are all preserved.

Measured on the practice instance, same sandbox (`--cpus=1 -m 1024m --network=none`):

| | wall | CPU |
|---|---|---|
| house baseline | 8.70 s | 8.21 s |
| this entry | 2.82 s | 2.76 s |

Parse time alone: 4531 ms for the reference vs 1684 ms here.

## Run it

```sh
node cli/makefun.mjs grade-local --kit . --bot <repository> --driver docker
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
