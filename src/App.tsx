import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HOLD_MS = 1400;

function App() {
  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [bloomed, setBloomed] = useState(false);

  const rafRef = useRef<number | null>(null);
  const pressStartedAtRef = useRef<number>(0);
  const baseProgressRef = useRef<number>(0);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const animate = useCallback(
    (now: number) => {
      const elapsed = now - pressStartedAtRef.current;
      const next = Math.min(1, baseProgressRef.current + elapsed / HOLD_MS);
      setProgress(next);

      if (next >= 1) {
        setBloomed(true);
        setIsPressing(false);
        stopAnimation();
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [stopAnimation]
  );

  const startPress = useCallback(() => {
    if (bloomed) {
      return;
    }

    setIsPressing(true);
    pressStartedAtRef.current = performance.now();
    baseProgressRef.current = progress;
    stopAnimation();
    rafRef.current = requestAnimationFrame(animate);
  }, [animate, bloomed, progress, stopAnimation]);

  const endPress = useCallback(() => {
    setIsPressing(false);
    stopAnimation();
    if (!bloomed) {
      setProgress(0);
      baseProgressRef.current = 0;
    }
  }, [bloomed, stopAnimation]);

  const resetBloom = useCallback(() => {
    stopAnimation();
    setIsPressing(false);
    setBloomed(false);
    setProgress(0);
    baseProgressRef.current = 0;
  }, [stopAnimation]);

  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  const petals = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);
  const status = bloomed
    ? "\u685c\u304c\u6e80\u958b\u3067\u3059\u3002\u300c\u3084\u308a\u76f4\u3057\u300d\u3067\u6700\u521d\u304b\u3089\u3084\u308a\u76f4\u305b\u307e\u3059\u3002"
    : isPressing
      ? "\u305d\u306e\u307e\u307e\u9577\u62bc\u3057\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
      : "\u753b\u9762\u3092\u9577\u62bc\u3057\u3057\u3066\u685c\u3092\u958b\u82b1\u3055\u305b\u3066\u304f\u3060\u3055\u3044\u3002";

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
        <div className="sakura" aria-hidden="true">
          {petals.map((index) => {
            const angle = index * 72;
            const spread = 58 * progress;
            const scale = 0.24 + 0.76 * progress;
            const lift = 12 - progress * 10;

            return (
              <div
                key={index}
                className="petal-wrap"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(${-spread}px)`,
                }}
              >
                <div
                  className="petal"
                  style={{
                    transform: `translateY(${lift}px) scale(${scale})`,
                  }}
                />
              </div>
            );
          })}
          <div className="center" style={{ transform: `scale(${0.72 + progress * 0.28})` }} />
          <div className="stem" />
        </div>
      </div>
      <section className="hud">
        <p>{status}</p>
        <div className="meter" role="img" aria-label={`Bloom progress ${Math.round(progress * 100)}%`}>
          <div className="meter-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button
          className="reset-button"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            resetBloom();
          }}
        >
          \u3084\u308a\u76f4\u3057
        </button>
      </section>
    </main>
  );
}

export default App;
