import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const FLOWER_COUNT = 5;
const CYCLE_MS = 5200;
const BLOOM_PHASE_END = 0.64;
const FALL_CONTINUE_MS = 1600;
const FLOWER_LAYOUT = [
  { x: 18, y: 32, baseScale: 0.92 },
  { x: 41, y: 18, baseScale: 1.03 },
  { x: 67, y: 40, baseScale: 0.87 },
  { x: 82, y: 24, baseScale: 0.98 },
  { x: 50, y: 56, baseScale: 0.94 },
];

type Mode = "idle" | "pressing" | "falling";
type FallSeed = { active: boolean; startFall: number };

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const getPressState = (elapsed: number) => {
  const phase = ((elapsed / CYCLE_MS) % 1 + 1) % 1;
  const bloomRaw = Math.min(1, phase / BLOOM_PHASE_END);
  const bloomProgress = smoothstep(bloomRaw);

  const fallRaw =
    phase <= BLOOM_PHASE_END ? 0 : Math.min(1, (phase - BLOOM_PHASE_END) / (1 - BLOOM_PHASE_END));
  const fallProgress = fallRaw * fallRaw;

  return { bloomProgress, fallProgress };
};

function App() {
  const [mode, setMode] = useState<Mode>("idle");
  const [pressElapsed, setPressElapsed] = useState(0);
  const [fallElapsed, setFallElapsed] = useState(0);

  const pressRafRef = useRef<number | null>(null);
  const fallRafRef = useRef<number | null>(null);
  const pressStartedAtRef = useRef(0);
  const fallStartedAtRef = useRef(0);
  const hasBloomedDuringPressRef = useRef(false);
  const fallSeedsRef = useRef<FallSeed[]>(
    Array.from({ length: FLOWER_COUNT }, () => ({ active: false, startFall: 0 }))
  );

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
    const pressState = getPressState(elapsed);
    if (pressState.bloomProgress >= 0.995) {
      hasBloomedDuringPressRef.current = true;
    }
    setPressElapsed(elapsed);
    pressRafRef.current = requestAnimationFrame(animatePress);
  }, []);

  const animateFall = useCallback(
    (now: number) => {
      const elapsed = now - fallStartedAtRef.current;
      setFallElapsed(elapsed);

      if (elapsed >= FALL_CONTINUE_MS) {
        stopFallAnimation();
        setMode("idle");
        setFallElapsed(0);
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
    hasBloomedDuringPressRef.current = false;

    pressStartedAtRef.current = performance.now();
    pressRafRef.current = requestAnimationFrame(animatePress);
  }, [animatePress, stopFallAnimation, stopPressAnimation]);

  const endPress = useCallback(() => {
    if (mode !== "pressing") {
      return;
    }

    stopPressAnimation();

    const seeds = Array.from({ length: FLOWER_COUNT }, () => {
      const { bloomProgress, fallProgress } = getPressState(pressElapsed);
      const active = hasBloomedDuringPressRef.current || bloomProgress >= 0.995 || fallProgress > 0;
      return { active, startFall: fallProgress };
    });

    const hasFallingFlower = seeds.some((seed) => seed.active);

    if (!hasFallingFlower) {
      setMode("idle");
      setPressElapsed(0);
      return;
    }

    fallSeedsRef.current = seeds;
    setMode("falling");
    setPressElapsed(0);
    setFallElapsed(0);
    fallStartedAtRef.current = performance.now();
    fallRafRef.current = requestAnimationFrame(animateFall);
  }, [animateFall, mode, pressElapsed, stopPressAnimation]);

  useEffect(() => {
    return () => {
      stopPressAnimation();
      stopFallAnimation();
    };
  }, [stopFallAnimation, stopPressAnimation]);

  const petals = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);
  const flowers = useMemo(() => Array.from({ length: FLOWER_COUNT }, (_, i) => i), []);

  const status =
    mode === "pressing"
      ? "\u9577\u62bc\u3057\u4e2d\uff1a\u958b\u82b1\u3068\u843d\u4e0b\u3092\u30eb\u30fc\u30d7\u4e2d\u3067\u3059\u3002"
      : mode === "falling"
        ? "\u958b\u82b1\u3057\u305f\u82b1\u3060\u3051\u3001\u6307\u3092\u96e2\u3057\u3066\u3082\u843d\u4e0b\u3057\u307e\u3059\u3002"
        : "\u753b\u9762\u3092\u9577\u62bc\u3057\u3059\u308b\u3068\u958b\u82b1\u3057\u307e\u3059\u3002";

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
          {flowers.map((flowerIndex) => {
            const layout = FLOWER_LAYOUT[flowerIndex];
            let bloomProgress = 0;
            let fallProgress = 0;

            if (mode === "pressing") {
              const pressState = getPressState(pressElapsed);
              bloomProgress = pressState.bloomProgress;
              fallProgress = pressState.fallProgress;
            }

            if (mode === "falling") {
              const seed = fallSeedsRef.current[flowerIndex];
              if (seed?.active) {
                bloomProgress = 1;
                const t = Math.min(1, fallElapsed / FALL_CONTINUE_MS);
                fallProgress = seed.startFall + (1 - seed.startFall) * t;
              }
            }

            const budTightness = 1 - bloomProgress;
            const dropYVh = fallProgress * (130 + flowerIndex * 6);

            let swayX = 0;
            if (mode === "pressing") {
              swayX = Math.sin(pressElapsed / 500 + flowerIndex) * (6 + bloomProgress * 6);
            }
            if (mode === "falling") {
              swayX = Math.sin(fallElapsed / 260 + flowerIndex) * 12;
            }

            const blossomScale = layout.baseScale * (0.72 + bloomProgress * 0.3);
            const blossomOpacity = 1 - fallProgress * 0.28;

            return (
              <div
                key={flowerIndex}
                className="sakura-item"
                style={{
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  transform: `translate(-50%, ${dropYVh}vh)`,
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
                    const angle = petalIndex * 72;
                    const spread = 10 + 54 * bloomProgress;
                    const scaleX = 0.34 + 0.66 * bloomProgress;
                    const scaleY = 0.88 + 0.12 * bloomProgress;
                    const lift = 14 - bloomProgress * 10;
                    const curl = (petalIndex - 2) * 6 * budTightness;
                    const tilt = (petalIndex % 2 === 0 ? -1 : 1) * 10 * budTightness;
                    const petalOpacity = 0.78 + 0.22 * bloomProgress;

                    return (
                      <div
                        key={petalIndex}
                        className="petal-wrap"
                        style={{
                          transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(${-spread}px)`,
                        }}
                      >
                        <div
                          className="petal"
                          style={{
                            transform: `translateY(${lift}px) rotate(${curl + tilt}deg) scale(${scaleX}, ${scaleY})`,
                            opacity: petalOpacity,
                          }}
                        />
                      </div>
                    );
                  })}
                  <div
                    className="center"
                    style={{
                      transform: `scale(${0.68 + bloomProgress * 0.32})`,
                      opacity: 0.2 + bloomProgress * 0.8,
                    }}
                  />
                  <div className="bud-tip" style={{ opacity: budTightness }} />
                  <div className="stem" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <section className="hud">
        <p>{status}</p>
      </section>
    </main>
  );
}

export default App;
