"""Keyword topic tagger for Paper 4 parts (stdlib only).

Text is normalised to lower case with ALL whitespace removed, so run-together
words in some PDFs ("coefficientoffriction") match the same rules.
Each rule is (tag, regex, weight) and counts at most once per text.

Score of a part = rules hit in (part text + preamble + level-1 intro)
                 + 0.5  x rules hit in the question stem
                 + 0.25 x rules hit in the other parts of the same question
(the last term lets a bare "Find the value of k." inherit its question's topic).
A tag is kept if its score >= 2. The primary is the tag with the highest
OWN-text score when that is >= 3 (the part's own wording is decisive),
otherwise the highest total score. A part with no tag inherits the question's
strongest tag (scored on the whole question text), marked 'inherited'. The primary tag is the highest score; ties go
to the tag with the higher question-level score, then to rule-table order.
Question tags = union of part tags; question primary = the part primary tag
carrying the most marks.

For 9709 a sim id is chosen per part by the ordered rules in pick_sim().
"""
import re

THRESHOLD = 2.0


def norm(s):
    s = s.lower().replace('–', '-').replace('−', '-').replace('’', "'").replace('‘', "'")
    return re.sub(r'\s+', '', s)


# ------------------------------------------------------------------ 9709
# Regexes run on lower-case text with all whitespace removed (several PDFs have
# no spaces between words), so word-boundary look-behinds are avoided; where a
# short word needs anchoring an article/preposition prefix is used instead.
FT = r'(where|by|and|that|is|,|:|^)\d?'          # prefix before 'v=' etc. in no-space text
R9709 = [
    # M1 Forces and equilibrium
    ('9709-M1', r'equilibrium', 3, 'equilibrium'),
    ('9709-M1', r'coplanar', 3, 'coplanar'),
    ('9709-M1', r'resultant', 3, 'resultant'),
    ('9709-M1', r'onthepointof(moving|sliding|slipping)|abouttoslip|abouttoslide|abouttomove', 3, 'on the point of'),
    ('9709-M1', r'magnitudeanddirection', 2, 'magnitude and direction'),
    ('9709-M1', r'smoothring|roughring|threaded|(a|the)ring', 2, 'ring'),
    ('9709-M1', r'(remains?|stays?|kept|held|is|are|being)atrest|(remains?|stays?)stationary', 1, 'at rest'),
    ('9709-M1', r'(acting|act|acts)(at|on)(a|the)point|forcesofmagnitude|forcesactat|forcesactingat', 2, 'forces at a point'),
    ('9709-M1', r'lami|triangleofforces|strut', 2, 'lami/struts'),
    ('9709-M1', r'normalreaction|normalcontactforce|frictionalforce|frictionforce', 1, 'reaction/friction'),
    ('9709-M1', r'coefficientoffriction', 1, 'coefficient of friction'),
    ('9709-M1', r'(least|greatest|smallest|largest|minimum|maximum)(possible)?valueof(the)?((coefficient|force|μ|tension|mass)|(p|f|x|m|t)[^a-z])', 1, 'least/greatest value'),
    ('9709-M1', r'tensionsin|tensionineach|tensionsineach', 2, 'tensions in strings'),
    ('9709-M1', r'(held|kept)atrestby|twolight(inextensible)?strings|twostrings', 2, 'held by strings'),
    ('9709-M1', r'doesnotmove|beginstoslide|beginstomove|justbeginstomove|isjustonthepoint', 3, 'about to move'),
    # M2 Kinematics of motion in a straight line
    ('9709-M2', r'velocity-timegraph|v-tgraph|speed-timegraph|velocity-time|displacement-time|s-tgraph|distance-time', 3, 'motion graph'),
    ('9709-M2', FT + r'[vsa]=[^;]{0,30}?(\dt|t\d|t[-+])|(velocity|displacement|acceleration)[^.;]*?isgivenby', 3, 'v/s/a = f(t)'),
    ('9709-M2', r'differentiat|integrat', 2, 'calculus'),
    ('9709-M2', r'distancetravelled|totaldistance|averagespeed|averagevelocity|distancemoved|distancecovered', 2, 'distance travelled'),
    ('9709-M2', r'instantaneous(ly)?(at)?rest|momentarilyatrest|changesdirection|changedirection', 2, 'instantaneous rest'),
    ('9709-M2', r'projectedvertically|thrownvertically|verticallyupwards|verticallydownwards|greatestheight|maximumheight|reachesaheight|speedofprojection', 3, 'vertical motion'),
    ('9709-M2', r'constantacceleration|constantdeceleration|uniformacceleration|acceleratesuniformly|deceleratesuniformly|accelerates(uniformly)?at|acceleratesataconstant|deceleratesat|uniformlydecelerat|uniformlyaccelerat', 2, 'constant acceleration'),
    ('9709-M2', r'decelerat|uniformly|constantspeed|retardation|startsfromrest|fromrest', 1, 'suvat words'),
    ('9709-M2', r'timetaken|findthetime|howlong|totaltime|timeinterval|thetimethat|thetimefor|takestotravel|reachestheground|hitstheground|reachesthebottom|whenitreaches|whenitis', 1, 'time/arrival'),
    ('9709-M2', r'(maximum|minimum|greatest|least)(velocity|speed)|displacement', 1, 'max velocity/displacement'),
    ('9709-M2', r'(released|dropped)fromrest', 1, 'released/dropped'),
    ('9709-M2', r'attimet|timetsafter|timetseconds|tsafter|tsecondsafter|(when|at|for|between)t=|valuesoft|valueoft', 2, 'time variable t'),
    ('9709-M2', r'sketch', 1, 'sketch'),
    # M3 Momentum
    ('9709-M3', r'collision|coalesce|momentum', 3, 'collision/momentum'),
    ('9709-M3', r'collid', 2, 'collide'),
    ('9709-M3', r'combine|jointogether|movetogether|stucktogether|sticktogether|moveoffasone', 1, 'combine'),
    ('9709-M3', r'(immediately)?(after|before)the(collision|impact)|onimpact|inthecollision', 1, 'impact'),
    # M4 Newton's laws of motion
    ('9709-M4', r'pulley|(a|the|smooth|fixed)peg', 3, 'pulley'),
    ('9709-M4', r'towing|trailer|caravan|tow-?bar|coupling|towrope|tow-?rope|isattachedbehind', 3, 'trailer/coupling'),
    ('9709-M4', r'(a|the|of)lift(?!s?up|ed|ing)|elevator', 3, 'lift'),
    ('9709-M4', r'drivingforce', 2, 'driving force'),
    ('9709-M4', r'(find|calculate|show|determine)[^.]*?(acceleration|deceleration)|newton\'?ssecondlaw|accelerationofthe|accelerationof(a|p|q|b|the)', 2, 'find acceleration'),
    ('9709-M4', r'tension|thrust', 1, 'tension/thrust'),
    ('9709-M4', r'(a|the)(constant)?forceofmagnitude[^.]*?(applied|acts)[^.]*?(speed|velocity|moving|direction)', 2, 'force on moving particle'),
    ('9709-M4', r'constantresistance|resistanceforce', 1, 'resistance'),
    ('9709-M4', r'stringbreaks|ropebreaks|cablebreaks|stringbecomesslack|hitsthefloor|reachesthefloor|reachesthepulley|stringis(cut|broken)', 3, 'string breaks/hits ground'),
    ('9709-M4', r'connectedby|attachedtotheendsof|attachedtooneend|passesover|joinedby', 2, 'connected particles'),
    ('9709-M4', r'reaction(force)?(between|on|exertedby)the(floor|crate|box|man|woman|person|load|block|parcel)', 2, 'contact force'),
    ('9709-M4', r'(slides|moves|travels|pushed|pulled|projected)[^.]*?(arough|therough|plane|slope|floor|surface|ground)', 1, 'motion on surface'),
    # M5 Energy, work and power
    ('9709-M5', r'workdone|energymethod|work-energy|workenergy|doneagainst|doesworkagainst|workagainst', 3, 'work done'),
    ('9709-M5', r'power|\dkw|rateofworking|workingatarate|workingataconstantrate|rateofdoingwork|atarateof\d', 4, 'power'),
    ('9709-M5', r'kineticenergy|potentialenergy|energylost|lossofenergy|lossinenergy|gainin(kinetic|potential)|lossin(kinetic|potential)|energyis(lost|gained)|changeinenergy|changein(kinetic|potential)', 2, 'kinetic/potential energy'),
    ('9709-M5', r'\d(kj|j)(of|is|was|are|and|lost|gained|\.|,|;|$|\))', 2, 'joules'),
    ('9709-M5', r'maximumspeed|greatestspeed|steadyspeed|greatestpossiblespeed|maximumpossiblespeed', 1, 'max/steady speed'),
    ('9709-M5', r'energy', 1, 'energy'),
    ('9709-M5', r'(a|the)slide|curved|cross-section|smoothsurface|watersplash|rollercoaster|bead', 2, 'path / slide'),
]

# ------------------------------------------------------------------ 9702
R9702 = [
    ('9702-12', r'radian(?!t)', 3, 'radian'),
    ('9702-12', r'angularspeed|angularvelocity', 3, 'angular speed'),
    ('9702-12', r'centripetal', 3, 'centripetal'),
    ('9702-12', r'horizontalcircle|verticalcircle|circularpath|circularmotion|inacircle|motioninacircle|circularorbit|rotatingat|revolution', 2, 'circle'),
    ('9702-13', r'gravitationalfield(?!strength)|gravitationalfieldstrengthat|definegravitationalfieldstrength', 3, 'grav field'),
    ('9702-13', r'gravitationalfieldstrength', 1, 'g mentioned'),
    ('9702-13', r'gravitationalpotential', 3, 'grav potential'),
    ('9702-13', r'gravitationalforce|newton\'?slawofgravitation|lawofgravitation|gravitationalconstant', 3, 'grav force'),
    ('9702-13', r'geostationary|geosynchronous', 3, 'geostationary'),
    ('9702-13', r'orbit', 2, 'orbit'),
    ('9702-13', r'satellite', 1, 'satellite'),
    ('9702-13', r'planet|massofthe(earth|sun|moon)', 1, 'planet'),
    ('9702-14', r'thermalequilibrium', 3, 'thermal equilibrium'),
    ('9702-14', r'thermodynamic(temperature)?scale|thermodynamictemperature', 3, 'thermodynamic scale'),
    ('9702-14', r'absolutezero|kelvin', 2, 'absolute zero'),
    ('9702-14', r'specificheatcapacity', 3, 'specific heat capacity'),
    ('9702-14', r'specificlatentheat|latentheat', 3, 'latent heat'),
    ('9702-14', r'thermometer|thermocouple|temperaturescale', 2, 'thermometer'),
    ('9702-15', r'idealgas', 3, 'ideal gas'),
    ('9702-15', r'pv=nrt|pv=nkt|equationofstate', 3, 'pV=nRT'),
    ('9702-15', r'(?<![a-z])mole|avogadro|(?<![a-z])mol(?![a-z])', 2, 'mole'),
    ('9702-15', r'amount(n)?of(the)?(gas|substance)|numberofmoles|numberof(gas)?molecules', 3, 'amount of gas'),
    ('9702-15', r'kinetictheory|kineticmodel', 3, 'kinetic theory'),
    ('9702-15', r'meansquare|r\.?m\.?s\.?speed|root-mean-squarespeed|root-mean-square\(r\.m\.s\.\)speed|meantranslationalkineticenergy|translationalkineticenergy|3/2kt|=3kt|averagekineticenergyofamolecule|kineticenergyofa(gas)?molecule', 3, 'r.m.s. speed'),
    ('9702-15', r'molecule', 1, 'molecule'),
    ('9702-16', r'internalenergy', 3, 'internal energy'),
    ('9702-16', r'firstlawofthermodynamics|firstlaw', 3, 'first law'),
    ('9702-16', r'workdoneon(the)?(gas|substance|system)|workdoneby(the)?(gas|substance|system)', 3, 'work done on gas'),
    ('9702-16', r'thermalenergy(is)?(transferred|supplied)|heatsupplied|heatingofthe|q=|δu|∆u', 2, 'heat transfer'),
    ('9702-17', r'simpleharmonic|s\.h\.m', 3, 'shm'),
    ('9702-17', r'oscillat', 2, 'oscillation'),
    ('9702-17', r'damp', 2, 'damping'),
    ('9702-17', r'resonan', 3, 'resonance'),
    ('9702-17', r'naturalfrequency|angularfrequency', 2, 'natural/angular frequency'),
    ('9702-17', r'amplitude', 1, 'amplitude'),
    ('9702-18', r'electricfield', 3, 'electric field'),
    ('9702-18', r'electricpotential', 3, 'electric potential'),
    ('9702-18', r'pointcharge|chargedsphere|isolatedsphere|chargedmetalsphere|coulomb\'?slaw', 3, 'point charge'),
    ('9702-18', r'electricforce|electrostatic', 2, 'electric force'),
    ('9702-18', r'(?<![a-z])parallelplates|(?<![a-z])parallelmetalplates', 1, 'parallel plates'),
    ('9702-19', r'capacitor|capacitance', 3, 'capacitance'),
    ('9702-19', r'timeconstant', 3, 'time constant'),
    ('9702-19', r'discharg', 2, 'discharge'),
    ('9702-19', r'\dμf|microfarad|\dpf(?![a-z])|\dnf(?![a-z])', 2, 'farad'),
    ('9702-20', r'magneticfluxdensity|magneticfield', 3, 'magnetic field'),
    ('9702-20', r'hall(voltage|probe|effect)', 3, 'hall'),
    ('9702-20', r'inducede\.?m\.?f|inducedelectromotiveforce|electromagneticinduction|e\.?m\.?f\.?isinduced|inducedcurrent', 3, 'induced emf'),
    ('9702-20', r'faraday|lenz', 3, 'faraday/lenz'),
    ('9702-20', r'fluxlinkage|magneticflux', 3, 'flux'),
    ('9702-20', r'solenoid|(?<![a-z])coil', 2, 'solenoid/coil'),
    ('9702-20', r'magnet(?!ic)|eddycurrent|polesof', 2, 'magnet'),
    ('9702-20', r'velocityselector|tesla|(?<![a-z])mt(?![a-z])', 1, 'velocity selector/tesla'),
    ('9702-21', r'alternating', 3, 'alternating'),
    ('9702-21', r'r\.?m\.?s\.?(current|voltage|value|potentialdifference|p\.d)|root-mean-square(current|voltage|value)', 3, 'r.m.s. current/voltage'),
    ('9702-21', r'rectif', 3, 'rectification'),
    ('9702-21', r'smoothing|ripple', 3, 'smoothing'),
    ('9702-21', r'peakvoltage|peakcurrent|peakvalue|peakpotential', 2, 'peak value'),
    ('9702-21', r'sinusoidal|transformer', 1, 'sinusoidal'),
    ('9702-21', r'root-mean-square(\(r\.m\.s\.\))?(current|voltage|value|p\.d|potential)|meanpower|varyingcurrent', 3, 'r.m.s./mean power'),
    ('9702-22', r'(?<!gamma)(?<!gamma-ray)(?<!x-ray)(?<!xray)photon', 3, 'photon'),
    ('9702-22', r'photoelectric', 3, 'photoelectric'),
    ('9702-22', r'workfunction', 3, 'work function'),
    ('9702-22', r'thresholdfrequency|thresholdwavelength', 3, 'threshold frequency'),
    ('9702-22', r'debroglie', 3, 'de broglie'),
    ('9702-22', r'electrondiffraction|wave-particleduality|particle-likebehaviour|wave-likebehaviour', 3, 'electron diffraction'),
    ('9702-22', r'energylevel', 3, 'energy level'),
    ('9702-22', r'(line|emission|absorption)spectr', 3, 'spectra'),
    ('9702-22', r'(?<![a-z])ev(?![a-z])|electronvolt|planckconstant', 1, 'eV'),
    ('9702-22', r'wavenatureofmatter|particulatenature|wavelengthof(a|the)?(moving)?particle|effectivewavelength|matterwave|wave-particle', 3, 'matter waves'),
    ('9702-23', r'massdefect', 3, 'mass defect'),
    ('9702-23', r'bindingenergy', 3, 'binding energy'),
    ('9702-23', r'fission|fusion', 3, 'fission/fusion'),
    ('9702-23', r'decayconstant', 3, 'decay constant'),
    ('9702-23', r'half-?life', 3, 'half-life'),
    ('9702-23', r'activity', 2, 'activity'),
    ('9702-23', r'radioactiv', 3, 'radioactive'),
    ('9702-23', r'nuclide|nucleon|isotope', 2, 'nuclide'),
    ('9702-23', r'α-particle|β-particle|alpha|beta|γ-ray|gammaradiation|(?<![a-z])decay', 1, 'decay'),
    ('9702-24', r'ultrasound', 3, 'ultrasound'),
    ('9702-24', r'piezo', 3, 'piezo'),
    ('9702-24', r'acousticimpedance|specificacousticimpedance', 3, 'acoustic impedance'),
    ('9702-24', r'intensityreflectioncoefficient', 3, 'intensity reflection coefficient'),
    ('9702-24', r'x-?ray', 3, 'x-ray'),
    ('9702-24', r'computedtomography|ctscan|(?<![a-z])ct(?![a-z])', 3, 'ct'),
    ('9702-24', r'positronemission|(?<![a-z])pet(?![a-z])|petscan', 3, 'pet'),
    ('9702-24', r'tracer', 3, 'tracer'),
    ('9702-24', r'(medical|diagnos|image)', 1, 'medical'),
    ('9702-24', r'attenuationcoefficient|linearattenuation|halfthickness|half-valuethickness|absorptioncoefficient', 3, 'attenuation coefficient'),
    ('9702-24', r'gamma(-?ray)?photon', 1, 'gamma photon'),
    ('9702-24', r'magneticresonance|nmri|(?<![a-z])mri(?![a-z])|larmor', 4, 'MRI (legacy)'),
    ('9702-25', r'luminosity|surfacetemperature', 3, 'luminosity'),
    ('9702-25', r'standardcandle', 3, 'standard candle'),
    ('9702-25', r'radiantfluxintensity', 3, 'radiant flux intensity'),
    ('9702-25', r'stefan|wien', 3, 'stefan/wien'),
    ('9702-25', r'redshift', 3, 'redshift'),
    ('9702-25', r'hubble', 3, 'hubble'),
    ('9702-25', r'bigbang|expandinguniverse|expansionoftheuniverse', 3, 'big bang'),
    ('9702-25', r'cepheid', 2, 'cepheid'),
    ('9702-25', r'galax|movingawayfrom|recession|recedes|receding', 3, 'galaxy / recession'),
    ('9702-25', r'positions?ofthe(spectral)?lines|lines?(are|is)shifted|shiftinwavelength|observedwavelength|wavelength[^.]{0,40}(detected|observed|measured|seen)(by|on|at)|seenby(an|the)observer', 5, 'observed line shift'),
    ('9702-25', r'(?<![a-z])star', 1, 'star'),
    # legacy (2018-2021 papers only; filtered by year in score_part)
    ('9702-LEGACY-electronics', r'operationalamplifier|op-amp|opamp', 3, 'op-amp'),
    ('9702-LEGACY-electronics', r'invertingamplifier|non-invertingamplifier|amplifier', 3, 'amplifier'),
    ('9702-LEGACY-electronics', r'comparator', 3, 'comparator'),
    ('9702-LEGACY-electronics', r'negativefeedback|feedback', 2, 'feedback'),
    ('9702-LEGACY-electronics', r'sensingdevice|sensor|outputdevice|relay|straingauge|light-dependentresistor|(?<![a-z])ldr|thermistor|light-emittingdiode|(?<![a-z])led(?![a-z])|piezo-?electrictransducer|quartzcrystal', 2, 'sensing/output device'),
    ('9702-LEGACY-communication', r'modulat', 3, 'modulation'),
    ('9702-LEGACY-communication', r'bandwidth', 3, 'bandwidth'),
    ('9702-LEGACY-communication', r'decibel|(?<![a-z])db(?![a-z])', 3, 'decibel'),
    ('9702-LEGACY-communication', r'attenuation(per|in|of)?\w*(cable|fibre|signal|wire)|(cable|fibre|signal|wire)\w*attenuat', 3, 'signal attenuation'),
    ('9702-LEGACY-communication', r'analogue|digital|sampling|samplesthe|parallel-to-serial|serial-to-parallel', 2, 'analogue/digital'),
    ('9702-LEGACY-communication', r'mobilephone|basestation|cellularexchange|optic(al)?fibre|coaxialcable|wire-pair|carrierwave|signal-to-noise|noise', 2, 'communication channel'),
    # AS topics (secondary only; low weights)
    ('9702-2', r'uniformlyacceleratedmotion|freefall|projectile', 1, 'AS kinematics'),
    ('9702-3', r'momentum|newton\'?s(second|third)law', 1, 'AS dynamics'),
    ('9702-5', r'kineticenergy|gravitationalpotentialenergy', 1, 'AS energy'),
    ('9702-7', r'doppler|wavelength|frequencyofthewave|progressivewave', 1, 'AS waves'),
    ('9702-9', r'resistance|resistivity|potentialdifference', 1, 'AS electricity'),
    ('9702-10', r'potentialdivider|internalresistance|kirchhoff', 1, 'AS dc circuits'),
    ('9702-11', r'quark|lepton|hadron|baryon|meson', 2, 'AS particle physics'),
    ('9702-4', r'upthrust|floats|(?<!flux)density|hydrostatic', 2, 'AS forces/density/pressure'),
]

COMPILED = {
    '9709': [(t, re.compile(p), w, n) for t, p, w, n in R9709],
    '9702': [(t, re.compile(p), w, n) for t, p, w, n in R9702],
}
ORDER = {
    '9709': ['9709-M1', '9709-M2', '9709-M3', '9709-M4', '9709-M5'],
    '9702': ['9702-%d' % i for i in range(12, 26)] +
            ['9702-LEGACY-electronics', '9702-LEGACY-communication'] +
            ['9702-%d' % i for i in range(1, 12)],
}
# AS tags may appear as secondary tags but never as primary for Paper 4 parts
AS_TAGS = {'9702-%d' % i for i in range(1, 12)}


def rule_hits(syl, text, year):
    t = norm(text)
    if syl == '9702':
        # 'where g is the gravitational field strength' is a definition, not topic 13
        t = re.sub(r'gisthegravitationalfieldstrength|gravitationalfieldstrengthg(?![a-z])', '', t)
    hits = {}
    for tag, rx, w, name in COMPILED[syl]:
        if tag.startswith('9702-LEGACY') and year > 2021:
            continue
        if rx.search(t):
            hits.setdefault(tag, []).append((name, w))
    if syl == '9709':
        extra_9709(t, hits)
    else:
        extra_9702(t, hits)
    return hits


def extra_9702(t, hits):
    # orbital context: angular speed of a moon/planet/satellite is an orbit problem
    if re.search(r'orbit|satellite|planet|moon', t) and '9702-12' in hits:
        hits.setdefault('9702-13', []).append(('orbital context', 2))
    # 'bandwidth' of an op-amp is electronics, not communication
    if re.search(r'op-amp|opamp|operationalamplifier', t) and 'bandwidth' not in re.sub(r'op-amp|opamp|operationalamplifier', '', t).replace('bandwidth', '', 0):
        pass
    if re.search(r'op-amp|opamp|operationalamplifier', t) and not re.search(r'modulat|carrierwave|signal-to-noise|decibel|(?<![a-z])db(?![a-z])', t):
        lst = hits.get('9702-LEGACY-communication')
        if lst:
            lst[:] = [x for x in lst if x[0] != 'bandwidth']
            if not lst:
                del hits['9702-LEGACY-communication']
    # MRI uses a magnetic field but is medical imaging: drop the topic-20 hit
    if re.search(r'magneticresonance|nmri|(?<![a-z])mri(?![a-z])', t):
        hits.pop('9702-20', None)


def extra_9709(t, hits):
    """Cross-topic combinations for 9709 (t is normalised text)."""
    static = re.search(r'equilibrium|onthepointof|abouttos|(remains?|is|are)atrest|limiting|stationary', t)
    motion = re.search(r'accelerat|decelerat|distance|speed|velocity|time|moves|travels|slides', t)
    # friction with motion (not equilibrium): Newton's second law on a rough surface
    steady = re.search(r'constantspeed|steadyspeed|constantvelocity', t) and not re.search(r'accelerat|decelerat', t)
    if re.search(r'coefficientoffriction|(a|is|the|are|both|along|on|over)rough', t) and motion and not static and not steady:
        hits.setdefault('9709-M4', []).append(('friction + motion', 3))
    # friction at constant speed: forces balance (F = mu R), i.e. equilibrium
    if re.search(r'coefficientoffriction|frictionalforce|frictionforce', t) and steady:
        hits.setdefault('9709-M1', []).append(('friction at constant speed', 2))
    # kinetic energy lost IN a collision is a momentum-topic question
    if re.search(r'collision|collid|coalesce', t) and re.search(r'energylost|lossofenergy|lossinkinetic|kineticenergylost|lossin(the)?(total)?kinetic|energyislost', t):
        hits.setdefault('9709-M3', []).append(('KE lost in collision', 3))
    # 'brought to (instantaneous) rest' in a collision is not kinematics
    if re.search(r'broughtto(instantaneous)?rest', t) and re.search(r'collision|collid', t) and '9709-M2' in hits:
        hits['9709-M2'] = [x for x in hits['9709-M2'] if x[0] != 'instantaneous rest']
        if not hits['9709-M2']:
            del hits['9709-M2']
    # 'rebound' counts for momentum only with a collision or a wall
    if re.search(r'rebound', t) and re.search(r'collision|wall', t):
        hits.setdefault('9709-M3', []).append(('rebound', 1))
    # string/rope tension in a static set-up is equilibrium, not Newton II
    if re.search(r'tension', t) and static and not re.search(r'accelerat', t):
        hits.setdefault('9709-M1', []).append(('static tension', 1))


OTHERS_W = {'9709': 0.25, '9702': 0.5}   # 9702 questions are mostly single-topic
FORCE_WORDS = r'\dn(?![a-z])|newton|force|tension|resistance|friction|weight|mass|\dkg|thrust|pulley|reaction|power'


def _scores(syl, year, own, stem, others):
    """own + 0.5 x stem + w x other parts of the same question (w = OTHERS_W)."""
    scores, rules = {}, {}
    for text, w, pre in ((own, 1.0, ''), (stem, 0.5, 'stem:'), (others, OTHERS_W[syl], 'ctx:')):
        if not text:
            continue
        for tag, lst in rule_hits(syl, text, year).items():
            scores[tag] = scores.get(tag, 0) + w * sum(x for _, x in lst)
            rules.setdefault(tag, []).extend(pre + n for n, _ in lst)
    return scores, rules


def _bump(scores, rules, own_sc, tag, w, name):
    scores[tag] = scores.get(tag, 0) + w
    own_sc[tag] = own_sc.get(tag, 0) + w
    rules.setdefault(tag, []).append(name)


def question_adjust_9709(alltext_n, stem_n, bare_n, scores, rules, own_sc):
    """Question-level 9709 rules (documented in VALIDATION.md)."""
    # no force, mass or power anywhere in the question -> it cannot be Newton's laws
    if not re.search(FORCE_WORDS, alltext_n):
        for d in (scores, own_sc, rules):
            d.pop('9709-M4', None)
    # power given, part asks for an acceleration at a speed: P = Fv then F = ma (syllabus 4.5)
    if re.search(r'power|\dkw|rateofworking|workingat', stem_n + bare_n) and \
            re.search(r'accelerat|decelerat', bare_n) and re.search(r'speed|\dms-1', bare_n):
        _bump(scores, rules, own_sc, '9709-M5', 3, 'power + instantaneous acceleration')
    # "Find mu": equilibrium -> M1, motion -> M4
    if re.search(r'(find|calculate|determine|showthat)(the)?(value(of)?)?(μ|thecoefficientoffriction|coefficientoffriction)', bare_n):
        q = stem_n + bare_n
        if re.search(r'equilibrium|onthepointof|abouttos|(remains?|is|are)atrest|limiting|doesnotmove|constantspeed', q) and not re.search(r'accelerat|decelerat', q):
            _bump(scores, rules, own_sc, '9709-M1', 3, 'find mu (static)')
        else:
            _bump(scores, rules, own_sc, '9709-M4', 3, 'find mu (moving)')


def rank(syl, scores, qscores):
    order = ORDER[syl]
    def key(tag):
        return (-scores[tag], -qscores.get(tag, 0), order.index(tag) if tag in order else 99)
    return sorted(scores, key=key)


def own_text(p):
    return ' '.join(x for x in (p['intro'], p['preamble'], p['text']) if x)


def tag_question(syl, year, q):
    """Add tags to q['parts'] and q (dict from split.to_dict)."""
    stem = q['stem']
    owns = [own_text(p) for p in q['parts']]
    alltext = ' '.join([stem] + owns)
    qscores, _ = _scores(syl, year, alltext, '', '')
    weighted = {}
    for i, p in enumerate(q['parts']):
        others = ' '.join(o for j, o in enumerate(owns) if j != i)
        scores, rules = _scores(syl, year, owns[i], stem, others)
        # own-text dominance uses the part's own words only (not the shared intro)
        bare = ' '.join(x for x in (p['preamble'], p['text']) if x)
        own_sc = {t: sum(w for _, w in lst) for t, lst in rule_hits(syl, bare, year).items()}
        if syl == '9709':
            question_adjust_9709(norm(alltext), norm(stem), norm(bare), scores, rules, own_sc)
        if syl == '9702' and re.search(r'magneticresonance|nmri|(?<![a-z])mri(?![a-z])', norm(alltext)):
            # MRI questions talk about magnetic fields but are medical imaging
            for d in (scores, own_sc, rules):
                d.pop('9702-20', None)
        if syl == '9702' and '9702-13' in scores and re.search(r'orbit', norm(alltext)) \
                and re.search(r'electron|positron|proton|nucleus|hydrogenatom', norm(alltext)) \
                and not re.search(r'gravit|planet|satellite|moon|earth|(?<![a-z])sun|star', norm(alltext)):
            # an electron 'orbit' held by an electric force is not a gravitational-field question
            for d in (scores, own_sc, rules):
                d.pop('9702-13', None)
        if syl == '9709' and not re.search(FORCE_WORDS, norm(alltext)):
            qscores.pop('9709-M4', None)
        ranked = rank(syl, scores, qscores)
        # the part's own wording wins when it is decisive (own score >= 3)
        strong = [t for t in own_sc if own_sc[t] >= 3 and t not in AS_TAGS and t in scores]
        if strong:
            best = max(strong, key=lambda t: (own_sc[t], scores[t], -ranked.index(t)))
            ranked.remove(best)
            ranked.insert(0, best)
        tags = [{'tag': t, 'score': round(scores[t], 2), 'rules': rules[t]}
                for t in ranked if scores[t] >= THRESHOLD]
        if not [t for t in tags if t['tag'] not in AS_TAGS]:
            # nothing in the part itself ("Find the value of u."): inherit the
            # question's strongest topic, scored on the whole question text
            qbest = [t for t in rank(syl, qscores, qscores) if t not in AS_TAGS and qscores[t] >= THRESHOLD]
            if qbest:
                tags.insert(0, {'tag': qbest[0], 'score': round(scores.get(qbest[0], 0), 2),
                                'rules': ['inherited from question'] + rules.get(qbest[0], [])})
        p['tags'] = tags
        prim = [t['tag'] for t in tags if t['tag'] not in AS_TAGS]
        p['primary_tag'] = prim[0] if prim else None
        for t in tags:
            if t['tag'] in AS_TAGS:
                continue
            weighted[t['tag']] = weighted.get(t['tag'], 0) + t['score'] * (p['marks'] or 1)
    seen = []
    for p in q['parts']:
        for t in p['tags']:
            if t['tag'] not in seen:
                seen.append(t['tag'])
    q['tags'] = sorted(seen, key=lambda t: ORDER[syl].index(t) if t in ORDER[syl] else 99)
    # question primary: the most marks among part primaries (ties: higher total score)
    by_marks = {}
    for p in q['parts']:
        if p['primary_tag']:
            by_marks[p['primary_tag']] = by_marks.get(p['primary_tag'], 0) + (p['marks'] or 0)
    q['primary_tag'] = (max(by_marks, key=lambda t: (by_marks[t], weighted.get(t, 0), -ORDER[syl].index(t)))
                        if by_marks else None)
    return q


# ------------------------------------------------------------------ sims (9709)
VEHICLE = r'(a|the|of|its|this|each)(car|lorry|van|truck|bus|train|engine|locomotive|cyclist|bicycle|motorcycle|motorbike|tractor|coach|vehicle)'


def pick_sim(part, stem):
    """Return a 9709 sim id or None. Uses the part's own text plus the stem."""
    own = norm(own_text(part))
    ctx = norm(stem) + own
    prim = part.get('primary_tag')
    has = lambda rx, s=ctx: re.search(rx, s) is not None
    if has(r'(a|the|of)lift(?!s?up|ed|ing)|elevator'):
        return 'm4-lift'
    if has(r'pulley|(a|the|smooth|fixed)peg|passesover'):
        return 'm4-connected'
    if has(VEHICLE + r'|trailer|caravan') and has(r'power|\dkw|drivingforce|resistance|trailer|caravan|tow|coupling|rateofworking|workingat|(the|its)engine'):
        return 'm4-vehicle'
    if has(r'connectedby|joinedby|attachedtotheendsof') and has(r'string|rope|rod|cable') and prim in ('9709-M4', '9709-M1', '9709-M5'):
        return 'm4-connected'
    if prim == '9709-M3' or has(r'collid|collision|coalesce', own):
        return 'm2-vertical' if has(r'vertically') else 'm3-collisions'
    if prim == '9709-M2':
        if has(FT + r'[vsa]=[^;]{0,30}?(\dt|t\d|t[-+])|differentiat|integrat|(velocity|displacement|acceleration)[^.;]*?isgivenby'):
            return 'm2-calculus'
        if has(r'vertically|(released|dropped)fromrest|bounce|greatestheight|maximumheight'):
            return 'm2-vertical'
        if has(r'velocity-time|v-tgraph|speed-time|displacement-time|constantspeed|decelerat|accelerat|journey|uniformly'):
            return 'm2-journey'
        return None
    plane = has(r'plane|incline|slope|(a|the|is)rough|horizontalsurface|horizontalground|horizontalfloor|horizontaltable|(a|the)rod|(a|the)wire|coefficientoffriction|floor')
    strings = has(r'string|rope|cable|threaded|(a|the)ring')
    if prim == '9709-M1':
        if has(r'ring') and has(r'(a|the)rod|(a|the)wire'):
            return 'm1m4-plane'
        if plane:
            return 'm1m4-plane'
        if strings:
            return 'm1-strings'
        return 'm1-resultant'
    if prim == '9709-M4':
        return 'm1m4-plane' if plane else None
    if prim == '9709-M5':
        return 'm5-energy'
    return None


def qtypes_9709(part, stem):
    """A few high-confidence question-type codes (catalogue numbering in docs/PLAN.md)."""
    t = norm(stem + ' ' + own_text(part))
    out = []
    if re.search(r'resultant', t) and re.search(r'magnitudeanddirection', t):
        out.append('M1.1')
    if re.search(FT + r'v=[^;]{0,30}?(\dt|t\d|t[-+])', t):
        out.append('M2.6')
    elif re.search(FT + r's=[^;]{0,30}?(\dt|t\d|t[-+])', t):
        out.append('M2.7')
    elif re.search(FT + r'a=[^;]{0,30}?(\dt|t\d|t[-+])', t):
        out.append('M2.8')
    if re.search(r'coalesce', t):
        out.append('M3.2')
    if re.search(r'pulley', t):
        out.append('M4.2')
    if re.search(r'(a|the|of)lift(?!s?up|ed|ing)|elevator', t):
        out.append('M4.8')
    if re.search(r'trailer|caravan|coupling|towbar|tow-bar', t):
        out.append('M5.6' if re.search(r'power|\dkw', t) else 'M4.7')
    return out
