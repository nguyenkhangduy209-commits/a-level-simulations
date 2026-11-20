"""Question-type taxonomy and rule-based classifier (stdlib only).

Every part gets one primary question type ('qtype') chosen from the types of
its primary topic tag, plus secondary types ('qtypes') obtained by classifying
the part again under each of its other strong topic tags (score >= 3).
A question's qtype is the part type carrying the most marks.

Text is normalised like tag.norm (lower case, no whitespace).
"""
import re
from tag import norm, own_text, FT

# id, name, subject, topic, sim, description
TYPES = [
    # ---- 9709 M1
    ('9709-resultant', 'Resultant of coplanar forces', '9709', '9709-M1', 'm1-resultant',
     'Find the magnitude and direction of the resultant of forces at a point, or a force that makes a component zero.'),
    ('9709-forces-equilibrium', 'Forces at a point in equilibrium', '9709', '9709-M1', 'm1-resultant',
     'Several coplanar forces acting at a point are in equilibrium; find unknown forces or angles (no strings or planes).'),
    ('9709-strings', 'Particle in equilibrium: strings / ring on a string', '9709', '9709-M1', 'm1-strings',
     'A particle or smooth ring held by strings, ropes or struts; resolve or use Lami to find tensions, masses, angles.'),
    ('9709-friction-horizontal', 'Friction on a horizontal surface', '9709', '9709-M1', 'm1m4-plane',
     'Particle on a rough horizontal floor or table: limiting friction, or motion against friction.'),
    ('9709-plane-equilibrium', 'Inclined plane: equilibrium / limiting friction', '9709', '9709-M1', 'm1m4-plane',
     'Particle at rest or on the point of moving on a rough or smooth incline; find a force, range of P or least mu.'),
    ('9709-plane-motion', 'Motion on an inclined plane', '9709', '9709-M4', 'm1m4-plane',
     "Newton's second law up or down a rough or smooth slope, usually followed by constant-acceleration formulae."),
    ('9709-ring-rod', 'Ring or bead on a rod / wire', '9709', '9709-M1', 'm1m4-plane',
     'A ring or bead threaded on a fixed rough rod or wire, in equilibrium or in motion.'),
    ('9709-force-motion', 'Force and motion in a straight line', '9709', '9709-M4', None,
     "F = ma for a single particle on a level line or moving vertically (not on a plane or with friction)."),
    # ---- 9709 M4 connected / vehicles / lifts
    ('9709-pulley-hanging', 'Pulley: two particles hanging', '9709', '9709-M4', 'm4-connected',
     'Atwood machine: two particles on a string over a fixed pulley, both hanging; string breaks or a particle hits the floor.'),
    ('9709-pulley-table', 'Pulley: particle on table / plane + hanging particle', '9709', '9709-M4', 'm4-connected',
     'One particle on a horizontal table or an inclined plane, connected over a pulley at the edge to a hanging particle.'),
    ('9709-pulley-two-planes', 'Pulley: two inclined planes / three particles', '9709', '9709-M4', 'm4-connected',
     'Particles on two faces of a wedge connected over a pulley at the top, or three particles with two strings.'),
    ('9709-connected-line', 'Connected particles in a line (no pulley)', '9709', '9709-M4', 'm4-connected',
     'Two particles joined by a string or rod and pulled along a surface or slope; tension, string breaks.'),
    ('9709-trailer', 'Car and trailer / towing', '9709', '9709-M4', 'm4-vehicle',
     'Vehicle towing a trailer, caravan or coach through a tow-bar or coupling: acceleration, tension or thrust.'),
    ('9709-lift', 'Lift / elevator', '9709', '9709-M4', 'm4-lift',
     'Lift accelerating or decelerating: cable tension and reaction between floor and load.'),
    ('9709-vehicle-power', 'Vehicles: driving force, power P = Fv, maximum speed', '9709', '9709-M5', 'm4-vehicle',
     'Car, lorry, cyclist or train with driving force or power against resistance, on the level or a hill.'),
    # ---- 9709 M5
    ('9709-work-energy', 'Work-energy on a slope or path', '9709', '9709-M5', 'm5-energy',
     'Use kinetic and potential energy with work done against resistance on a slope, slide or curved path.'),
    ('9709-work-power', 'Work done by a force and average power', '9709', '9709-M5', 'm5-energy',
     'W = Fd cos(theta), rate of working of a force (not a vehicle engine), average power.'),
    # ---- 9709 M2
    ('9709-vt-journey', 'Velocity-time graph / multi-stage journey', '9709', '9709-M2', 'm2-journey',
     'Several stages of constant acceleration; sketch or use a v-t or s-t graph, total distance, unknown time or speed.'),
    ('9709-two-vehicles', 'Two vehicles / catching up', '9709', '9709-M2', 'm2-journey',
     'Two bodies moving on the same line; when or where they meet, catch up or are furthest apart.'),
    ('9709-suvat', 'Constant acceleration formulae (suvat)', '9709', '9709-M2', 'm2-journey',
     'A single stage of constant acceleration, e.g. passing points A, B, C with given times or distances.'),
    ('9709-vertical', 'Vertical motion under gravity', '9709', '9709-M2', 'm2-vertical',
     'Projected vertically or dropped: greatest height, time above a height, two particles, bounce.'),
    ('9709-calculus', 'Variable acceleration (calculus)', '9709', '9709-M2', 'm2-calculus',
     'v, s or a given as a function of t: differentiate or integrate, times at rest, total distance.'),
    # ---- 9709 M3
    ('9709-collisions', 'Collisions and momentum', '9709', '9709-M3', 'm3-collisions',
     'Conservation of momentum in direct impact, coalescence, kinetic energy lost, further collisions or a wall.'),
    # ---- 9702
    ('9702-circular', 'Circular motion: radians, angular speed, horizontal circle', '9702', '9702-12', None,
     'Radian, angular speed, centripetal acceleration and force for motion in a horizontal circle.'),
    ('9702-vertical-circle', 'Vertical circle', '9702', '9702-12', None,
     'Mass on a string or track in a vertical circle: tension or reaction at top and bottom.'),
    ('9702-orbits', 'Orbits and geostationary satellites', '9702', '9702-13', None,
     'Gravitational force as centripetal force: orbital speed or period, Kepler T^2 = kr^3, geostationary orbit.'),
    ('9702-grav-potential', 'Gravitational field and potential', '9702', '9702-13', None,
     "Newton's law of gravitation, field strength, gravitational potential and potential energy."),
    ('9702-temperature', 'Temperature scales and thermal equilibrium', '9702', '9702-14', None,
     'Thermodynamic scale, absolute zero, thermal equilibrium, thermometers.'),
    ('9702-heat-capacity', 'Specific heat capacity and latent heat', '9702', '9702-14', None,
     'Energy to change temperature or state; heating curves and experiments.'),
    ('9702-ideal-gas', 'Ideal gas equation', '9702', '9702-15', None,
     'pV = nRT and pV = NkT: amount of gas, temperature, pressure or volume changes.'),
    ('9702-kinetic-theory', 'Kinetic theory of gases, r.m.s. speed', '9702', '9702-15', None,
     'Assumptions of kinetic theory, pV = Nm<c^2>/3, mean kinetic energy and r.m.s. speed of molecules.'),
    ('9702-first-law', 'Internal energy and the first law of thermodynamics', '9702', '9702-16', None,
     'Internal energy, work done on a gas, first law; gas cycles.'),
    ('9702-shm', 'Simple harmonic motion', '9702', '9702-17', None,
     'Defining equation, displacement, velocity and acceleration graphs, energy in s.h.m.'),
    ('9702-damping', 'Damping and resonance', '9702', '9702-17', None,
     'Light, critical and heavy damping; forced oscillations and resonance.'),
    ('9702-electric-field', 'Electric field and potential', '9702', '9702-18', None,
     "Coulomb's law, field strength and potential of point charges and spheres, uniform fields between plates."),
    ('9702-charged-particle', 'Charged particle in electric / magnetic fields', '9702', '9702-18', None,
     'Deflection of electrons or ions in fields, velocity selector, circular path in a magnetic field, oil drop.'),
    ('9702-capacitors', 'Capacitors: capacitance, networks and energy', '9702', '9702-19', None,
     'Definition of capacitance, series and parallel combinations, energy stored.'),
    ('9702-capacitor-discharge', 'Capacitor discharge and time constant', '9702', '9702-19', None,
     'Exponential discharge through a resistor, time constant RC, graphs of Q, V or I against t.'),
    ('9702-magnetic-force', 'Magnetic force on wires and charges, Hall effect', '9702', '9702-20', None,
     'F = BIL, F = Bqv, flux density, Hall voltage, fields due to wires and solenoids.'),
    ('9702-induction', 'Electromagnetic induction', '9702', '9702-20', None,
     "Magnetic flux and flux linkage, Faraday's and Lenz's laws, induced e.m.f."),
    ('9702-ac', 'Alternating current, r.m.s. values and rectification', '9702', '9702-21', None,
     'Sinusoidal a.c., peak and r.m.s. values, mean power, half- and full-wave rectification and smoothing.'),
    ('9702-photoelectric', 'Photoelectric effect and photons', '9702', '9702-22', None,
     'Photon energy and momentum, work function, threshold frequency, Einstein equation.'),
    ('9702-energy-levels', 'Energy levels and line spectra', '9702', '9702-22', None,
     'Discrete electron energy levels, emission and absorption line spectra.'),
    ('9702-de-broglie', 'Wave-particle duality: de Broglie, electron diffraction', '9702', '9702-22', None,
     'De Broglie wavelength, electron diffraction as evidence for the wave nature of particles.'),
    ('9702-binding-energy', 'Mass defect, binding energy, fission and fusion', '9702', '9702-23', None,
     'Mass-energy equivalence, binding energy per nucleon curve, energy released in nuclear reactions.'),
    ('9702-decay', 'Radioactive decay, half-life and activity', '9702', '9702-23', None,
     'Random and spontaneous decay, decay constant, half-life, activity, exponential decay.'),
    ('9702-ultrasound', 'Ultrasound imaging', '9702', '9702-24', None,
     'Piezo-electric transducer, acoustic impedance, intensity reflection coefficient, attenuation.'),
    ('9702-xray', 'X-rays and CT scanning', '9702', '9702-24', None,
     'Production of X-rays, attenuation, image sharpness and contrast, computed tomography.'),
    ('9702-pet', 'PET scanning and tracers', '9702', '9702-24', None,
     'Positron emission tomography: tracer, annihilation, gamma photons.'),
    ('9702-mri', 'Nuclear magnetic resonance imaging (legacy)', '9702', '9702-24', None,
     '2019-21 syllabus: NMRI, Larmor frequency, uniform and non-uniform magnetic fields, relaxation.'),
    ('9702-luminosity', 'Stellar luminosity, standard candles, Wien and Stefan-Boltzmann', '9702', '9702-25', None,
     'Luminosity and radiant flux intensity, standard candles, Wien\'s law, Stefan-Boltzmann law, stellar radii.'),
    ('9702-redshift', "Redshift, Hubble's law and the Big Bang", '9702', '9702-25', None,
     'Doppler redshift of galaxies, Hubble constant, expanding universe.'),
    ('9702-opamp', 'Op-amps and sensing circuits (legacy)', '9702', '9702-LEGACY-electronics', None,
     '2019-21 syllabus: ideal op-amp, inverting and non-inverting amplifiers, comparators, sensors, output devices.'),
    ('9702-communication', 'Communication: modulation, signals, attenuation (legacy)', '9702', '9702-LEGACY-communication', None,
     '2019-21 syllabus: AM/FM, bandwidth, analogue and digital signals, attenuation in dB, channels.'),
]
TYPE = {t[0]: dict(zip(('id', 'name', 'subject', 'topic', 'sim', 'description'), t)) for t in TYPES}


def taxonomy():
    return [TYPE[t[0]] for t in TYPES]


def has(rx, s):
    return re.search(rx, s) is not None


VEHICLE = r'(a|the|of|its|this|each|her|his)(car|lorry|van|truck|bus|train|engine|locomotive|cyclist|bicycle|motorcycle|motorbike|tractor|coach|vehicle|runner|sprinter)'
CALC = FT + r'[vsa]=[^;]{0,30}?(\dt|t\d|t[-+])|velocityof\w{0,12}attimet|differentiat|integrat|(velocity|displacement|acceleration)[^.;]*?isgivenby'


def classify_9709(tag, own, ctx, qpower=False):
    """tag: topic tag the part is classified under; own: part text; ctx: stem + own."""
    if has(r'(a|the|of)lift(?!s?up|ed|ing)|elevator', ctx):
        return '9709-lift'
    if tag in ('9709-M4', '9709-M1', '9709-M5') and has(r'pulley|(a|the|smooth|fixed)peg|passesover', ctx):
        if has(r'(two|both)(inclined)?(planes|faces)|faceinclined|faces?of|plane(s)?ab\w*andbc|thirdparticle|threeparticles|particlesa,bandc|wedge|triangularblock|twoinclined', ctx):
            return '9709-pulley-two-planes'
        if has(r'table|horizontalsurface|(?<!vertical)plane|slope|incline', ctx):
            return '9709-pulley-table'
        return '9709-pulley-hanging'
    if tag in ('9709-M4', '9709-M1') and has(r'trailer|caravan|coupling|tow-?bar|towing|towrope|tow-?rope', ctx):
        return '9709-trailer'
    if tag == '9709-M3':
        return '9709-collisions'
    if tag == '9709-M2':
        if has(CALC, ctx):
            return '9709-calculus'
        if has(r'vertically|(released|dropped)fromrest|greatestheight|maximumheight|bounce|aboveground|abovethegroundlevel|abovehorizontalground', ctx):
            return '9709-vertical'
        if has(r'(two|both)(cars|cyclists|runners|trains|buses|vehicles|motorcyclists|athletes)|catch|overtake|(they|particlesp?andq?)meet|meeteachother|furthestapart|greatestdistancebetween|atthesametime|secondcar', ctx):
            return '9709-two-vehicles'
        if has(r'velocity-time|v-tgraph|speed-time|displacement-time|distance-time|s-tgraph|sketch|then|stage|constantspeed|maintains|untilit|before(decelerating|coming)', ctx):
            return '9709-vt-journey'
        return '9709-suvat'
    plane = has(r'inclined|incline|slope|planeat|lineofgreatest|ahill|thehill', ctx)
    horiz = has(r'rough(horizontal)?(floor|ground|surface|plane|table)|horizontal(floor|ground|surface|plane|table)|horizontalroad|floor', ctx)
    rod = has(r'(a|the|smooth|rough|small)(ring|bead)', ctx) and has(r'(a|the|fixed|straight|rough|rigid)(rod|wire)', ctx)
    vehicle = has(VEHICLE, ctx)
    if tag == '9709-M5' and has(r'collision|collid|coalesce', own):
        return '9709-collisions'
    if tag == '9709-M5':
        # negated power ('no longer supplying any power', 'the engine does no work')
        own = re.sub(r'no(longer)?(supplying|producing|working|using)?(any)?power|doesnowork|isnotworking|enginedoesno', '', own)
        ctx = re.sub(r'no(longer)?(supplying|producing|working|using)?(any)?power|doesnowork|isnotworking|enginedoesno', '', ctx)
        power = has(r'power|\dkw|rateofworking|workingat|rateofdoingwork|atarateof\d|\dw(\.|,|and|when|is|$)', own) or \
            (has(r'power|\dkw|rateofworking|workingat|rateofdoingwork', ctx) and not has(r'energymethod|kineticenergy|potentialenergy|workdoneagainst', own))
        if (power or qpower or has(r'drivingforce', own)) and vehicle:
            return '9709-vehicle-power'
        if power:
            return '9709-work-power'
        if vehicle and has(r'drivingforce|resistance', own) and not has(r'workdone|energy', own):
            return '9709-vehicle-power'
        if has(r'kineticenergy|potentialenergy|energymethod|energylost|speed|height|slide|curved|loss|gain', own):
            return '9709-work-energy'
        if has(r'workdoneby', own):
            return '9709-work-power'
        return '9709-work-energy'
    if has(r'connectedby|joinedby|attachedtotheendsof|attachedtooneend', ctx) and has(r'string|rope|rod|cable', ctx) \
            and not has(r'(a|the|smooth|rough|small)(ring|bead)', ctx) and tag in ('9709-M4', '9709-M1'):
        return '9709-connected-line'
    if tag == '9709-M1':
        if rod:
            return '9709-ring-rod'
        strings = has(r'string|rope|cable|threaded|strut|(a|the|smooth)ring', ctx)
        if plane:
            return '9709-plane-equilibrium'
        if (horiz or has(r'coefficientoffriction|(a|is|the|are|both|along|on|over)rough', ctx)) and not has(r'threaded|(a|the|smooth)ring', ctx):
            return '9709-friction-horizontal'
        if strings:
            return '9709-strings'
        if has(r'resultant', own) or (has(r'resultant', ctx) and not has(r'equilibrium', ctx)):
            return '9709-resultant'
        return '9709-forces-equilibrium'
    if tag == '9709-M4':
        if rod:
            return '9709-ring-rod'
        if vehicle and has(r'drivingforce|resistance|power|engine|brak', ctx):
            return '9709-vehicle-power'
        if plane:
            return '9709-plane-motion'
        if horiz or has(r'coefficientoffriction|(a|is|the|are|both|along|on|over)rough|friction', ctx):
            return '9709-friction-horizontal'
        return '9709-force-motion'
    return None


RULES_9702 = {   # specific types first; the last rule of each topic is its general type
    '9702-12': [('9702-vertical-circle', r'verticalcircle|vertical(plane|circular)|topofthecircle|lowestpoint|highestpoint|topofthe(loop|track)'),
                ('9702-circular', r'radian(?!t)|angular(speed|velocity|displacement)|centripetal|circle|circular|rotat|revolution')],
    '9702-13': [('9702-grav-potential', r'gravitationalpotential'),
                ('9702-orbits', r'orbit|satellite|geostationary|period|kepler'),
                ('9702-grav-potential', r'gravitational(field|potential|force|constant)|lawofgravitation|escape')],
    '9702-14': [('9702-heat-capacity', r'specificheat|latentheat|heatingcurve|heater|meltingpoint|boilingpoint|vaporis|melts|fusion'),
                ('9702-temperature', r'thermalequilibrium|thermodynamic|absolutezero|kelvin|thermometer|temperaturescale|thermocouple')],
    '9702-15': [('9702-kinetic-theory', r'kinetictheory|kineticmodel|meansquare|r\.?m\.?s\.?speed|root-mean-square|〈c2〉|<c2>|meankineticenergy|averagekineticenergy|translationalkineticenergy|=3/2kt|3kt|kineticenergyof(a|each|the)?(gas)?(molecule|atom)|assumption|brownian|collisionswith'),
                ('9702-ideal-gas', r'idealgas|pv=|numberof(gas)?(molecules|moles|atoms)|amountof(gas|substance)|(?<![a-z])mol(?![a-z])|pressure|volume')],
    '9702-16': [('9702-first-law', r'internalenergy|firstlaw|workdone|thermalenergy|heating')],
    '9702-17': [('9702-damping', r'damp|resonan|forcedoscillation|drivingfrequency|drivenoscillation|vibrator|amplitudeisamaximum|resistiveforces'),
                ('9702-shm', r'simpleharmonic|s\.h\.m|oscillat|angularfrequency|amplitude|period|frequency')],
    '9702-18': [('9702-charged-particle', r'electronbeam|beamof|enters|deflect|oil|droplet|velocityselector|electronmovesbetween|ion(s)?(enter|move|travel)|path(of|followed)|trajectory|specificcharge|charge-to-mass|(proton|electron|particle|ion)(s)?(is|are)?(accelerated|projected|travel|move|enter)'),
                ('9702-electric-field', r'electric(field|potential|force)|pointcharge|coulomb|chargedsphere|charge')],
    '9702-19': [('9702-capacitor-discharge', r'discharg|timeconstant|exponential|e-t|decays?|halftheinitial|decrease|fallsto|timetaken'),
                ('9702-capacitors', r'capacitor|capacitance')],
    '9702-20': [('9702-induction', r'inducede\.?m\.?f|inducedelectromotiveforce|induced|faraday|lenz|fluxlinkage|electromagneticinduction|magneticflux(?!density)|remove|withdraw|pushedinto|pulledout|droppedthrough|fallsthrough|eddy|metalring|copperring|aluminiumring|cutring'),
                ('9702-charged-particle', r'velocityselector|circularpath|electronbeam|beamof(electrons|protons|ions|particles)|(electron|proton|ion|particle)(s)?(enters|travels|moves|is(projected|accelerated))|specificcharge|charge-to-mass|massspectrom|cyclotron|semicircle|radiusofthepath'),
                ('9702-magnetic-force', r'magnetic(fluxdensity|field|force)|force(perunitlength|onthewire)|hall|solenoid|tesla|current-carrying')],
    '9702-21': [('9702-ac', r'alternating|r\.?m\.?s|rectif|smoothing|ripple|peak|sinusoidal|diode|meanpower')],
    '9702-22': [('9702-de-broglie', r'debroglie|electrondiffraction|wavenatureof|wave-particle|effectivewavelength|matterwave|wavelengthof(a|the)?(moving)?(particle|electron)|particulatenature|diffractionofelectrons|diffractionpattern|crystal|graphite|concentricrings'),
                ('9702-energy-levels', r'energylevel|spectr|groundstate|excited|transition|darklines|brightlines|emissionline'),
                ('9702-photoelectric', r'photoelectric|workfunction|threshold|photon|photocell|stoppingpotential')],
    '9702-23': [('9702-binding-energy', r'massdefect|bindingenergy|fission|fusion|massexcess|(energyreleased|releaseofenergy|releasesenergy)(?!bythedecay|inthedecay|byeachdecay)|mass-energy|e=mc'),
                ('9702-decay', r'decay|half-?life|activity|radioactiv|unstable')],
    '9702-24': [('9702-mri', r'magneticresonance|nmri|(?<![a-z])mri(?![a-z])|larmor'),
                ('9702-pet', r'positronemission|(?<![a-z])pet(?![a-z])|petscan|tracer|annihilat|positron'),
                ('9702-xray', r'x-?ray|computedtomography|ctscan|(?<![a-z])ct(?![a-z])|voxel|attenuationcoefficient|halfthickness|sharpness|contrast'),
                ('9702-ultrasound', r'ultrasound|acousticimpedance|piezo|intensityreflection|transducer')],
    '9702-25': [('9702-luminosity', r'standardcandle|cepheid|luminosity|stefan|wien|surfacetemperature'),
                ('9702-redshift', r'redshift|hubble|bigbang|expandinguniverse|recession|galax|doppler|movingaway|observedwavelength|positionsofthelines'),
                ('9702-luminosity', r'luminosity|radiantflux|standardcandle|stefan|wien|surfacetemperature|radiusofthe(star|sun)|star')],
    '9702-LEGACY-electronics': [('9702-opamp', r'op-amp|amplifier|comparator|feedback|sensor|relay|gauge|thermistor|ldr|led|light-')],
    '9702-LEGACY-communication': [('9702-communication', r'modulat|bandwidth|signal|attenuat|(?<![a-z])db(?![a-z])|analogue|digital|cable|fibre|channel|mobile|carrier')],
}
DEFAULT_9702 = {
    '9702-12': '9702-circular', '9702-13': '9702-grav-potential', '9702-14': '9702-temperature',
    '9702-15': '9702-ideal-gas', '9702-16': '9702-first-law', '9702-17': '9702-shm',
    '9702-18': '9702-electric-field', '9702-19': '9702-capacitors', '9702-20': '9702-magnetic-force',
    '9702-21': '9702-ac', '9702-22': '9702-photoelectric', '9702-23': '9702-decay',
    '9702-24': '9702-ultrasound', '9702-25': '9702-luminosity',
    '9702-LEGACY-electronics': '9702-opamp', '9702-LEGACY-communication': '9702-communication',
}


def classify_9702(tag, own, ctx, want_default=False):
    if tag not in DEFAULT_9702:
        return (None, False) if want_default else None
    # own text decides first, then the stem/intro context
    for text in (own, ctx):
        for tid, rx in RULES_9702.get(tag, []):
            if has(rx, text):
                return (tid, False) if want_default else tid
    return (DEFAULT_9702[tag], True) if want_default else DEFAULT_9702[tag]


def _match_9702(tag, text, general=False):
    """Specific types of a topic (all rules but the last); general=True tries
    only the topic's general type (the last rule)."""
    rules = RULES_9702.get(tag, [])
    rules = rules[-1:] if general else rules[:-1]
    for tid, rx in rules:
        if has(rx, text):
            return tid
    return None


def classify_part(syl, part, stem, prev=None):
    """prev: {topic: type} of earlier parts of the same question (9702 only)."""
    own = norm(own_text(part))
    ctx = norm(stem) + own
    if syl == '9709':
        qpower = bool(prev and prev.get('_qpower'))
        prim = classify_9709(part['primary_tag'], own, ctx, qpower) if part['primary_tag'] else None
        out = [prim] if prim else []
        for t in part['tags']:
            if t['tag'] == part['primary_tag'] or t['score'] < 3:
                continue
            x = classify_9709(t['tag'], own, ctx, qpower)
            if x and x not in out:
                out.append(x)
        return prim, out
    # 9702: a definition ("Define ...", "State what is meant ...") is typed by
    # its own words alone. Otherwise a specific type named in the part's own words (not the shared
    # intro) first, then the type of the previous part on the same topic and
    # the same level-1 label (e.g. 9c(ii) follows 9c(i)), then
    # a specific type named in intro + stem, then the topic's general type
    bare = norm(' '.join(x for x in (part['preamble'], part['text']) if x))
    def one(tag):
        if tag not in DEFAULT_9702:
            return None
        definition = has(r'^(define|statewhatismeant|statewhatisrepresented|state\w*law|explainwhatismeant)', bare)
        if definition:
            return _match_9702(tag, bare) or _match_9702(tag, bare, general=True) or DEFAULT_9702[tag]
        return (_match_9702(tag, bare) or (prev or {}).get((tag, part['label'])) or _match_9702(tag, ctx)
                or _match_9702(tag, ctx, general=True) or DEFAULT_9702[tag])
    prim = one(part['primary_tag']) if part['primary_tag'] else None
    out = [prim] if prim else []
    for t in part['tags']:
        if t['tag'] == part['primary_tag'] or t['score'] < 3:
            continue
        x = one(t['tag'])
        if x and x not in out:
            out.append(x)
    return prim, out


NOPOWER = r'no(longer)?(supplying|producing|working|using)?(any)?power|stopspedalling|doesnowork|isnotworking|enginedoesno|engineisswitchedoff|freewheel'
POWER = r'power|\dkw|rateofworking|workingat|rateofdoingwork'


def classify_question(syl, q):
    prev = {}
    if syl == '9709':
        # vehicle questions that involve power anywhere are grouped as
        # 'vehicle-power' -- until a part says the power is switched off
        qtext = norm(q['stem'] + ' ' + ' '.join(own_text(p) for p in q['parts']))
        prev['_qpower'] = bool(re.search(POWER, re.sub(NOPOWER, '', qtext)))
    for p in q['parts']:
        if syl == '9709' and re.search(NOPOWER, norm(own_text(p))):
            prev['_qpower'] = False
        p['qtype'], p['qtypes'] = classify_part(syl, p, q['stem'], prev)
        if syl == '9702' and p['primary_tag'] and p['qtype']:
            prev[(p['primary_tag'], p['label'])] = p['qtype']
    if syl == '9709':
        # a bare constant-acceleration step inside a dynamics question (e.g. "find
        # the time to travel 1.44 m" after friction gives the acceleration) is
        # grouped with that question's type
        other = {}
        for p in q['parts']:
            if p['qtype'] and p['qtype'] != '9709-suvat':
                other[p['qtype']] = other.get(p['qtype'], 0) + (p['marks'] or 0)
        if other:
            main = max(other, key=lambda t: (other[t], -[x[0] for x in TYPES].index(t)))
            if TYPE[main]['topic'] != '9709-M2':
                for p in q['parts']:
                    if p['qtype'] == '9709-suvat':
                        p['qtypes'] = [main] + [t for t in p['qtypes'] if t != main]
                        p['qtype'] = main
    by = {}
    for p in q['parts']:
        if p['qtype']:
            by[p['qtype']] = by.get(p['qtype'], 0) + (p['marks'] or 0)
    order = [t[0] for t in TYPES]
    q['qtype'] = max(by, key=lambda t: (by[t], -order.index(t))) if by else None
    allt = []
    for p in q['parts']:
        for t in p['qtypes']:
            if t not in allt:
                allt.append(t)
    if q['qtype'] in allt:
        allt.remove(q['qtype'])
    q['qtypes'] = ([q['qtype']] if q['qtype'] else []) + allt
    return q
