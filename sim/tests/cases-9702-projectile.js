const P = require('../engine/phys-projectile.js');
const g = 9.81;
/* Hand working:
   u20 θ30: uy = 10, T = 2·10/9.81 = 2.03874, R = 400·sin60°/9.81 = 35.3119, H = 100/19.62 = 5.09684.
   u15 θ0 h20: t = √(40/9.81) = 2.01928, x = 15t = 30.2891, vy = −9.81t = −19.8091, v = √(225+392.40) = 24.8475,
              angle below = atan(19.8091/15) = 52.866°.
   u25 θ40 h1.5: uy = 16.0697, ux = 19.1511; ½g t² − uy t − 1.5 = 0 → t = (16.0697 + √(258.235 + 29.43))/9.81 = 3.36701,
              R = 19.1511·3.36701 = 64.482, H = 1.5 + 258.235/19.62 = 14.6618.
   u20 θ90: T = 4.07747, H = 20.3874. */
module.exports = {
  'level ground u20 θ30': () => {
    const s = P.solve({ u: 20, theta: 30, h0: 0, yL: 0, g });
    approx(s.land.t, 2.03874); approx(s.land.x, 35.3119); approx(s.apex.H, 5.09684);
    approx(s.levelRange, 35.3119); approx(s.levelTime, 2.03874);
    approx(s.land.speed, 20); approx(s.land.angleBelow, 30);
  },
  'horizontal from 20 m cliff at 15 m/s': () => {
    const s = P.solve({ u: 15, theta: 0, h0: 20, yL: 0, g });
    check(s.apex === null, 'no apex when launched horizontally');
    approx(s.land.t, 2.01928); approx(s.land.x, 30.2891); approx(s.land.speed, 24.8475); approx(s.land.angleBelow, 52.866);
    approx(s.impactSpeedEnergy, 24.8475); check(s.levelRange === null, 'level-ground formula must not be offered');
  },
  'u25 θ40 from 1.5 m': () => {
    const s = P.solve({ u: 25, theta: 40, h0: 1.5, yL: 0, g });
    approx(s.land.t, 3.36701); approx(s.land.x, 64.4820); approx(s.apex.H, 14.6618);
  },
  'vertical u20': () => {
    const s = P.solve({ u: 20, theta: 90, h0: 0, yL: 0, g });
    approx(s.land.t, 4.07747); approx(s.apex.H, 20.3874); approx(s.land.x, 0, 1e-6);
  },
  'complementary angles give equal range': () => {
    const a = P.solve({ u: 18, theta: 25, h0: 0, yL: 0, g }), b = P.solve({ u: 18, theta: 65, h0: 0, yL: 0, g });
    approx(a.land.x, b.land.x, 1e-9);
  },
  'target above apex never reached': () => {
    const s = P.solve({ u: 10, theta: 30, h0: 0, yL: 5, g });   // apex = 25/19.62 = 1.274 m < 5 m
    check(s.land === null && s.disc < 0, 'no landing');
  },
  'landing on a roof above launch: two crossings, land on the way down': () => {
    const s = P.solve({ u: 20, theta: 50, h0: 0, yL: 5, g });
    check(s.crossings.length === 2, 'two crossings'); check(s.land.vy < 0, 'lands while descending');
    approx(s.stateAt(s.land.t).y, 5, 1e-9);
  },
  'thrown downwards from a cliff': () => {
    const s = P.solve({ u: 10, theta: -20, h0: 30, yL: 0, g });
    check(s.apex === null); approx(s.stateAt(s.land.t).y, 0, 1e-9); check(s.land.t > 0);
  },
  'wall height check matches stateAt': () => {
    const s = P.solve({ u: 20, theta: 30, h0: 0, yL: 0, g }); const w = P.heightAt(s, 20);
    // y(20) = 20 tan30 − 9.81·400/(2·400·0.75) = 11.5470 − 6.54 = 5.0070
    approx(w.y, 5.00700, 1e-4);
  },
  'two angles to hit a target': () => {
    const th = P.anglesToHit(20, 35.3119, 0, g);
    approx(th[0], 30, 1e-4); approx(th[1], 60, 1e-4);
  },
  'qualitative drag path lands short of the vacuum range': () => {
    const pts = P.dragPath({ u: 20, theta: 30, h0: 0, yL: 0, g }, 0.02);
    check(pts[pts.length - 1][1] < 35.3119, 'shorter range with drag');
  }
};
