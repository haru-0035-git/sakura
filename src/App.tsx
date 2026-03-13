import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const FALL_FLOWER_COUNT = 5;
const FILL_START_COUNT = 5;
const FILL_FLOWER_COUNT = 14;
const MAX_FLOWER_COUNT = FILL_FLOWER_COUNT;
const BLOOM_MS = 1100;
const FILL_BUILD_MS = 6000;
const FALL_CONTINUE_MS = 2400;
const CYCLE_MS = BLOOM_MS + FALL_CONTINUE_MS;

type Mode = "idle" | "pressing" | "falling";
type PatternMode = "fall" | "fill";
type FallSeed = { active: boolean; startFall: number };
type PetalMotion = {
  delay: number;
  driftX: number;
  dropY: number;
  flutter: number;
  spin: number;
  wavePhase: number;
  bob: number;
  arc: number;
};
type FlowerLayout = {
  x: number;
  y: number;
  baseScale: number;
  sway: number;
  petalMotion: PetalMotion[];
};

const smoothstep = (value: number) => value * value * (3 - 2 * value);
const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);

const createFlowerLayouts = (count: number, pattern: PatternMode): FlowerLayout[] => {
  const layouts: FlowerLayout[] = [];
  const minDistance = pattern === "fill" ? 12 : 18;
  const baseScale = pattern === "fill" ? 0.74 : 0.96;
  const swayMin = pattern === "fill" ? 0.55 : 0.7;
  const swayMax = pattern === "fill" ? 1.05 : 1.3;
  const xMin = pattern === "fill" ? 10 : 16;
  const xMax = pattern === "fill" ? 90 : 84;
  const yMin = pattern === "fill" ? 12 : 18;
  const yMax = pattern === "fill" ? 82 : 68;

  while (layouts.length < count) {
    let placed = false;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidateX = randomInRange(xMin, xMax);
      const candidateY = randomInRange(yMin, yMax);
      const separated = layouts.every((layout) => {
        const dx = layout.x - candidateX;
        const dy = layout.y - candidateY;
        return Math.hypot(dx, dy) > minDistance;
      });

      if (!separated) {
        continue;
      }

      layouts.push({
        x: candidateX,
        y: candidateY,
        baseScale,
        sway: randomInRange(swayMin, swayMax),
        petalMotion: Array.from({ length: 5 }, (_, petalIndex) => ({
          delay: petalIndex * 0.045,
          driftX: randomInRange(-54, 54),
          dropY: randomInRange(96, 142),
          flutter: randomInRange(1.0, 1.9),
          spin: randomInRange(-240, 240),
          wavePhase: randomInRange(0, Math.PI * 2),
          bob: randomInRange(4, 14),
          arc: randomInRange(28, 52),
        })),
      });
      placed = true;
      break;
    }

    if (!placed) {
      layouts.push({
        x: xMin + layouts.length * ((xMax - xMin) / Math.max(1, count - 1)),
        y: yMin + (layouts.length % 4) * ((yMax - yMin) / 4),
        baseScale,
        sway: 1,
        petalMotion: Array.from({ length: 5 }, () => ({
          delay: 0,
          driftX: randomInRange(-46, 46),
          dropY: randomInRange(96, 136),
          flutter: randomInRange(1.0, 1.8),
          spin: randomInRange(-220, 220),
          wavePhase: randomInRange(0, Math.PI * 2),
          bob: randomInRange(4, 12),
          arc: randomInRange(24, 44),
        })),
      });
    }
  }

  return layouts;
};

const getPressState = (elapsed: number, pattern: PatternMode) => {
  if (pattern === "fill") {
    const bloomRaw = Math.min(1, elapsed / BLOOM_MS);
    return { bloomProgress: smoothstep(bloomRaw), fallProgress: 0 };
  }

  const cycleElapsed = ((elapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;

  if (cycleElapsed <= BLOOM_MS) {
    const bloomRaw = cycleElapsed / BLOOM_MS;
    return { bloomProgress: smoothstep(bloomRaw), fallProgress: 0 };
  }

  const fallElapsed = cycleElapsed - BLOOM_MS;
  const fallProgress = Math.min(1, fallElapsed / FALL_CONTINUE_MS);

  return { bloomProgress: 1, fallProgress };
};

function App() {
  const [mode, setMode] = useState<Mode>("idle");
  const [pattern, setPattern] = useState<PatternMode>("fall");
  const [pressElapsed, setPressElapsed] = useState(0);
  const [fallElapsed, setFallElapsed] = useState(0);
  const [fillLevel, setFillLevel] = useState(0);
  const [flowerLayouts, setFlowerLayouts] = useState<FlowerLayout[]>(() =>
    createFlowerLayouts(FALL_FLOWER_COUNT, "fall")
  );

  const pressRafRef = useRef<number | null>(null);
  const fallRafRef = useRef<number | null>(null);
  const pressStartedAtRef = useRef(0);
  const fallStartedAtRef = useRef(0);
  const fillBaseLevelRef = useRef(0);
  const cycleIndexRef = useRef(-1);
  const hasBloomedDuringPressRef = useRef(false);
  const fallSeedsRef = useRef<FallSeed[]>(
    Array.from({ length: MAX_FLOWER_COUNT }, () => ({ active: false, startFall: 0 }))
  );
  const activeFlowerCount = pattern === "fill" ? FILL_FLOWER_COUNT : FALL_FLOWER_COUNT;

  const stopPressAnimation = useCallback(() => {
    if (pressRafRef.current !== null) {
      cancelAnimationFrame(pressRafRef.current);
      pressRafRef.current = null;
    }
  }, []);

  const stopFallAnimation = useCallback(() => {
    if (fallRafRef.current !== null) {
      cancelAnimationFrame(fallRafRef.current);
      fallRafRef.current = null;
    }
  }, []);

  const animatePress = useCallback((now: number) => {
    const elapsed = now - pressStartedAtRef.current;
    if (pattern === "fill") {
      const nextLevel = Math.min(1, fillBaseLevelRef.current + elapsed / FILL_BUILD_MS);
      setPressElapsed(elapsed);
      setFillLevel(nextLevel);
      pressRafRef.current = requestAnimationFrame(animatePress);
      return;
    }

    const cycleIndex = pattern === "fill" ? 0 : Math.floor(elapsed / CYCLE_MS);
    if (cycleIndex !== cycleIndexRef.current) {
      cycleIndexRef.current = cycleIndex;
      setFlowerLayouts(createFlowerLayouts(activeFlowerCount, pattern));
    }
    const pressState = getPressState(elapsed, pattern);
    if (pressState.bloomProgress >= 0.995) {
      hasBloomedDuringPressRef.current = true;
    }
    setPressElapsed(elapsed);
    pressRafRef.current = requestAnimationFrame(animatePress);
  }, [activeFlowerCount, pattern]);

  const animateFall = useCallback(
    (now: number) => {
      const elapsed = now - fallStartedAtRef.current;
      setFallElapsed(elapsed);

      if (elapsed >= FALL_CONTINUE_MS) {
        stopFallAnimation();
        setMode("idle");
        setFallElapsed(0);
        cycleIndexRef.current = -1;
        return;
      }

      fallRafRef.current = requestAnimationFrame(animateFall);
    },
    [stopFallAnimation]
  );

  const startPress = useCallback(() => {
    stopPressAnimation();
    stopFallAnimation();

    setMode("pressing");
    setPressElapsed(0);
    setFallElapsed(0);
    cycleIndexRef.current = -1;
    hasBloomedDuringPressRef.current = false;
    fillBaseLevelRef.current = fillLevel;
    if (pattern === "fall") {
      setFlowerLayouts(createFlowerLayouts(activeFlowerCount, pattern));
    }

    pressStartedAtRef.current = performance.now();
    pressRafRef.current = requestAnimationFrame(animatePress);
  }, [activeFlowerCount, animatePress, fillLevel, pattern, stopFallAnimation, stopPressAnimation]);

  const endPress = useCallback(() => {
    if (mode !== "pressing") {
      return;
    }

    stopPressAnimation();

    if (pattern === "fill") {
      setMode("idle");
      setPressElapsed(0);
      cycleIndexRef.current = -1;
      fillBaseLevelRef.current = fillLevel;
      return;
    }

    const seeds = Array.from({ length: activeFlowerCount }, () => {
      const { bloomProgress, fallProgress } = getPressState(pressElapsed, pattern);
      const active = hasBloomedDuringPressRef.current || bloomProgress >= 0.995 || fallProgress > 0;
      return { active, startFall: fallProgress };
    });

    const hasFallingFlower = seeds.some((seed) => seed.active);

    if (!hasFallingFlower) {
      setMode("idle");
      setPressElapsed(0);
      cycleIndexRef.current = -1;
      return;
    }

    fallSeedsRef.current = seeds;
    setMode("falling");
    setPressElapsed(0);
    setFallElapsed(0);
    fallStartedAtRef.current = performance.now();
    fallRafRef.current = requestAnimationFrame(animateFall);
  }, [activeFlowerCount, animateFall, mode, pattern, pressElapsed, stopPressAnimation]);

  useEffect(() => {
    return () => {
      stopPressAnimation();
      stopFallAnimation();
    };
  }, [stopFallAnimation, stopPressAnimation]);

  useEffect(() => {
    stopPressAnimation();
    stopFallAnimation();
    setMode("idle");
    setPressElapsed(0);
    setFallElapsed(0);
    setFillLevel(0);
    fillBaseLevelRef.current = 0;
    cycleIndexRef.current = -1;
    hasBloomedDuringPressRef.current = false;
    setFlowerLayouts(createFlowerLayouts(activeFlowerCount, pattern));
  }, [activeFlowerCount, pattern, stopFallAnimation, stopPressAnimation]);

  const petals = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);

  const status =
    mode === "pressing"
      ? pattern === "fill"
        ? "\u9577\u62bc\u3057\u4e2d\uff1a5\u500b\u304b\u3089\u82b1\u3092\u5897\u3084\u3057\u3066\u3044\u307e\u3059\u3002"
        : "\u9577\u62bc\u3057\u4e2d\uff1a\u958b\u82b1\u3068\u843d\u4e0b\u3092\u30eb\u30fc\u30d7\u4e2d\u3067\u3059\u3002"
      : mode === "falling"
        ? "\u958b\u82b1\u3057\u305f\u82b1\u3060\u3051\u3001\u6307\u3092\u96e2\u3057\u3066\u3082\u843d\u4e0b\u3057\u307e\u3059\u3002"
        : pattern === "fill"
          ? "\u300c\u753b\u9762\u3044\u3063\u3071\u3044\u300d\u30e2\u30fc\u30c9\u3067\u3059\u30025\u500b\u304b\u3089\u59cb\u307e\u308a\u3001\u9577\u62bc\u3057\u3067\u5897\u3048\u305f\u82b1\u306f\u305d\u306e\u307e\u307e\u6b8b\u308a\u307e\u3059\u3002"
          : "\u300c\u821e\u3044\u843d\u3061\u300d\u30e2\u30fc\u30c9\u3067\u3059\u3002\u9577\u62bc\u3057\u3067\u958b\u82b1\u3057\u307e\u3059\u3002";

  return (
    <main
      className="screen"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="scene">
        <div className="garden">
          {flowerLayouts.map((layout, flowerIndex) => {
            let bloomProgress = 0;
            let fallProgress = 0;
            let isVisible = true;

            if (pattern === "fill") {
              const extraFlowerCount = FILL_FLOWER_COUNT - FILL_START_COUNT;
              const fillUnits = fillLevel * (extraFlowerCount + 1);

              if (flowerIndex < FILL_START_COUNT) {
                bloomProgress = Math.min(1, fillUnits);
              } else {
                const stepIndex = flowerIndex - FILL_START_COUNT + 1;
                bloomProgress = Math.max(0, Math.min(1, fillUnits - stepIndex));
                isVisible = bloomProgress > 0;
              }
            }

            if (pattern === "fall" && mode === "pressing") {
              const pressState = getPressState(pressElapsed, pattern);
              bloomProgress = pressState.bloomProgress;
              fallProgress = pressState.fallProgress;
            }

            if (pattern === "fall" && mode === "falling") {
              const seed = fallSeedsRef.current[flowerIndex];
              if (seed?.active) {
                bloomProgress = 1;
                const t = Math.min(1, fallElapsed / FALL_CONTINUE_MS);
                fallProgress = seed.startFall + (1 - seed.startFall) * t;
              } else {
                isVisible = false;
              }
            }

            if (!isVisible) {
              return null;
            }

            const openProgress = smoothstep(Math.max(0, (bloomProgress - 0.12) / 0.88));
            const budTightness = 1 - openProgress;

            let swayX = 0;
            if (mode === "pressing") {
              swayX = Math.sin(pressElapsed / 500 + flowerIndex) * layout.sway * (6 + bloomProgress * 6);
            }
            if (mode === "falling") {
              swayX = Math.sin(fallElapsed / 260 + flowerIndex) * layout.sway * 12;
            }

            const blossomScale = layout.baseScale * (0.56 + openProgress * 0.44);
            const blossomOpacity = 1 - fallProgress * 0.12;
            const centerOpacity = Math.max(0, Math.max(0, (openProgress - 0.58) / 0.42) * (1 - fallProgress * 1.8));
            const stemOpacity = Math.max(0, 1 - fallProgress * 2.6);
            const budOpacity = Math.max(0, budTightness * (1 - fallProgress * 2.2));
            const shellOpacity = Math.max(0, (0.94 - openProgress * 1.15) * (1 - fallProgress * 2.2));

            return (
              <div
                key={flowerIndex}
                className="sakura-item"
                style={{
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="sakura"
                  style={{
                    transform: `translateX(${swayX}px) scale(${blossomScale})`,
                    opacity: blossomOpacity,
                  }}
                  aria-hidden="true"
                >
                  {petals.map((petalIndex) => {
                    const motion = layout.petalMotion[petalIndex];
                    const angle = -90 + petalIndex * 72;
                    const angleRad = (angle * Math.PI) / 180;
                    const spread = 1 + 42 * openProgress;
                    const scaleX = 0.12 + 0.88 * openProgress;
                    const scaleY = 1.1 - 0.14 * openProgress;
                    const lift = 10 - openProgress * 6;
                    const petalOpacity = 0.18 + 0.82 * openProgress;
                    const detachedFall = Math.max(0, (fallProgress - motion.delay) / (1 - motion.delay));
                    const fallMotion = smoothstep(detachedFall);
                    const waveA = Math.sin(
                      fallMotion * Math.PI * 2 * motion.flutter + motion.wavePhase + flowerIndex
                    );
                    const waveB = Math.cos(
                      fallMotion * Math.PI * (motion.flutter + 0.8) + motion.wavePhase * 0.7
                    );
                    const flutterX =
                      motion.driftX * 0.55 * fallMotion +
                      waveA * motion.arc * (0.7 + fallMotion * 0.75) +
                      waveB * (motion.arc * 0.4) +
                      Math.sin(fallMotion * Math.PI * 5 + motion.wavePhase * 1.3) * (motion.arc * 0.22);
                    const flutterY =
                      motion.dropY * Math.pow(fallMotion, 1.28) -
                      Math.sin(fallMotion * Math.PI * 3 + motion.wavePhase) *
                        motion.bob *
                        (1 - fallMotion * 0.35) *
                        fallMotion *
                        0.6;
                    const orbitX = Math.cos(angleRad) * spread;
                    const orbitY = Math.sin(angleRad) * spread;
                    const petalSpin = motion.spin * fallMotion * 0.35 + waveB * 10 * fallMotion;
                    const fallScale = 1 + 0.06 * fallMotion;

                    return (
                      <div
                        key={petalIndex}
                        className="petal-wrap"
                        style={{
                          transform: `translate(-50%, -50%) translate(${orbitX + flutterX}px, calc(${orbitY}px + ${flutterY}vh))`,
                        }}
                      >
                        <div
                          className="petal"
                          style={{
                            transform: `translateY(${lift}px) rotate(${angle + 90 + petalSpin}deg) scale(${scaleX * fallScale}, ${scaleY * fallScale})`,
                            opacity: Math.max(0, petalOpacity * (1 - fallMotion * 0.14)),
                          }}
                        />
                      </div>
                    );
                  })}
                  <div
                    className="bud-shell"
                    style={{
                      opacity: shellOpacity,
                      transform: `translate(-50%, -50%) scale(${0.84 + budTightness * 0.16}, ${0.92 + budTightness * 0.18})`,
                    }}
                  />
                  <div
                    className="center"
                    style={{
                      transform: `scale(${0.52 + openProgress * 0.48})`,
                      opacity: centerOpacity,
                    }}
                  />
                  <div className="bud-tip" style={{ opacity: budOpacity }} />
                  <div className="stem" style={{ opacity: stemOpacity }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <section className="hud">
        <div className="mode-switch" role="group" aria-label="display pattern">
          <button
            className={pattern === "fall" ? "mode-button is-active" : "mode-button"}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setPattern("fall");
            }}
          >
            \u821e\u3044\u843d\u3061
          </button>
          <button
            className={pattern === "fill" ? "mode-button is-active" : "mode-button"}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setPattern("fill");
            }}
          >
            \u753b\u9762\u3044\u3063\u3071\u3044
          </button>
        </div>
        <p>{status}</p>
      </section>
    </main>
  );
}

export default App;
