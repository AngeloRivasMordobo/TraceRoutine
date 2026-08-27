# Glossary (TR-74)

The same seven state words everywhere: Today, the grid, the legend, the sheets, notifications and stores.

| Key | Español | English | Meaning |
|---|---|---|---|
| `done` | hecha | done | Completed as planned. Counts as a hit. |
| `min` | mínima | minimum | The minimum version was done on a bad day. Counts as a hit; drawn as a half cell. |
| `skip` | omitida | skipped | Consciously skipped, optional reason. Counts as a miss. For "since last time" rules it does not restart the interval; for wait-mode cycles it advances the step. |
| `pending` | pendiente | pending | Due today, no log yet. Never counts against you. |
| `missed` | no hecha | not done | Was due in the past, no log. Counts as a miss. Drawn as a neutral outline, no red. |
| `future` | toca | due | Will be due on a future day (projected for relative rules). |
| `flex` | disponible | available | Flexible rule ("3 times a week"): the day is available, not required. |
| `none` | no toca | off day | Not due. A dot. Off days never hurt you. |

Rules for copy: verbs match from start to finish ("Create activity" → "Activity created"); never "anchored" or "relative" on screen (say "follows the calendar" / "counts from the last time"); when the user misses, say when the next one is due, never "streak lost".
