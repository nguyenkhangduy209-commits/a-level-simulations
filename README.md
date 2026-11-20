# A Level Mechanics & Physics Simulations

Interactive simulations for **Cambridge 9709 Mathematics Paper 4 (Mechanics)** and **Cambridge 9702 AS Physics**, plus every 9709 and 9702 Paper 4 question from 2018–2026, extracted and tagged by topic and question type.

## Open it

No install, no build step: plain HTML + canvas + JavaScript.

- Open `sim/index.html` in a browser, or
- serve the folder: `python3 -m http.server 8765 --directory sim` and go to http://localhost:8765

## What is inside

### Simulations (`sim/`)
16 simulations, each with modes (tabs). Every parameter has a slider (snaps to whole numbers; type exact values in the box), the working is shown with your numbers to 3 s.f., each sim auto-plays when an input changes, and you can type a time to see the data at that instant. "Exam setups" presets reproduce real past-paper questions (checked against the mark schemes).

| Course | Simulation | Modes |
|---|---|---|
| 9709 (g = 10) | Forces and equilibrium | resultant of forces · strings and rings · friction |
| | Straight-line motion | journeys and v–t graphs · vertical motion · variable acceleration (calculus) |
| | Slopes, pulleys and lifts | particle on a slope · pulleys and connected particles · lift |
| | Vehicles, towing and power | car, trailer and P = Fv · engine work and average power |
| | Work and energy | work–energy principle |
| | Momentum and collisions | collisions on a line · collision in mid-air |
| 9702 AS (g = 9.81) | Errors and uncertainties | combining uncertainties · experiment to measure g |
| | Kinematics in 1-D and 2-D | projectiles · vectors and relative velocity · motion graphs · measuring g |
| | Dynamics and momentum | collisions 1-D · collisions and explosions 2-D (elastic / inelastic) · drag · lift |
| | Forces, moments and pressure | moments · triangle of forces · pressure and upthrust |
| | Work, energy and power | energy and efficiency · P = Fv |
| | Deformation of solids | springs and wires |
| | Waves | progressive waves · CRO · Doppler · EM spectrum and polarisation |
| | Superposition | stationary waves · interference and diffraction · grating |
| | Electricity and D.C. circuits | current and resistivity · I–V characteristics · e.m.f. · Kirchhoff · potential dividers |
| | Particle physics | α-scattering · decay, particles and quarks |

Only syllabus content is included (e.g. no air resistance in calculations; it appears only as a labelled qualitative ghost path, as 9702 3.2.2 requires).

### Past-paper questions (`data/questions/`)
- `9709_p4.json`, `9702_p4.json`: 121 papers, 1081 questions, 3743 parts with marks, topic tags and question types.
- `*_by_topic.md`, `*_by_type.md`: readable indexes.
- `VALIDATION.md`: marks match 50/100 on every paper; parts cross-checked against the mark schemes; tagging accuracy on hand-labelled papers.
- Tags were produced by rules and then hand-reviewed part by part (`tools/papers/overrides/`).

## Layout
```
sim/            simulations (index.html hub, group.html, sims/, engine/, core/, tests/)
tools/papers/   question extraction and tagging pipeline (Python 3, stdlib)
data/           extracted paper text, tagged questions, syllabus data
docs/           PLAN.md (design + test values), SIM_CONVENTIONS.md
```

## Checks
```bash
node sim/tests/run.js        # hand-computed physics test cases
node sim/tests/smoke.js      # loads every page headlessly, applies every preset and slider extreme
python3 tools/papers/run_all.py   # rebuilds data/questions and sim/data/p4-questions.js
```

## Rebuilding from the PDFs
The past-paper PDFs are not in the repository. Put them in `data/papers/<9709|9702>/<year>/<session>/` and run (needs `pip install pdfplumber`):
```bash
python tools/papers/extract.py data/papers data/papers_text
python tools/papers/ms_parse.py data/papers data/questions/ms_marks.json
python3 tools/papers/run_all.py
```

Past-paper content © Cambridge University Press & Assessment (UCLES). For personal study use.
