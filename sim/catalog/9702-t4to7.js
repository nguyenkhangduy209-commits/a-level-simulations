/* 9702 AS topics 4–7 (2025–27 numbering). preset = index into the page's preset list (?preset=N). */
(function (C) {
  C.push({
    id: 'p4-moments', course: '9702', path: 'sims/9702/p4-moments.html',
    title: 'Moments, beams, centre of gravity and couples',
    tags: ['9702-4'],
    summary: 'Beam on a pivot/hinge or two supports with up to three forces at any angle, beam weight at its centre of gravity; solve for an unknown force, position, weight or centre of gravity; moments about any point; force polygon; couples.',
    questionTypes: [
      { topic: '9702-4', text: 'Principle of moments: unknown force on a balanced beam (see-saw)', preset: 2 },
      { topic: '9702-4', text: 'Beam on two supports: find both reactions', preset: 0 },
      { topic: '9702-4', text: 'Plank on two supports: on the point of tipping (one reaction zero)', preset: 1 },
      { topic: '9702-4', text: 'Hinged shelf/beam held by a wire or string at an angle: tension and hinge force', preset: 3 },
      { topic: '9702-4', text: 'Hinged beam with several forces: find the weight of the beam by moments', preset: 4 },
      { topic: '9702-4', text: 'Centre of gravity of a non-uniform rod from balance', preset: 5 },
      { topic: '9702-4', text: 'Moment of a force at an angle: perpendicular distance', preset: 6 },
      { topic: '9702-4', text: 'Torque of a couple (F × perpendicular separation), independent of the point', preset: 7 },
      { topic: '9702-4', text: 'Couple with forces not perpendicular to the bar', preset: 8 }
    ]
  });
  C.push({
    id: 'p4-pressure', course: '9702', path: 'sims/9702/p4-pressure.html',
    title: 'Density, hydrostatic pressure and upthrust',
    tags: ['9702-4'],
    summary: 'Cuboid in a fluid: pressures on the top and bottom faces, upthrust from the pressure difference = ρgV, spring-balance reading, floating fraction, sinking; Δp = ρgΔh probe and derivation.',
    questionTypes: [
      { topic: '9702-4', text: 'Δp = ρgΔh: pressure at a depth in a liquid', preset: 1 },
      { topic: '9702-4', text: 'Derive Δp = ρgΔh from p = F/A and ρ = m/V', preset: 1 },
      { topic: '9702-4', text: 'Upthrust explained by the pressure difference between top and bottom faces', preset: 2 },
      { topic: '9702-4', text: 'Upthrust F = ρgV and apparent weight on a spring balance', preset: 0 },
      { topic: '9702-4', text: 'Upthrust on a fully submerged person/object; resultant force when released', preset: 5 },
      { topic: '9702-4', text: 'Floating object: fraction submerged, upthrust = weight', preset: 3 },
      { topic: '9702-4', text: 'Density = mass/volume; dense liquid (mercury) pressure', preset: 6 },
      { topic: '9702-4', text: 'Object held under the surface by a string (U > W)', preset: 8 }
    ]
  });
  C.push({
    id: 'p5-energy', course: '9702', path: 'sims/9702/p5-energy.html',
    title: 'Work, energy conservation, efficiency and power',
    tags: ['9702-5'],
    summary: 'Object on a slope with constant resistive and driving forces: work done by each force, KE/GPE/thermal energy bars, stopping distance; motor efficiency and P = W/t; vehicle P = Fv with maximum speed; derivations of mgΔh, ½mv² and P = Fv.',
    questionTypes: [
      { topic: '9702-5', text: 'Work done = force × displacement in the direction of the force', preset: 4 },
      { topic: '9702-5', text: 'Conservation of energy with work done against resistance (slope)', preset: 0 },
      { topic: '9702-5', text: 'Falling object: mgh = ½mv²', preset: 1 },
      { topic: '9702-5', text: 'Projected up a slope: distance travelled before stopping', preset: 2 },
      { topic: '9702-5', text: 'Efficiency of a motor lifting a load', preset: 5 },
      { topic: '9702-5', text: 'Power P = W/t and input power from efficiency', preset: 6 },
      { topic: '9702-5', text: 'P = Fv at constant speed (driving force = resistance)', preset: 7 },
      { topic: '9702-5', text: 'Acceleration at a given speed from power; maximum speed (level and uphill)', preset: 8 },
      { topic: '9702-5', text: 'Derive ΔE_P = mgΔh and E_K = ½mv²', preset: 0 }
    ]
  });
  C.push({
    id: 'p6-deformation', course: '9702', path: 'sims/9702/p6-deformation.html',
    title: 'Deformation of solids: Hooke’s law, elastic energy, Young modulus',
    tags: ['9702-6'],
    summary: 'Spring/sample force–extension with limit of proportionality and elastic limit, loading and unloading, permanent extension, work done as area, E_P = ½Fx; wire stress, strain, Young modulus and its experimental uncertainty.',
    questionTypes: [
      { topic: '9702-6', text: 'Hooke’s law F = kx and spring constant', preset: 0 },
      { topic: '9702-6', text: 'Elastic potential energy ½Fx = ½kx² (area under the graph)', preset: 1 },
      { topic: '9702-6', text: 'Compression of a spring from the energy stored', preset: 2 },
      { topic: '9702-6', text: 'Limit of proportionality vs elastic limit', preset: 3 },
      { topic: '9702-6', text: 'Plastic deformation: permanent extension after unloading; work done as area', preset: 4 },
      { topic: '9702-6', text: 'Stress, strain and Young modulus of a wire', preset: 5 },
      { topic: '9702-6', text: 'Extension of a wire from its Young modulus', preset: 6 },
      { topic: '9702-6', text: 'Experiment to find the Young modulus; percentage uncertainty (d counted twice)', preset: 7 }
    ]
  });
  C.push({
    id: 'p7-waves', course: '9702', path: 'sims/9702/p7-waves.html',
    title: 'Progressive waves: transverse and longitudinal, phase, v = fλ, intensity',
    tags: ['9702-7'],
    summary: 'Animated transverse and longitudinal waves with two probe points; y–x snapshot and y–t graphs; phase difference 360°Δx/λ; compressions and rarefactions; v = fλ; intensity = P/area and I ∝ A².',
    questionTypes: [
      { topic: '9702-7', text: 'Wave equation v = fλ (and its derivation)', preset: 0 },
      { topic: '9702-7', text: 'Phase difference between two points on a wave', preset: 1 },
      { topic: '9702-7', text: 'Points in antiphase / in phase', preset: 2 },
      { topic: '9702-7', text: 'Longitudinal wave: compressions and rarefactions on a displacement graph', preset: 3 },
      { topic: '9702-7', text: 'Compare transverse and longitudinal waves', preset: 4 },
      { topic: '9702-7', text: 'Ripple tank: wavelength from wavefront spacing', preset: 5 },
      { topic: '9702-7', text: 'Intensity ∝ amplitude²', preset: 6 },
      { topic: '9702-7', text: 'Intensity = power/area (source spreading uniformly)', preset: 7 }
    ]
  });
  C.push({
    id: 'p7-cro', course: '9702', path: 'sims/9702/p7-cro.html',
    title: 'Cathode-ray oscilloscope: time-base and y-gain',
    tags: ['9702-7'],
    summary: '10 × 8 division screen; period from divisions × time-base, amplitude from divisions × y-gain, two traces with a phase difference, wavelength from v/f; warnings for poor settings.',
    questionTypes: [
      { topic: '9702-7', text: 'Frequency from a CRO trace and time-base setting', preset: 1 },
      { topic: '9702-7', text: 'Find the time-base setting from a known frequency', preset: 0 },
      { topic: '9702-7', text: 'Amplitude from the y-gain', preset: 1 },
      { topic: '9702-7', text: 'Wavelength of sound from a CRO trace', preset: 2 },
      { topic: '9702-7', text: 'Phase difference between two traces', preset: 3 },
      { topic: '9702-7', text: 'Choosing suitable time-base / y-gain settings', preset: 5 }
    ]
  });
  C.push({
    id: 'p7-doppler', course: '9702', path: 'sims/9702/p7-doppler.html',
    title: 'Doppler effect: moving source, stationary observer',
    tags: ['9702-7'],
    summary: 'Animated wavefronts from a moving source; observed frequency ahead and behind, f_o = f_s v/(v ± v_s); changed wavelength, unchanged speed; source speed from an observed frequency; step in pitch as the source passes.',
    questionTypes: [
      { topic: '9702-7', text: 'Observed frequency for an approaching and a receding source', preset: 0 },
      { topic: '9702-7', text: 'Speed and direction of a source from the observed frequency', preset: 1 },
      { topic: '9702-7', text: 'Change in pitch as a source passes an observer', preset: 2 },
      { topic: '9702-7', text: 'Receding source: lower frequency, longer wavelength', preset: 3 }
    ]
  });
  C.push({
    id: 'p7-em-polarisation', course: '9702', path: 'sims/9702/p7-em-polarisation.html',
    title: 'Electromagnetic spectrum and polarisation (Malus’s law)',
    tags: ['9702-7'],
    summary: 'Log-scale EM spectrum with approximate region ranges, visible 400–700 nm and f = c/λ; plane-polarised beam through up to three filters with I = I₀cos²θ, and the angle needed for a given intensity.',
    questionTypes: [
      { topic: '9702-7', text: 'Malus’s law through one polarising filter', preset: 0 },
      { topic: '9702-7', text: 'Series of polarising filters', preset: 1 },
      { topic: '9702-7', text: 'Find the filter angle for a given transmitted intensity', preset: 2 },
      { topic: '9702-7', text: 'Variation of intensity as a filter is rotated through 360°', preset: 4 },
      { topic: '9702-7', text: 'EM spectrum: wavelength ranges, visible 400–700 nm, f = c/λ', preset: 5 },
      { topic: '9702-7', text: 'Identify the region from a wavelength (microwaves, X-rays)', preset: 6 }
    ]
  });
})(window.SIM_CATALOG = window.SIM_CATALOG || []);
