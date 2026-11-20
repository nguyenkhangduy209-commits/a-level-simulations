# Student and Teacher Review: A Level Mechanics Simulations

**Repository:** [a-level-simulations](https://github.com/nguyenkhangduy209-commits/a-level-simulations)  
**Review date:** 20 November 2026  
**Audience considered:** Cambridge 9709 Mechanics teachers and students, especially students at the start of mechanics and students who have limited experience with websites or devices.

## Executive summary

The repository contains a broad set of interactive simulations for Cambridge 9709 Mechanics and 9702 AS Physics, alongside a large collection of tagged Paper 4 question data. The simulations combine visual models, editable parameters, exam setups, worked calculations, and common traps. These are useful ingredients for teaching and exam practice.

The main learning risk is the gap between **having a detailed simulation** and **knowing how to learn from it**. A student new to mechanics may not know the vocabulary, how to operate the controls, what to observe, or how to connect a moving diagram to equations and a past-paper method. Several simulations are deliberately flexible; flexibility creates a high control burden for beginners.

The highest-value improvement is a guided beginner route that teaches one idea at a time and explicitly demonstrates how to operate the page. Keep the full explorer for teacher demonstrations and experienced students, but offer a simple, linear route from concept to practice.

## Review scope and evidence

This review includes:

- Repository materials: README, curriculum map, simulation conventions, curriculum and paper data, and paper-data validation report.
- The local 9709 Mechanics hub and a hands-on inspection of the “Strings and rings” equilibrium simulation, including its visible setup choices, controls, displayed force components, worked equations, exam setups, and common traps.
- A second perspective: how a teacher might use the page to demonstrate a concept, and how a beginner student might approach the same page without prior mechanics knowledge.

The detailed interface observations below are strongest for the hub and strings simulation. The repository contains other simulations, but this was not a systematic usability audit of every page, device size, browser, or assistive technology. Recommendations for the wider set are framed as design guidance rather than claims that every page has the same issue.

## What already works well

### Learning content and subject coverage

- The 9709 hub groups content under the five Paper 4 areas: forces and equilibrium, kinematics, momentum, Newton’s laws, and energy/work/power.
- The repository describes simulations for core mechanics situations including forces, friction, journeys, vertical motion, variable acceleration, connected particles, lifts, energy, and collisions.
- The strings simulation displays a force-component table and equations for horizontal and vertical equilibrium. It also explains sign convention and includes notes about tension, angles, smooth rings, and strings going slack.
- Exam setups connect the abstract model to named Cambridge paper questions. This can make realistic examples easier to prepare and revisit.
- Slider-plus-typed-value controls allow exploration as well as entering exact exam values.
- The paper data has a documented processing pipeline and validation report. The report covers 121 papers, 1,081 questions, and 3,743 parts, and records mark totals, mark-scheme comparisons, and held-out tagging checks. This is meaningful quality-control evidence, though it does not guarantee every tag or extracted text is error-free.

### Teacher perspective

A teacher can use an exam setup to reproduce a known configuration, change a parameter live, and point to the corresponding diagram, components, and calculations. The common-traps panel is a useful prompt for class discussion. The broad controls can also help teachers compare cases—for example, how tension changes as a string angle changes.

### Beginner student perspective

The picture, numerical components, sign convention, equations, and explanatory notes provide multiple ways into the problem. The student can change a mass or angle and see the calculation update. A typed value is available when a slider is imprecise.

## Where beginners may struggle

### 1. The starting point is not sufficiently guided

The hub presents two courses, many topic areas, simulations, modes, and a past-paper question-type list. A novice may not know whether to start with a concept, a simulation, or a question. “Open one, then pick a mode or an exam setup inside” explains the structure at a high level but does not teach a first-time user exactly what to do next.

### 2. The strings simulation presents many decisions at once

The inspected page exposes choices for setup type, geometry, unknowns, string orientation, force direction, exam setup, mass, angles, force, tensions, optional resolution, Lami’s theorem, and exam mode. This is powerful for exploration, but a beginner can spend attention on selecting controls before understanding equilibrium.

### 3. Correct output is not the same as a learning sequence

The page shows working and answers live. A beginner needs the reasoning order too: identify forces, choose axes, resolve forces, apply equilibrium, solve, then check the physical meaning of the answer. If all of the working is visible immediately, a student may read a result without attempting or understanding the steps.

### 4. Mechanics vocabulary and conventions need an entry ramp

Words such as “resultant,” “equilibrium,” “tension,” “smooth ring,” “limiting friction,” “resolve,” and “slack” are meaningful to a teacher but can stop a novice. The site should introduce them in plain language before relying on them in controls or notes. Diagrams should consistently identify the object, the forces acting on it, angle references, and positive directions.

### 5. Past-paper browsing may be a poor first exercise

A topic/type index is valuable after instruction. A learner who is still acquiring the model may face long lists of exam wording before knowing the prerequisite idea. Question tags are also a guide, not an infallible answer key; the validation report records less-than-perfect held-out question-type accuracy.

## Low-tech and first-time user support

“Low-tech” can mean an older phone or computer, a small screen, slow or unreliable internet, shared access, limited confidence with sliders, or little experience with browser interfaces. The product should not assume a student knows what a tab, slider, preset, search box, or embedded simulation does.

### Make the first action explicit

Add a short instruction strip at the top of every activity, for example:

1. **Choose a lesson or example** from the list.
2. **Press Play** to watch, or use Pause to stop.
3. **Change one value** using the number box; use the slider only if you want to explore.
4. **Look at the highlighted force or graph.**
5. **Read Step 1**, then press Next to reveal the next line.
6. Use **Reset** to return to the starting example.

Use the actual labels and controls present on each page. Avoid instructions that assume a student understands “interact with the simulation.”

### Make controls easy to recognize and operate

- Give every control a plain-language label and a short explanation of what changing it will affect.
- Use buttons with text such as **Play**, **Pause**, **Next step**, **Show answer**, and **Reset**. Do not rely on icons or color alone.
- Keep labels beside sliders, show the current value and units, and let users type an exact value without needing precise pointer movement.
- Make focus and selected states visible for keyboard users. Support Tab, Shift+Tab, Enter/Space, and arrow keys where appropriate.
- Provide a stable, obvious way to return to the topic list and to reset the example.
- Avoid making a student infer whether a tab changes the course, the mode, or the page.

### Support small screens and limited devices

- Test common phone-sized screens and narrow browser windows. Keep the force diagram and the essential control visible without horizontal scrolling where practical.
- Allow the diagram to be enlarged or opened separately if it is too small to read.
- Offer a **Simple view** with fewer controls and a **Full view** for exploration.
- Keep pages lightweight: avoid unnecessary animation, provide a pause control, and make reduced-motion preferences available.
- Ensure that essential explanations are selectable text, not only labels drawn into a canvas.
- Let students use the core activity without accounts, downloads, or high-bandwidth media.

### Support unreliable connectivity and shared devices

- Provide printable or downloadable lesson notes and worked examples as a fallback.
- Keep a concise text explanation and static diagram available if animation fails or is disabled.
- Explain how to resume after a page refresh, and make reset behavior predictable.
- Avoid requiring students to create accounts or retain personal data just to explore a lesson.
- Where browser storage is used for preferences, make the activity continue normally if storage is unavailable.

### Use plain language and visible progress

- Define a new term in one short sentence at first use, with an optional deeper explanation.
- Show a clear lesson progress marker, such as **1 of 5: Identify the forces**.
- Tell the learner what they should notice: “The horizontal components cancel; the vertical components balance the weight.”
- Give a next action after feedback instead of leaving a student at a dead end.
- Provide concise error recovery: “That value makes the string slack. Reset or reduce the force, then try again.”

## Recommended student learning pathway

For equilibrium of a particle held by two strings:

1. **Start with the object.** Explain that the model treats the particle as a point and asks what forces act on it.
2. **Identify each force.** Highlight weight and each tension one at a time. Explain that a string pulls along its length and cannot push.
3. **Choose directions.** Make the positive horizontal and vertical directions visible on the diagram.
4. **Understand one component.** Highlight one tension and its angle reference. Ask whether the horizontal component uses sine or cosine before revealing the answer.
5. **Build the equilibrium equations.** Show horizontal forces sum to zero, then vertical forces sum to zero.
6. **Solve the pair.** Reveal the simultaneous equations and calculation steps in order.
7. **Check the model.** Confirm that the triangle of forces closes and that tensions are non-negative.
8. **Try one change.** Ask the learner to predict what happens when one angle or mass changes, then let them test it.
9. **Attempt a parallel question.** Hide the answer, offer a hint, then reveal the mark-scheme-style working.
10. **Transfer to a past paper.** Link to a suitable question only after the learner has practised the underlying method.

Use this same progression across the syllabus: **plain-language idea → visual model → guided prediction → worked example → independent practice → past-paper transfer**.

## Recommendations by priority

### Priority 1: Build a true beginner route

Create a guided sequence for one representative topic—forces and equilibrium is a good candidate. It should define terms, show the operating instructions, reveal the method in steps, include prediction checks, and end with an independent question. Pilot it with students who have just started mechanics.

### Priority 2: Separate “Learn” from “Explore”

Provide two clear routes:

- **Learn:** one task at a time, minimal controls, guided prompts, answer reveal, and reset.
- **Explore / Teach:** full parameter controls, presets, optional checks, and teacher-led demonstration.

Do not remove advanced controls; make them an intentional choice rather than the default burden for a beginner.

### Priority 3: Clarify course and syllabus navigation

Make “9709 Mathematics: Mechanics” the clear route for a student who came to learn mechanics. Label “9702 AS Physics” as a separate course, explain the difference, and offer a “Start here” sequence through 9709 topics and prerequisites.

### Priority 4: Add scaffolded practice

For each major idea, include short questions that progress from identifying a force or graph feature, to selecting a method, to completing a calculation, to solving a past-paper part. Give hints tied to the likely misconception rather than only displaying right/wrong.

### Priority 5: Improve question discovery and data transparency

Allow filtering by syllabus topic, year/session, question type, and an appropriate difficulty or prerequisite level. Surface the paper/session/question reference clearly. Let teachers or maintainers review questionable tags, and make it possible for a user to report a mismatch.

### Priority 6: Add teacher-ready presentation support

Provide a lesson sequence, suggested questions, and an answer reveal suitable for class discussion. A teacher should be able to set up an example quickly, pause at a useful point, collect predictions, and then reveal the working.

### Priority 7: Validate the experience on real student devices

Test on small phones, older laptops, keyboard-only navigation, reduced motion, slow connections, and browsers with storage disabled. Ask students with low confidence in mechanics and low confidence with technology to complete a first lesson without help. Record where they hesitate, choose the wrong control, or cannot interpret the diagram.

## Example acceptance checks for a beginner lesson

A beginner lesson should be considered ready for classroom use when a first-time student can:

- Find the correct course and lesson without being told which link to click.
- Explain what Play, Pause, Next step, Show answer, and Reset do.
- Identify the forces on the particle from the diagram.
- Explain why a tension acts along the string and why the string pulls.
- Determine which component uses sine or cosine from the marked angle.
- Explain in words what the two equilibrium equations mean.
- Complete a similar problem with hints but without seeing the full answer first.
- Recover from an impossible setup and reset it without losing their place.
- Use the activity on a small screen or with a keyboard, without needing precise slider control.

These checks are proposed review criteria, not results of student testing.

## Limitations

- The live walkthrough focused on the hub and the strings-and-rings simulation. I did not complete a page-by-page audit of every simulation.
- I did not conduct interviews or usability tests with actual teachers or students; the personas are analytical viewpoints based on the requested audiences.
- I did not independently verify each past-paper question, mark scheme, or syllabus mapping against Cambridge source documents. The report cites the repository’s own validation evidence as reported.
- Device, browser, accessibility, and offline recommendations should be confirmed through hands-on testing before being treated as measured defects.

## Conclusion

The project has unusually rich ingredients for an independent learning resource: visual models, adjustable values, worked calculations, exam setups, and extensive question data. The next improvement should focus on making the first experience understandable and operable for a novice, including students who are not confident with technology. A guided, low-control lesson with clear instructions and progressive reveal can make the existing technical depth teachable; the full simulation then becomes a powerful second step for exploration and exam transfer.

