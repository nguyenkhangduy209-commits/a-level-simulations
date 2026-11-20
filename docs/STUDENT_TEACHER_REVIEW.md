# Student and Teacher Review: A Level Mechanics Simulations

**Repository:** [a-level-simulations](https://github.com/nguyenkhangduy209-commits/a-level-simulations)
**Review date:** 20 November 2026 (revised against the syllabus the same day)
**Syllabuses:** Cambridge International AS & A Level Mathematics 9709 (2026–2027), Paper 4 Mechanics; Physics 9702 (2025–2027), AS topics 1–11
**Audience considered:** 9709 Mechanics teachers and students, especially students new to mechanics or not confident with websites and devices.

## Summary

The suite already has the hard parts: a model for every 9709 Paper 4 topic, typed exact inputs, live working to 3 s.f., exam setups checked against mark schemes, and no dependencies (it runs offline from a folder). What it lacks is a **route through that material**. A beginner opens a page with a dozen controls and the full answer already visible, and has to work out what to look at.

The single most useful change is a guided **Learn** route for one topic (4.1 Forces and equilibrium), following the method a mark scheme rewards: forces → resolve → equate → solve → check. Keep the current pages as the **Explore / Teach** view.

## Evidence and scope

- Read: README, `CURRICULUM_MAP.md`, `docs/PLAN.md` (learning outcomes), `docs/SIM_CONVENTIONS.md`, `data/syllabus_9709_9702.json`, `data/questions/VALIDATION.md`.
- Inspected in detail: the hub (`sim/index.html`) and Strings and rings (`sim/sims/9709/m1-strings.html`).
- Checked across all pages by code search: external requests, viewport meta, browser storage handling, reduced-motion support, exam-mode behaviour.
- Not done: testing with real students or teachers, every page on every device, screen-reader testing. Recommendations about other pages are design guidance, not confirmed defects.

## Syllabus alignment

### 9709 Paper 4 coverage

| Syllabus | Simulations | Comment |
|---|---|---|
| 4.1 Forces and equilibrium | `m1-resultant`, `m1-strings`, `m1m4-plane` (friction) | Covers components, equilibrium, smooth contact, F ≤ μR and limiting equilibrium. Lami's theorem is offered as an optional check and labelled "not required", which is the right call: resolving in two directions always works and is what beginners should learn first. |
| 4.2 Kinematics in a straight line | `m2-journey`, `m2-vertical`, `m2-calculus` | Includes v–t areas, distance vs displacement, and calculus. Calculus should stay within P1 techniques (powers of t, including fractional and negative, and (at + b)ⁿ); no ln. |
| 4.3 Momentum | `m3-collisions` | Direct impact of two bodies in a line, including coalescence. Impulse and coefficient of restitution are Further Mathematics and should not appear in 9709 pages. |
| 4.4 Newton's laws of motion | `m1m4-plane`, `m4-connected`, `m4-lift`, `m4-vehicle` | Strings over smooth pulleys/pegs, car and trailer, lifts: all on syllabus. |
| 4.5 Energy, work and power | `m5-energy`, `m4-vehicle` | W = Fd cos θ, KE, GPE, work–energy with friction, P = Fv. |

No gaps found against the 4.1–4.5 outcomes. Two out-of-syllabus risks to guard in any new Learn content: **moments** (9702 only; not in 9709 P4) and **impulse/restitution** (Further Maths).

### Exam conventions beginners must be taught

These appear on every 9709 Paper 4 and cost marks when missed. The original review did not mention them; a beginner route should state them on the first screen:

- Use **g = 10 m s⁻²** (9702 uses 9.81; the hub already switches this by course).
- Give non-exact answers to **3 significant figures**, angles to **1 decimal place**.
- Show the equations you resolve, not just the result: method marks (M1) depend on a correct-form equation with the right number of terms.

### Syllabus order for a "Start here" sequence

Not every topic depends on every other. A sensible order, based on what each outcome needs:

1. **4.1** Forces and equilibrium (resolving is used everywhere after this)
2. **4.2** Kinematics (independent of 4.1; can run in parallel)
3. **4.4** Newton's laws (needs 4.1 resolving and 4.2 constant-acceleration formulae)
4. **4.5** Energy, work and power (needs 4.4 for forces and 4.2 for motion)
5. **4.3** Momentum (self-contained; often combined with 4.2 in questions)

### 9702: what the past-paper data can and cannot support

9702 **Paper 4 assesses the A Level topics 12–25**, while the 9702 simulations cover **AS topics 1–11**. The hub already says this, but the consequence matters for teaching: the tagged 9702 Paper 4 questions cannot serve as "past-paper transfer" for the AS simulations. That needs 9702 Papers 1 and 2, which are not in the data. Also, 2018–2021 9702 Paper 4s follow the older syllabus (op-amps, communication) and should be marked as legacy in any student-facing list.

## What already works well

- **Topic structure matches the syllabus.** The 9709 hub groups by the five Paper 4 areas.
- **Exam values can be typed exactly.** Every slider has a number box.
- **Working is shown as equations with the student's numbers**, formatted to 3 s.f., in the style of a mark scheme.
- **Exam setups reproduce real questions** and were checked against mark schemes.
- **Common traps** match real mark-scheme pitfalls (sin/cos swap, assuming F = μR when not limiting, R changing when a force has a perpendicular component).
- **Low-tech friendly by construction:** plain HTML/JS, no external requests, no accounts, works offline from a folder, every page has a mobile viewport tag, and browser storage is wrapped in try/catch so pages work with storage blocked.
- **Data quality is documented:** 121 papers, 1,081 questions, 3,743 parts, mark totals checked, tags hand-reviewed. Tags are still a guide, not an answer key.

## Where beginners struggle

### 1. No first step

The hub offers two courses, five areas, 16 simulations, modes, and a question-type index. "Open one, then pick a mode or an exam setup inside" describes the structure but not what to do first.

### 2. Too many decisions on one page

Strings and rings exposes setup type, geometry, unknowns, orientation, force direction, preset, mass, angles, force, tensions, Lami's check, and exam mode. Useful for a teacher; for a beginner, the controls compete with the physics.

### 3. The answer is visible before the reasoning

Working updates live, so a student can read the result without attempting it. **Exam mode exists**, but it reveals answers by **mouse hover only** (`.exam-hidden .eq:hover .res` in `theme.css`). On a phone or tablet, and for keyboard users, there is no reliable way to reveal a single line. This is a concrete defect: add tap/click/Enter to reveal each line, and a "reveal next step" button.

### 4. Vocabulary arrives without definitions

"Resultant", "equilibrium", "tension", "smooth", "limiting", "resolve", "slack" are used in controls and notes before being explained. A one-line definition at first use is enough.

### 5. Past papers come too early

The question index is valuable after a concept is learned, not before. Point to it from the end of a Learn sequence instead.

## Recommendations (priority order)

### 1. Build one Learn sequence: equilibrium of a particle on two strings (4.1)

Steps, matching how the mark scheme awards marks:

1. **The object.** The particle is a point; list the forces on it.
2. **Each force.** Highlight weight, then each tension. A string pulls along its length and cannot push.
3. **Directions.** Show positive horizontal and vertical on the diagram.
4. **One component.** Highlight one tension and its marked angle. Ask "sin or cos for the horizontal part?" before revealing. (This targets the most common 4.1 error.)
5. **Equations.** Horizontal sum = 0, then vertical sum = 0. Each is a method mark.
6. **Solve.** Reveal the simultaneous solution line by line; answers to 3 s.f.
7. **Check.** Tensions must be positive; a negative value means the string would be slack.
8. **Predict, then test.** "If the left angle gets steeper, does T₁ go up or down?"
9. **Parallel question** with the answer hidden and one hint.
10. **Past-paper transfer:** link the matching exam setup and its tagged question.

Then reuse the same shape for other topics: **idea → model → prediction → worked example → practice → past paper**.

### 2. Separate Learn from Explore

- **Learn:** one task at a time, two or three controls, reveal-next-step, Reset.
- **Explore / Teach:** the current pages, unchanged.

### 3. Fix exam-mode reveal for touch and keyboard

Small change, real benefit: click/tap/Enter toggles a single line; add "reveal next" and "reveal all". This also gives teachers a pause-predict-reveal tool for class.

### 4. Add a "Start here" path on the 9709 hub

Follow the syllabus order above, state g = 10, 3 s.f., 1 d.p. once, and make clear that 9702 is a separate course.

### 5. Respect reduced motion

No page checks `prefers-reduced-motion`, and sims auto-play when an input changes. Under reduced motion, show the final state and let Play start the animation.

### 6. Short scaffolded practice per topic

Identify a force or graph feature → choose a method → complete a calculation → a real past-paper part. Hints should target the likely misconception (from the existing common-traps lists), not just say right or wrong.

### 7. Test with real students

Ask students new to mechanics to finish the Learn sequence unaided on a phone. Note where they hesitate, pick the wrong control, or misread the diagram.

## Considered and rejected

Kept out on purpose, so they are not re-proposed without a reason:

- **Printable notes, account-free use, offline fallback.** Already satisfied: there are no accounts and the site runs offline from a folder. Printable notes duplicate textbooks.
- **A difficulty rating for past-paper questions.** Not defined by the syllabus and subjective; filtering by syllabus topic and question type (already present) is more reliable.
- **Removing advanced controls.** Teachers use them. Hide them behind Explore instead.
- **A generic instruction strip on every page.** Same text everywhere gets ignored. Instructions belong inside the Learn sequence, at the moment they are needed.
- **Using 9702 Paper 4 questions with the AS sims.** Wrong syllabus level (see above).

## Acceptance checks for the Learn sequence

Ready for class when a first-time student can, without help:

- Find the 9709 Learn sequence from the hub.
- Name the forces on the particle and say why tension acts along the string.
- Choose sin or cos from the marked angle and explain why.
- Say in words what the two equilibrium equations mean.
- Give the answer to 3 s.f. using g = 10.
- Reveal steps one at a time on a phone (no hover).
- Recover from a slack-string setup with Reset.

These are proposed criteria, not results of testing.

## Limitations

- Detailed inspection covered the hub and Strings and rings; other pages were checked by code search only.
- No interviews or usability tests with real teachers or students.
- Syllabus learning outcomes are taken from the repository's `docs/PLAN.md` and `data/syllabus_9709_9702.json`, which paraphrase the Cambridge documents; check exact note wording (e.g. on Lami's theorem) against the published syllabus before quoting it to students.
