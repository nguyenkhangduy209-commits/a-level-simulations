/* Grouped simulations: related sims become modes (tabs) of one simulation, opened via group.html?g=<id>&m=<mode>. */
window.SIM_GROUPS = [
  /* ---------------- 9709 Paper 4 Mechanics ---------------- */
  { id: 'forces', course: '9709', title: 'Forces and equilibrium', topics: ['9709-M1'],
    summary: 'Resultants of coplanar forces, particles held by strings or rings, friction and limiting equilibrium.',
    modes: [
      { id: 'resultant', label: 'Resultant of forces', path: 'sims/9709/m1-resultant.html' },
      { id: 'strings', label: 'Strings and rings', path: 'sims/9709/m1-strings.html' },
      { id: 'friction', label: 'Friction on a slope or floor', path: 'sims/9709/m1m4-plane.html' } ] },
  { id: 'kinematics', course: '9709', title: 'Straight-line motion', topics: ['9709-M2'],
    summary: 'Multi-stage journeys and v–t graphs, vertical motion under gravity, variable acceleration with calculus.',
    modes: [
      { id: 'journey', label: 'Journeys and v–t graphs', path: 'sims/9709/m2-journey.html' },
      { id: 'vertical', label: 'Vertical motion', path: 'sims/9709/m2-vertical.html' },
      { id: 'calculus', label: 'Variable acceleration (calculus)', path: 'sims/9709/m2-calculus.html' } ] },
  { id: 'newton', course: '9709', title: 'Slopes, pulleys and lifts', topics: ['9709-M4'],
    summary: 'F = ma on rough and smooth slopes, connected particles over pulleys, lifts.',
    modes: [
      { id: 'slope', label: 'Particle on a slope or floor', path: 'sims/9709/m1m4-plane.html' },
      { id: 'pulley', label: 'Pulleys and connected particles', path: 'sims/9709/m4-connected.html' },
      { id: 'lift', label: 'Lift', path: 'sims/9709/m4-lift.html' } ] },
  { id: 'power', course: '9709', title: 'Vehicles, towing and power', topics: ['9709-M5', '9709-M4'],
    summary: 'Car and trailer (tension or thrust), driving force from P = Fv, maximum speed, hills, work done by an engine and average power.',
    modes: [
      { id: 'vehicle', label: 'Car, trailer and P = Fv', path: 'sims/9709/m4-vehicle.html' },
      { id: 'work-power', label: 'Engine work and average power', path: 'sims/9709/m5-energy.html', preset: 7 } ] },
  { id: 'energy', course: '9709', title: 'Work and energy', topics: ['9709-M5'],
    summary: 'Work done by a force, kinetic and potential energy, the work–energy principle on slopes and curved paths.',
    modes: [ { id: 'work', label: 'Work–energy principle', path: 'sims/9709/m5-energy.html' } ] },
  { id: 'momentum', course: '9709', title: 'Momentum and collisions', topics: ['9709-M3'],
    summary: 'Direct impact in a straight line, coalescence, loss of kinetic energy, collision chains, collisions in mid-air.',
    modes: [
      { id: 'collisions', label: 'Collisions on a line', path: 'sims/9709/m3-collisions.html' },
      { id: 'midair', label: 'Collision in mid-air', path: 'sims/9709/m2-vertical.html', preset: 2 } ] },

  /* ---------------- 9702 AS Physics ---------------- */
  { id: 'uncertainty', course: '9702', title: 'Errors and uncertainties', topics: ['9702-1'],
    summary: 'Accuracy and precision, systematic, random and zero errors, combining uncertainties, and an experiment to measure g.',
    modes: [
      { id: 'errors', label: 'Errors and combining uncertainties', path: 'sims/9702/p1-uncertainty.html' },
      { id: 'experiment', label: 'Experiment: measuring g', path: 'sims/9702/p2-freefall-exp.html' } ] },
  { id: 'kinematics2d', course: '9702', title: 'Kinematics in 1-D and 2-D', topics: ['9702-2', '9702-1'],
    summary: 'Projectiles, vector addition and relative velocity, motion graphs, free fall and bouncing.',
    modes: [
      { id: 'projectile', label: 'Projectiles', path: 'sims/9702/p2-projectile.html' },
      { id: 'vectors', label: 'Vectors and relative velocity', path: 'sims/9702/p1-vectors.html' },
      { id: 'graphs', label: 'Motion graphs and bouncing', path: 'sims/9702/p2-motion-graphs.html' },
      { id: 'measure-g', label: 'Experiment: measuring g', path: 'sims/9702/p2-freefall-exp.html' } ] },
  { id: 'dynamics', course: '9702', title: 'Dynamics and momentum', topics: ['9702-3'],
    summary: 'Newton’s laws, momentum in 1-D and 2-D, F = Δp/Δt, drag and terminal velocity, weight in a lift.',
    modes: [
      { id: 'collisions', label: 'Collisions in 1-D', path: 'sims/9702/p3-momentum.html' },
      { id: 'collisions2d', label: 'Collisions and explosions in 2-D', path: 'sims/9702/p3-momentum-2d.html' },
      { id: 'drag', label: 'Drag and terminal velocity', path: 'sims/9702/p3-drag.html' },
      { id: 'lift', label: 'Lift: weight and F = ma', path: 'sims/9709/m4-lift.html?course=9702' } ] },
  { id: 'forces-p', course: '9702', title: 'Forces, moments and pressure', topics: ['9702-4'],
    summary: 'Moments, couples and equilibrium, the triangle of forces, density, pressure and upthrust.',
    modes: [
      { id: 'moments', label: 'Moments and equilibrium', path: 'sims/9702/p4-moments.html' },
      { id: 'triangle', label: 'Triangle of forces', path: 'sims/9709/m1-strings.html?course=9702' },
      { id: 'pressure', label: 'Pressure and upthrust', path: 'sims/9702/p4-pressure.html' } ] },
  { id: 'energy-p', course: '9702', title: 'Work, energy and power', topics: ['9702-5'],
    summary: 'Work done, energy conservation with resistive forces, efficiency, power P = W/t and P = Fv.',
    modes: [
      { id: 'energy', label: 'Work, energy and efficiency', path: 'sims/9702/p5-energy.html' },
      { id: 'vehicle', label: 'Power and vehicles, P = Fv', path: 'sims/9709/m4-vehicle.html?course=9702' } ] },
  { id: 'deformation', course: '9702', title: 'Deformation of solids', topics: ['9702-6'],
    summary: 'Hooke’s law, elastic and plastic behaviour, elastic potential energy, stress, strain and the Young modulus.',
    modes: [ { id: 'deformation', label: 'Springs and wires', path: 'sims/9702/p6-deformation.html' } ] },
  { id: 'waves', course: '9702', title: 'Waves', topics: ['9702-7'],
    summary: 'Progressive waves, phase difference, intensity, the CRO, the Doppler effect, the EM spectrum and polarisation.',
    modes: [
      { id: 'progressive', label: 'Progressive waves', path: 'sims/9702/p7-waves.html' },
      { id: 'cro', label: 'Oscilloscope (CRO)', path: 'sims/9702/p7-cro.html' },
      { id: 'doppler', label: 'Doppler effect', path: 'sims/9702/p7-doppler.html' },
      { id: 'em', label: 'EM spectrum and polarisation', path: 'sims/9702/p7-em-polarisation.html' } ] },
  { id: 'superposition', course: '9702', title: 'Superposition', topics: ['9702-8'],
    summary: 'Stationary waves, two-source interference, diffraction and the diffraction grating.',
    modes: [
      { id: 'stationary', label: 'Stationary waves', path: 'sims/9702/p8-stationary.html' },
      { id: 'interference', label: 'Interference and diffraction', path: 'sims/9702/p8-interference.html' },
      { id: 'grating', label: 'Diffraction grating', path: 'sims/9702/p8-grating.html' } ] },
  { id: 'electricity', course: '9702', title: 'Electricity and D.C. circuits', topics: ['9702-9', '9702-10'],
    summary: 'Current, p.d., resistance and resistivity, I–V characteristics, e.m.f. and internal resistance, Kirchhoff’s laws, potential dividers.',
    modes: [
      { id: 'builder', label: 'Build a circuit', path: 'sims/9702/p10-builder.html' },
      { id: 'current', label: 'Current, p.d. and resistivity', path: 'sims/9702/p9-current.html' },
      { id: 'iv', label: 'I–V characteristics', path: 'sims/9702/p9-iv.html' },
      { id: 'emf', label: 'E.m.f. and internal resistance', path: 'sims/9702/p10-emf.html' },
      { id: 'circuits', label: 'Kirchhoff’s laws and networks', path: 'sims/9702/p10-circuits.html' },
      { id: 'divider', label: 'Potential dividers', path: 'sims/9702/p10-divider.html' } ] },
  { id: 'particles', course: '9702', title: 'Particle physics', topics: ['9702-11'],
    summary: 'α-particle scattering, nuclide notation and decay equations, fundamental particles and quarks.',
    modes: [
      { id: 'alpha', label: 'α-particle scattering', path: 'sims/9702/p11-alpha.html' },
      { id: 'nuclear', label: 'Decay, particles and quarks', path: 'sims/9702/p11-nuclear.html' } ] }
];
/** find the group + mode that shows a given sim path (first match) */
window.SIM_GROUP_FOR = function (path) {
  var bare = function (p) { return p; };
  for (var i = 0; i < window.SIM_GROUPS.length; i++) {
    var g = window.SIM_GROUPS[i];
    for (var j = 0; j < g.modes.length; j++) if (bare(g.modes[j].path) === bare(path)) return { g: g, m: g.modes[j] };
  }
  return null;
};
