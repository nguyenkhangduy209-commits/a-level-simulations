(window.SIM_CATALOG = window.SIM_CATALOG || []).push({
  id: 'm3-collisions', course: '9709', path: 'sims/9709/m3-collisions.html',
  title: 'Direct impact: momentum, coalescence and KE loss',
  tags: ['9709-M3', '9709-M5'],
  summary: 'Up to three particles and a wall on a smooth line. Each collision outcome is given data (velocity after, brought to rest, coalesce, KE loss). Checks: must approach, no passing through, KE cannot increase.',
  questionTypes: [
    { topic: '9709-M3', text: 'One velocity after the collision given: find the other', preset: 0 },
    { topic: '9709-M3', text: 'Particles coalesce: common velocity', preset: 1 },
    { topic: '9709-M3', text: 'One particle brought to rest by the impact', preset: 3 },
    { topic: '9709-M3', text: 'Collision chain: does a further collision happen? (KE loss given, reject the pass-through root)', preset: 5 },
    { topic: '9709-M3', text: 'Wall rebound with a given speed: position of the second collision', preset: 4 },
    { topic: '9709-M3', text: 'Unknown mass from momentum', preset: 6 },
    { topic: '9709-M3', text: 'Unknown masses (km, k·m) from a stated KE loss', preset: 4 },
    { topic: '9709-M5', text: 'Kinetic energy lost in a collision', preset: 1 }
  ]
}, {
  id: 'm4-connected', course: '9709', path: 'sims/9709/m4-connected.html',
  title: 'Connected particles: strings over smooth pulleys',
  tags: ['9709-M4', '9709-M1', '9709-M2', '9709-M5'],
  summary: 'Atwood, table or incline with a hanging particle, two inclines, incline–table–hanging with two strings, a pair pulled up a slope. Does it move? Tensions (with a last-particle check), statically indeterminate tension, slack strings, floor impacts, string breaks, a mass falling off. Split free-body diagrams: one F = ma per particle.',
  questionTypes: [
    { topic: '9709-M1', text: 'Connected particles at rest: least coefficient of friction', preset: 6 },
    { topic: '9709-M4', text: 'Two particles over a pulley (Atwood): acceleration and tension; hits the floor, greatest height of the other', preset: 0 },
    { topic: '9709-M4', text: 'Particle on a rough table pulled by a hanging particle; motion after it hits the floor', preset: 2 },
    { topic: '9709-M4', text: 'Particle on an incline with a hanging particle: does it move at all?', preset: 3 },
    { topic: '9709-M4', text: 'Two particles on two inclined planes over a pulley', preset: 5 },
    { topic: '9709-M4', text: 'Three particles, two strings (incline – horizontal – hanging); one string breaks', preset: 7 },
    { topic: '9709-M4', text: 'Two particles on one slope pulled by a force; the string breaks', preset: 8 },
    { topic: '9709-M4', text: 'Extra mass attached to a hanging particle falls off', preset: 1 },
    { topic: '9709-M2', text: 'suvat follow-on: time until a particle comes to instantaneous rest after a break', preset: 8 }
  ]
}, {
  id: 'm4-vehicle', course: '9709', path: 'sims/9709/m4-vehicle.html',
  title: 'Vehicle and trailer: driving force, power and hills',
  tags: ['9709-M4', '9709-M5'],
  summary: 'Car (and trailer or coach) with resistances, driving force or power P = Fv, uphill or downhill (angle or sin θ), braking, rope vs rigid tow-bar (tension or thrust), maximum speed, solve for power, hill angle, resistance or speed.',
  questionTypes: [
    { topic: '9709-M4', text: 'Car and trailer: acceleration and tension in the coupling', preset: 0 },
    { topic: '9709-M4', text: 'Engine and coach on an incline (sin θ given), rigid coupling', preset: 1 },
    { topic: '9709-M4', text: 'Braking: thrust in a tow-bar (a rope would go slack)', preset: 7 },
    { topic: '9709-M5', text: 'P = Fv: acceleration at a given speed', preset: 3 },
    { topic: '9709-M5', text: 'Constant speed up a hill at a given power: find the angle', preset: 4 },
    { topic: '9709-M5', text: 'Power needed for a given acceleration', preset: 5 },
    { topic: '9709-M5', text: 'Constant speed against friction at a given power (winch)', preset: 6 },
    { topic: '9709-M5', text: 'Car and trailer driven at constant power', preset: 0 },
    { topic: '9709-M5', text: 'Maximum speed at constant power', preset: 8 }
  ]
}, {
  id: 'm4-vehicle-9702', course: '9702', path: 'sims/9709/m4-vehicle.html?course=9702',
  title: 'Power P = Fv: vehicles, maximum speed and hills (g = 9.81)',
  tags: ['9702-5', '9702-3'],
  summary: 'Driving force D = P ÷ v, resultant force and acceleration, maximum speed when the driving force equals the resistance, power to climb a hill. Same simulation as 9709 with g = 9.81.',
  questionTypes: [
    { topic: '9702-5', text: 'P = Fv: driving force and acceleration at a given speed', preset: 0 },
    { topic: '9702-5', text: 'Maximum speed: driving force = resistance', preset: 1 },
    { topic: '9702-5', text: 'Power needed to climb a hill at constant speed', preset: 2 },
    { topic: '9702-3', text: 'Car towing a trailer: tension in the tow-rope', preset: 3 }
  ]
}, {
  id: 'm4-lift', course: '9709', path: 'sims/9709/m4-lift.html',
  title: 'Lift with a load: cable tension and floor reaction',
  tags: ['9709-M4', '9709-M2'],
  summary: 'Multi-stage lift motion (acceleration, constant speed, rest), T = (M + m)(g + a) and R = m(g + a) with up positive; solve for an unknown mass from a tension; v–t, a–t, T–t and R–t graphs.',
  questionTypes: [
    { topic: '9709-M4', text: 'Lift: cable tension and the force of the floor on a load; unknown load from the tension', preset: 0 },
    { topic: '9709-M4', text: 'Lift slowing down while moving down: the acceleration is upwards', preset: 3 },
    { topic: '9709-M2', text: 'Lift journey from a v–t graph: unknown speed from returning to the start', preset: 1 }
  ]
}, {
  id: 'm4-lift-9702', course: '9702', path: 'sims/9709/m4-lift.html?course=9702',
  title: 'Weight and apparent weight in a lift (g = 9.81)',
  tags: ['9702-3'],
  summary: 'Reaction on a person in an accelerating lift, R = m(g + a); cable tension; free fall. Same simulation as 9709 with g = 9.81.',
  questionTypes: [
    { topic: '9702-3', text: 'Apparent weight in a lift accelerating upwards', preset: 0 },
    { topic: '9702-3', text: 'Apparent weight in a lift accelerating downwards', preset: 1 },
    { topic: '9702-3', text: 'Free fall: apparent weightlessness', preset: 2 }
  ]
}, {
  id: 'm5-energy', course: '9709', path: 'sims/9709/m5-energy.html',
  title: 'Work–energy along a slope or path',
  tags: ['9709-M5', '9709-M1', '9709-M4'],
  summary: 'Energy account that must balance: KE, PE, work by P (W = Fd cos θ), engine work, work against resistance or friction. Solve for v, F, μ, d, resistance work or engine work; stop-and-return on a rough slope with friction on both legs; average power.',
  questionTypes: [
    { topic: '9709-M5', text: 'Work done by a force at an angle; power at constant speed (W ÷ t)', preset: 7 },
    { topic: '9709-M5', text: 'Work–energy on a slope with a force at an angle: find the speed', preset: 1 },
    { topic: '9709-M5', text: 'Work done against resistance from speeds and heights', preset: 0 },
    { topic: '9709-M5', text: 'Find a constant resistance from the speed at the bottom', preset: 4 },
    { topic: '9709-M5', text: 'Find the distance travelled (energy method)', preset: 5 },
    { topic: '9709-M5', text: 'Energy method up a rough slope and back down', preset: 8 },
    { topic: '9709-M5', text: 'Work done by an engine on a hill (kJ)', preset: 2 },
    { topic: '9709-M5', text: 'Work done by a braking force', preset: 6 },
    { topic: '9709-M5', text: 'Curved path: only the vertical drop matters', preset: 9 },
    { topic: '9709-M5', text: 'Average power = work ÷ time', preset: 7 }
  ]
});
