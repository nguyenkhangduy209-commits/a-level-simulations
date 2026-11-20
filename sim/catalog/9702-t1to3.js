/* 9702 AS topics 1–3 (2025–27 numbering): question types → page + preset index (hub deep-links with ?preset=N). */
(window.SIM_CATALOG = window.SIM_CATALOG || []).push(
  {
    id: 'p1-uncertainty', course: '9702', path: 'sims/9702/p1-uncertainty.html',
    title: 'Errors and uncertainties: accuracy, precision, combining uncertainties',
    tags: ['9702-1'],
    summary: 'Target and number-line views of systematic, random and zero errors; precise vs accurate. Uncertainty in a derived quantity: sum/difference and product/quotient/power, with Cambridge rounding.',
    questionTypes: [
      { topic: '9702-1', text: 'Precise but not accurate (or accurate but not precise) results', preset: 0 },
      { topic: '9702-1', text: 'Zero error: a systematic error and how to correct it', preset: 3 },
      { topic: '9702-1', text: 'Percentage uncertainty in a product or quotient (R = V/I)', preset: 5 },
      { topic: '9702-1', text: 'Uncertainty in a density from mass and length cubed', preset: 6 },
      { topic: '9702-1', text: 'Uncertainty with a power and an exact constant (a = v²/2s, g = 4π²L/T²)', preset: 7 },
      { topic: '9702-1', text: 'Absolute uncertainty in a sum or difference', preset: 10 }
    ]
  },
  {
    id: 'p1-vectors', course: '9702', path: 'sims/9702/p1-vectors.html',
    title: 'Scalars and vectors: add, subtract and resolve coplanar vectors',
    tags: ['9702-1'],
    summary: 'Tip-to-tail triangle and parallelogram, components, A − B and Δv = v₂ − v₁, resolving along tilted axes, boat/river and plane/wind presets with an aim solver.',
    questionTypes: [
      { topic: '9702-1', text: 'Resultant of two vectors (magnitude and direction)', preset: 6 },
      { topic: '9702-1', text: 'Boat crossing a river / plane in a wind', preset: 0 },
      { topic: '9702-1', text: 'Heading needed to travel in a given direction', preset: 1 },
      { topic: '9702-1', text: 'Change in velocity Δv = v₂ − v₁ (rebound, change of direction)', preset: 5 },
      { topic: '9702-1', text: 'Represent a vector as two perpendicular components', preset: 8 },
      { topic: '9702-1', text: 'Components along and perpendicular to a slope', preset: 9 }
    ]
  },
  {
    id: 'p2-motion-graphs', course: '9702', path: 'sims/9702/p2-motion-graphs.html',
    title: 'Motion graphs: displacement, velocity and acceleration against time',
    tags: ['9702-2'],
    summary: 'Stages of constant acceleration or a bouncing ball (given rebound fraction). s–t, v–t, a–t (plus distance and speed), tangent and chord gradients, area between two times, suvat derived from the v–t graph.',
    questionTypes: [
      { topic: '9702-2', text: 'Multi-stage journey: distance from the area under v–t, average speed', preset: 0 },
      { topic: '9702-2', text: 'suvat: braking distance, deceleration', preset: 1 },
      { topic: '9702-2', text: 'Free fall without air resistance: time to fall a height', preset: 4 },
      { topic: '9702-2', text: 'Vertical throw: velocity reverses, displacement vs distance', preset: 2 },
      { topic: '9702-2', text: 'Bouncing ball: v–t and s–t graphs with sign convention', preset: 7 },
      { topic: '9702-2', text: 'Derive the equations of uniformly accelerated motion from a v–t graph', preset: 3 },
      { topic: '9702-3', text: 'Extra constant force on a falling body: new acceleration and velocity', preset: 5 }
    ]
  },
  {
    id: 'p2-freefall-exp', course: '9702', path: 'sims/9702/p2-freefall-exp.html',
    title: 'Experiment: determining the acceleration of free fall',
    tags: ['9702-2', '9702-1'],
    summary: 'Trapdoor timer or light gate and card. Simulated readings with random and systematic errors; h against t² (gradient g/2), t against √h (intercept = delay), v² against h (gradient 2g).',
    questionTypes: [
      { topic: '9702-2', text: 'Describe an experiment to determine g using a falling object', preset: 0 },
      { topic: '9702-2', text: 'Gradient of h against t² gives g/2', preset: 0 },
      { topic: '9702-1', text: 'Systematic error shows as an intercept (timer delay, h measured wrongly)', preset: 1 },
      { topic: '9702-1', text: 'Random error from hand timing; repeats and averages', preset: 3 },
      { topic: '9702-2', text: 'Light gate method: v = L/Δt, v² against h', preset: 4 }
    ]
  },
  {
    id: 'p3-momentum', course: '9702', path: 'sims/9702/p3-momentum.html',
    title: 'Momentum: collisions, Newton’s third law and F = Δp/Δt',
    tags: ['9702-3'],
    summary: 'Elastic, sticking and given-velocity collisions in one dimension; approach = separation; KE change; force–time graph whose area is Δp; third-law pair; rebound from a wall; rate of mass ejection.',
    questionTypes: [
      { topic: '9702-3', text: 'Elastic collision: final velocities, relative speed of approach = separation', preset: 0 },
      { topic: '9702-3', text: 'Collision with one final velocity given; KE lost; contact force from Δp/Δt', preset: 2 },
      { topic: '9702-3', text: 'Bodies stick together: common velocity, ratio of KE', preset: 3 },
      { topic: '9702-3', text: 'Acceleration of a trolley during a collision from a v–t graph', preset: 1 },
      { topic: '9702-3', text: 'Newton’s third law pair during a collision', preset: 2 },
      { topic: '9702-3', text: 'Rebound from a wall: change in momentum and average force', preset: 7 },
      { topic: '9702-3', text: 'Force from mass ejected per second (rocket)', preset: 9 }
    ]
  },
  {
    id: 'p3-momentum-2d', course: '9702', path: 'sims/9702/p3-momentum-2d.html',
    title: 'Collisions and explosions in two dimensions',
    tags: ['9702-3', '9702-1'],
    summary: 'Animated top view of two discs: elastic (smooth discs, impact parameter) or sticking, plus exam solvers and explosions. Trails, strobe dots, centre of mass moving uniformly, live momentum vector diagram and KE bars.',
    questionTypes: [
      { topic: '9702-3', text: 'Elastic collision in 2-D: KE conserved, equal masses leave at 90°', preset: 1 },
      { topic: '9702-3', text: 'Bodies stick together after moving at right angles: common velocity, KE lost', preset: 3 },
      { topic: '9702-3', text: 'Oblique collision: one final velocity given, find the other', preset: 5 },
      { topic: '9702-3', text: 'Both final directions given: find both speeds', preset: 6 },
      { topic: '9702-3', text: 'Explosion from rest into three fragments', preset: 7 }
    ]
  },
  {
    id: 'p3-drag', course: '9702', path: 'sims/9702/p3-drag.html',
    title: 'Drag, air resistance and terminal velocity',
    tags: ['9702-3'],
    summary: 'Qualitative: drag increases with speed, terminal velocity when W = U + D, parachute opening. Exact F = ma at an instant from given forces. Drag law is an illustrative model only.',
    questionTypes: [
      { topic: '9702-3', text: 'Describe and explain the motion of a falling object reaching terminal velocity', preset: 0 },
      { topic: '9702-3', text: 'Skydiver opens a parachute: acceleration at that instant, variation afterwards', preset: 1 },
      { topic: '9702-3', text: 'Acceleration from weight, upthrust and drag at an instant', preset: 2 },
      { topic: '9702-3', text: 'Resistive force from a given acceleration', preset: 3 },
      { topic: '9702-3', text: 'Sphere falling through a liquid at terminal velocity (W = U + D)', preset: 4 }
    ]
  }
);
