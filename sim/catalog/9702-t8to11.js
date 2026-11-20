/* 9702 AS topics 8–11 (2025–27 numbering). preset = index into the page's preset list (?preset=N). */
(window.SIM_CATALOG = window.SIM_CATALOG || []).push(
  {
    id: 'p8-stationary', course: '9702', path: 'sims/9702/p8-stationary.html',
    title: 'Stationary waves: strings, air columns and microwaves',
    tags: ['9702-8'],
    summary: 'Nodes and antinodes on a string, in open and closed pipes and with a microwave reflector. Superposition of two travelling waves, λ/2 node spacing, odd harmonics only in a closed pipe, phase of points.',
    questionTypes: [
      { topic: '9702-8', text: 'String fixed at both ends: wavelength and frequency from the number of loops', preset: 1 },
      { topic: '9702-8', text: 'Air column closed at one end: fundamental frequency (no end correction)', preset: 5 },
      { topic: '9702-8', text: 'Next resonance of a closed pipe (odd harmonics only)', preset: 3 },
      { topic: '9702-8', text: 'Pipe open at both ends', preset: 4 },
      { topic: '9702-8', text: 'Microwaves and a metal reflector: wavelength from the node spacing', preset: 6 },
      { topic: '9702-8', text: 'Explain formation of a stationary wave by superposition; phase and amplitude of points', preset: 7 }
    ]
  },
  {
    id: 'p8-interference', course: '9702', path: 'sims/9702/p8-interference.html',
    title: 'Two-source interference and single-gap diffraction',
    tags: ['9702-8'],
    summary: 'Double slit, microwaves, loudspeakers and ripple tank: path difference, coherence, phase of sources, λ = ax/D with exact-geometry check; single-gap diffraction as a qualitative ripple-tank picture.',
    questionTypes: [
      { topic: '9702-8', text: 'Double-slit: use λ = ax/D (fringe separation, slit separation, distance D)', preset: 0 },
      { topic: '9702-8', text: 'Counting fringes: separation from n dark/bright fringes, then D or λ', preset: 1 },
      { topic: '9702-8', text: 'Two loudspeakers / microwave slits: path difference and loud/quiet points', preset: 3 },
      { topic: '9702-8', text: 'Sources in antiphase', preset: 4 },
      { topic: '9702-8', text: 'Conditions for observable interference: coherence, similar amplitude', preset: 7 },
      { topic: '9702-8', text: 'Diffraction: effect of gap width compared with wavelength (qualitative)', preset: 8 }
    ]
  },
  {
    id: 'p8-grating', course: '9702', path: 'sims/9702/p8-grating.html',
    title: 'Diffraction grating: d sin θ = nλ',
    tags: ['9702-8'],
    summary: 'Angles of the orders, n_max and total number of maxima, finding λ or lines per metre from a measured angle, white-light spectra and overlapping orders, positions on a flat screen.',
    questionTypes: [
      { topic: '9702-8', text: 'Angles of the first and second orders from lines per mm and λ', preset: 0 },
      { topic: '9702-8', text: 'Highest order / total number of bright fringes', preset: 1 },
      { topic: '9702-8', text: 'Lines per metre from the angle between two orders', preset: 2 },
      { topic: '9702-8', text: 'Determine the wavelength of light with a grating', preset: 7 },
      { topic: '9702-8', text: 'Different wavelengths at the same angle in different orders', preset: 3 },
      { topic: '9702-8', text: 'White light: spectra and overlapping orders', preset: 6 }
    ]
  },
  {
    id: 'p9-current', course: '9702', path: 'sims/9702/p9-current.html',
    title: 'Current, charge, p.d., power and resistivity',
    tags: ['9702-9'],
    summary: 'Q = It and quantised charge, drift speed from I = Anvq (thinner section ⇒ faster drift), V = W/Q, P = VI = I²R = V²/R, R = ρL/A with area from diameter.',
    questionTypes: [
      { topic: '9702-9', text: 'Charge passing in a time: Q = It', preset: 3 },
      { topic: '9702-9', text: 'Charge is quantised: is a given charge possible?', preset: 6 },
      { topic: '9702-9', text: 'Drift speed from I = Anvq', preset: 0 },
      { topic: '9702-9', text: 'Drift speed in wires of different cross-section in series', preset: 2 },
      { topic: '9702-9', text: 'Resistance from resistivity: R = ρL/A', preset: 4 },
      { topic: '9702-9', text: 'Energy and power: V = W/Q, P = VI = I²R = V²/R', preset: 1 }
    ]
  },
  {
    id: 'p9-iv', course: '9702', path: 'sims/9702/p9-iv.html',
    title: 'I–V characteristics, thermistor and LDR',
    tags: ['9702-9'],
    summary: 'Metallic conductor, filament lamp, diode, NTC thermistor and LDR (illustrative curves). Resistance as V/I at a point versus the tangent gradient; Ohm’s law.',
    questionTypes: [
      { topic: '9702-9', text: 'Resistance from an I–V graph at a point (V/I, not the gradient)', preset: 1 },
      { topic: '9702-9', text: 'Sketch I–V characteristics: metal, filament lamp, diode', preset: 3 },
      { topic: '9702-9', text: 'Why the filament lamp’s resistance increases', preset: 2 },
      { topic: '9702-9', text: 'Thermistor resistance falls as temperature rises', preset: 6 },
      { topic: '9702-9', text: 'LDR resistance falls as light intensity rises', preset: 8 }
    ]
  },
  {
    id: 'p10-emf', course: '9702', path: 'sims/9702/p10-emf.html',
    title: 'E.m.f., internal resistance and terminal p.d.',
    tags: ['9702-10', '9702-9'],
    summary: 'I = E/(R + r), terminal p.d. V = E − Ir, lost volts, power in load and cell, V–I graph (gradient −r, intercept E), finding E and r from two readings.',
    questionTypes: [
      { topic: '9702-10', text: 'Terminal p.d. and lost volts: find I, r or R', preset: 1 },
      { topic: '9702-10', text: 'Internal resistance from e.m.f. and terminal p.d.', preset: 2 },
      { topic: '9702-10', text: 'E.m.f. versus p.d.; open-circuit reading', preset: 3 },
      { topic: '9702-10', text: 'V–I graph for a cell / E and r from readings', preset: 6 },
      { topic: '9702-9', text: 'Power dissipated in the load and in the internal resistance', preset: 0 }
    ]
  },
  {
    id: 'p10-circuits', course: '9702', path: 'sims/9702/p10-circuits.html',
    title: 'Kirchhoff’s laws: series, parallel and two-cell circuits',
    tags: ['9702-10'],
    summary: 'Nodal solver for template networks with circuit diagram, current arrows and node potentials; junction and loop sums; series/parallel formulae; two cells (one being charged); voltmeter loading.',
    questionTypes: [
      { topic: '9702-10', text: 'Series and parallel combined resistance', preset: 1 },
      { topic: '9702-10', text: 'Mixed series–parallel network: currents and p.d.s', preset: 2 },
      { topic: '9702-10', text: 'Kirchhoff’s first law at a junction; unknown resistor in a branch', preset: 3 },
      { topic: '9702-10', text: 'Kirchhoff’s second law with two e.m.f.s', preset: 4 },
      { topic: '9702-10', text: 'Effect of a voltmeter of finite resistance', preset: 6 },
      { topic: '9702-10', text: 'Derive R = R₁ + R₂ with Kirchhoff’s laws; cell with internal resistance', preset: 7 }
    ]
  },
  {
    id: 'p10-divider', course: '9702', path: 'sims/9702/p10-divider.html',
    title: 'Potential divider, sensors and the potentiometer',
    tags: ['9702-10'],
    summary: 'V_out = V_in R₂/(R₁ + R₂), loading, thermistor and LDR sensors; potentiometer with galvanometer current at any jockey position, balance length, comparing e.m.f.s, driver internal resistance.',
    questionTypes: [
      { topic: '9702-10', text: 'Output of a potential divider', preset: 0 },
      { topic: '9702-10', text: 'Effect of connecting a load across the output', preset: 1 },
      { topic: '9702-10', text: 'Thermistor / LDR in a divider: how V_out changes', preset: 3 },
      { topic: '9702-10', text: 'Potentiometer: compare e.m.f.s from balance lengths', preset: 5 },
      { topic: '9702-10', text: 'Potentiometer null method: e.m.f. from balance length; effect of driver internal resistance', preset: 6 }
    ]
  },
  {
    id: 'p11-alpha', course: '9702', path: 'sims/9702/p11-alpha.html',
    title: 'α-particle scattering and the nuclear atom',
    tags: ['9702-11'],
    summary: 'Qualitative α-scattering paths in scaled units, deflection distribution, effect of energy and nuclear charge, comparison with charge spread through the atom.',
    questionTypes: [
      { topic: '9702-11', text: 'Results of α-scattering and what they show about the nucleus', preset: 0 },
      { topic: '9702-11', text: 'Why most α-particles pass straight through', preset: 3 },
      { topic: '9702-11', text: 'Why a spread-out positive charge cannot explain large deflections', preset: 4 }
    ]
  },
  {
    id: 'p11-nuclear', course: '9702', path: 'sims/9702/p11-nuclear.html',
    title: 'Nuclides, radioactive decay equations and quarks',
    tags: ['9702-11'],
    summary: 'Nuclide notation, isotopes, α/β⁻/β⁺/γ decay equations with nucleon-number and charge checks, (anti)neutrinos, discrete vs continuous energies, unified atomic mass unit, quark charges, baryons and mesons, quark change in β decay.',
    questionTypes: [
      { topic: '9702-11', text: 'Nuclide notation from numbers of protons and neutrons', preset: 2 },
      { topic: '9702-11', text: 'Complete an α-decay equation', preset: 4 },
      { topic: '9702-11', text: 'Complete a β⁻ decay equation; identify the antineutrino', preset: 3 },
      { topic: '9702-11', text: 'β⁺ decay and the neutrino', preset: 6 },
      { topic: '9702-11', text: 'Continuous β energy spectrum versus discrete α energies', preset: 2 },
      { topic: '9702-11', text: 'Quark composition of nuclei, protons, neutrons and antiparticles', preset: 5 },
      { topic: '9702-11', text: 'Quark charges in baryons and mesons', preset: 9 },
      { topic: '9702-11', text: 'Quark change in β⁻ and β⁺ decay', preset: 1 }
    ]
  }
);
