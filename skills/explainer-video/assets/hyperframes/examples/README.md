# Examples from earlier films

Working code from the films the playbook describes, kept as models. Paths inside point at the author's projects and
scratch clones; adapt them to the new subject before running anything.

- `film3/lib/fl.js`, `fl.css`: the steering explainer's helpers. On top of the template's `lib/` they add `K.code` and
  `K.mark` (code panels cut from real files, with real line numbers), `K.term` (a terminal), `K.card`, `K.row`, `K.num`,
  and film 2's `K.stack` (a recurring canvas motif drawn from one cached texture). Start a repo explainer's `lib/` here.
- `film3/tools/make_data.py`: scene data from the real files only, code cut by line range. `measure.py`: numbers
  measured through the explained code's own hooks, so the film's numbers and the code it shows stay on one path.
- `faultline/tools/make_data.py`: scene data from re-implemented formulas on one real weight tensor.
  `make_data_repo.py`: scene data from running the explained repo's own code (ask the user first).
  `placeholder_repo.mjs`: same shapes, flagged placeholder, so scenes can be built before that code may run.
