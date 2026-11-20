"""Broad, student-friendly question-type groups for the hub (one or two per syllabus sub-unit).
Each fine type from qtypes.TYPES maps to one group; each group opens a grouped simulation (sim/group.html)."""

# id, name, subject, topic, group.html id, mode id (None = no simulation), member fine types
GROUPS = [
    ('9709-g-forces', 'Resultant and equilibrium of forces', '9709', '9709-M1', 'forces', 'resultant',
     ['9709-resultant', '9709-forces-equilibrium', '9709-strings']),
    ('9709-g-friction', 'Friction and inclined planes', '9709', '9709-M1', 'newton', 'slope',
     ['9709-friction-horizontal', '9709-plane-equilibrium', '9709-plane-motion', '9709-ring-rod', '9709-force-motion']),
    ('9709-g-pulleys', 'Pulleys, connected particles and lifts', '9709', '9709-M4', 'newton', 'pulley',
     ['9709-pulley-hanging', '9709-pulley-table', '9709-pulley-two-planes', '9709-connected-line', '9709-lift']),
    ('9709-g-power', 'Vehicles, towing and power', '9709', '9709-M5', 'power', 'vehicle',
     ['9709-trailer', '9709-vehicle-power', '9709-work-power']),
    ('9709-g-energy', 'Work and energy', '9709', '9709-M5', 'energy', 'work', ['9709-work-energy']),
    ('9709-g-journeys', 'Journeys, v–t graphs and suvat', '9709', '9709-M2', 'kinematics', 'journey',
     ['9709-vt-journey', '9709-two-vehicles', '9709-suvat']),
    ('9709-g-vertical', 'Vertical motion under gravity', '9709', '9709-M2', 'kinematics', 'vertical', ['9709-vertical']),
    ('9709-g-calculus', 'Variable acceleration (calculus)', '9709', '9709-M2', 'kinematics', 'calculus', ['9709-calculus']),
    ('9709-g-collisions', 'Momentum and collisions', '9709', '9709-M3', 'momentum', 'collisions', ['9709-collisions']),
    # 9702 Paper 4 is A Level content: no simulations yet (the sims cover AS topics 1–11)
    ('9702-g-circular', 'Circular motion', '9702', '9702-12', None, None, ['9702-circular', '9702-vertical-circle']),
    ('9702-g-gravity', 'Gravitational fields and orbits', '9702', '9702-13', None, None, ['9702-orbits', '9702-grav-potential']),
    ('9702-g-thermal', 'Temperature, heat capacity and latent heat', '9702', '9702-14', None, None, ['9702-temperature', '9702-heat-capacity']),
    ('9702-g-gases', 'Ideal gases and kinetic theory', '9702', '9702-15', None, None, ['9702-ideal-gas', '9702-kinetic-theory']),
    ('9702-g-thermo', 'First law of thermodynamics', '9702', '9702-16', None, None, ['9702-first-law']),
    ('9702-g-oscillations', 'Oscillations: SHM, damping and resonance', '9702', '9702-17', None, None, ['9702-shm', '9702-damping']),
    ('9702-g-efields', 'Electric fields and charged particles', '9702', '9702-18', None, None, ['9702-electric-field', '9702-charged-particle']),
    ('9702-g-capacitance', 'Capacitance and capacitor discharge', '9702', '9702-19', None, None, ['9702-capacitors', '9702-capacitor-discharge']),
    ('9702-g-magnetic', 'Magnetic forces on wires and charges', '9702', '9702-20', None, None, ['9702-magnetic-force']),
    ('9702-g-induction', 'Electromagnetic induction', '9702', '9702-20', None, None, ['9702-induction']),
    ('9702-g-ac', 'Alternating currents and rectification', '9702', '9702-21', None, None, ['9702-ac']),
    ('9702-g-quantum', 'Photons, photoelectric effect and energy levels', '9702', '9702-22', None, None, ['9702-photoelectric', '9702-energy-levels', '9702-de-broglie']),
    ('9702-g-nuclear', 'Nuclear physics: binding energy and decay', '9702', '9702-23', None, None, ['9702-binding-energy', '9702-decay']),
    ('9702-g-medical', 'Medical imaging', '9702', '9702-24', None, None, ['9702-ultrasound', '9702-xray', '9702-pet', '9702-mri']),
    ('9702-g-astro', 'Astronomy and cosmology', '9702', '9702-25', None, None, ['9702-luminosity', '9702-redshift']),
    ('9702-g-legacy', 'Legacy syllabus (2019–21): electronics and communication', '9702', '9702-LEGACY-electronics', None, None, ['9702-opamp', '9702-communication']),
]
GROUP_OF = {t: g[0] for g in GROUPS for t in g[6]}


def check(type_ids):
    missing = [t for t in type_ids if t not in GROUP_OF]
    if missing:
        raise ValueError('question types without a hub group: %s' % missing)
