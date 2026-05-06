import { useEffect, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { StardustStar } from './StardustStar';

type Side = 'left' | 'right' | 'top' | 'bottom';

type Config = {
  side: Side;
  offset: number;
  key: number;
};

// Timing breakdown (all ms):
//   slide-in + jiggle : 0 → 2 000
//   visible + giggles : 2 000 → 122 000  (~2 min)
//   wave + slide-out  : 122 000 → 125 000
const ANIM_MS = 125_000;
const FLING_MS = 650;

const SIDE_VISIBILITY_RATIO: Readonly<Record<Side, number>> = {
  left: 0.7,
  right: 0.7,
  top: 0.8,
  bottom: 0.8,
};

function pct(ms: number) {
  return `${((ms / ANIM_MS) * 100).toFixed(3)}%`;
}

function getResponsiveSize(viewportWidth: number) {
  if (viewportWidth < 480) return 140;
  if (viewportWidth < 640) return 160;
  if (viewportWidth < 960) return 180;
  return 200;
}

function computeOffset(side: Side, size: number) {
  const isHoriz = side === 'left' || side === 'right';
  const viewMax = isHoriz ? window.innerHeight : window.innerWidth;
  return Math.max(20, size * 0.15 + Math.random() * (viewMax - size * 1.3));
}

function makeConfig(prev: Config | undefined, size: number): Config {
  const sides: readonly Side[] = ['left', 'right', 'top', 'bottom'];
  const pool = prev ? sides.filter((s) => s !== prev.side) : sides;
  const side = pool[Math.floor(Math.random() * pool.length)];
  if (side === undefined) throw new Error('PeekingStar: side pool must not be empty');
  return { side, offset: computeOffset(side, size), key: (prev?.key ?? 0) + 1 };
}

export function PeekingStar() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [size, setSize] = useState(() =>
    typeof window !== 'undefined' ? getResponsiveSize(window.innerWidth) : 200
  );
  const [config, setConfig] = useState<Config | null>(null);
  const [flung, setFlung] = useState(false);
  const [flingDone, setFlingDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeRef = useRef(size);
  const isFirstRef = useRef(true);
  const dismissedRef = useRef(false);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const scheduleNext = (prev?: Config) => {
    if (dismissedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = isFirstRef.current
      ? 1500 + Math.random() * 1500
      : 180_000 + Math.random() * 60_000;
    isFirstRef.current = false;
    timerRef.current = setTimeout(() => {
      setConfig(makeConfig(prev, sizeRef.current));
      setFlung(false);
      setFlingDone(false);
    }, delay);
  };

  useEffect(() => {
    const handleResize = () => {
      const nextSize = getResponsiveSize(window.innerWidth);
      sizeRef.current = nextSize;
      setSize(nextSize);
      setConfig((prev) => (prev ? { ...prev, offset: computeOffset(prev.side, nextSize) } : prev));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('resize', handleResize);
      // Reset so StrictMode's second mount uses the short first-appearance delay
      isFirstRef.current = true;
    };
  }, []);

  if (!config || flingDone) return null;

  const { side, offset, key } = config;

  const visible = Math.round(size * SIDE_VISIBILITY_RATIO[side]);
  const hidden = size - visible;
  const animName = `sd-ps-${key.toString()}`;
  const flingAnimName = `sd-ps-fling-${key.toString()}`;

  // Lean direction: away from the edge
  const r = side === 'left' || side === 'top' ? -1 : 1;
  const sideRotation =
    side === 'top'
      ? ' rotate(180deg)'
      : side === 'left'
        ? ' rotate(55deg)'
        : side === 'right'
          ? ' rotate(-55deg)'
          : '';

  const tHide =
    side === 'left'
      ? `translateX(-${size.toString()}px)${sideRotation}`
      : side === 'right'
        ? `translateX(${size.toString()}px)${sideRotation}`
        : side === 'top'
          ? `translateY(-${size.toString()}px)${sideRotation}`
          : `translateY(${size.toString()}px)${sideRotation}`;

  const tPeek =
    side === 'left'
      ? `translateX(-${hidden.toString()}px)${sideRotation}`
      : side === 'right'
        ? `translateX(${hidden.toString()}px)${sideRotation}`
        : side === 'top'
          ? `translateY(-${hidden.toString()}px)${sideRotation}`
          : `translateY(${hidden.toString()}px)${sideRotation}`;

  // Fling traverses the full screen; opacity stays 1 until past the far edge
  const tFling =
    side === 'left'
      ? `translateX(150vw) rotate(${(r * 720).toString()}deg)`
      : side === 'right'
        ? `translateX(-150vw) rotate(${(r * 720).toString()}deg)`
        : side === 'top'
          ? `translateY(150vh) rotate(720deg)`
          : `translateY(-150vh) rotate(720deg)`;

  const posStyle =
    side === 'left'
      ? { left: 0, top: offset }
      : side === 'right'
        ? { right: 0, top: offset }
        : side === 'top'
          ? { top: 0, left: offset }
          : { bottom: 0, left: offset };

  const handleClick = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setFlung(true);
  };

  // Giggle pattern varies by key so each visit feels different
  const gSign = key % 2 === 0 ? 1 : -1;

  const normalKeyframes = {
    // — slide in fast (0 → 800ms) + spring jiggle (800 → 2000ms)
    [pct(0)]: { transform: tHide },
    [pct(400)]: { transform: `${tPeek} rotate(${(r * -16).toString()}deg) scale(1.12)` },
    [pct(800)]: { transform: `${tPeek} rotate(${(r * 9).toString()}deg) scale(0.94)` },
    [pct(1100)]: { transform: `${tPeek} rotate(${(r * -5).toString()}deg) scale(1.03)` },
    [pct(1400)]: { transform: `${tPeek} rotate(${(r * 2).toString()}deg)` },
    [pct(2000)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    // — giggles every ~11s across the 2-min visible window, each ~600ms long
    [pct(10_000)]: { transform: `${tPeek} rotate(${(gSign * 3).toString()}deg) scale(1.04)` },
    [pct(10_300)]: { transform: `${tPeek} rotate(${(gSign * -2).toString()}deg)` },
    [pct(10_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(21_000)]: { transform: `${tPeek} rotate(${(gSign * -2.5).toString()}deg) scale(0.97)` },
    [pct(21_300)]: { transform: `${tPeek} rotate(${(gSign * 1.5).toString()}deg)` },
    [pct(21_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(33_000)]: { transform: `${tPeek} rotate(${(gSign * 2).toString()}deg) scale(1.03)` },
    [pct(33_300)]: { transform: `${tPeek} rotate(${(gSign * -3).toString()}deg) scale(0.98)` },
    [pct(33_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(45_000)]: { transform: `${tPeek} rotate(${(gSign * -3).toString()}deg) scale(1.02)` },
    [pct(45_300)]: { transform: `${tPeek} rotate(${(gSign * 2).toString()}deg)` },
    [pct(45_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(57_000)]: { transform: `${tPeek} rotate(${(gSign * 2.5).toString()}deg) scale(0.96)` },
    [pct(57_300)]: { transform: `${tPeek} rotate(${(gSign * -1.5).toString()}deg) scale(1.02)` },
    [pct(57_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(69_000)]: { transform: `${tPeek} rotate(${(gSign * -2).toString()}deg) scale(1.04)` },
    [pct(69_300)]: { transform: `${tPeek} rotate(${(gSign * 3).toString()}deg) scale(0.97)` },
    [pct(69_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(81_000)]: { transform: `${tPeek} rotate(${(gSign * 3).toString()}deg)` },
    [pct(81_300)]: { transform: `${tPeek} rotate(${(gSign * -2).toString()}deg) scale(1.02)` },
    [pct(81_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(93_000)]: { transform: `${tPeek} rotate(${(gSign * -2.5).toString()}deg) scale(0.98)` },
    [pct(93_300)]: { transform: `${tPeek} rotate(${(gSign * 1).toString()}deg)` },
    [pct(93_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    [pct(107_000)]: { transform: `${tPeek} rotate(${(gSign * 2).toString()}deg) scale(1.03)` },
    [pct(107_300)]: { transform: `${tPeek} rotate(${(gSign * -3).toString()}deg)` },
    [pct(107_600)]: { transform: `${tPeek} rotate(0deg) scale(1)` },

    // — wave goodbye then slide out (122 000 → 125 000ms)
    [pct(122_000)]: { transform: `${tPeek} rotate(0deg) scale(1)` },
    [pct(123_000)]: { transform: `${tPeek} rotate(${(r * 6).toString()}deg) scale(0.97)` },
    [pct(123_800)]: { transform: `${tPeek} rotate(${(r * -3).toString()}deg)` },
    [pct(ANIM_MS)]: { transform: tHide },
  };

  const flingKeyframes = {
    '0%': { transform: tPeek, opacity: 1 },
    // Spin up while still mostly on-screen
    '20%': { transform: `${tPeek} rotate(${(r * 180).toString()}deg) scale(1.15)`, opacity: 1 },
    // Hit the far edge at ~80% — start fading only then
    '80%': { opacity: 1 },
    '100%': { transform: tFling, opacity: 0 },
  };

  const boxKey = flung ? `fling-${key.toString()}` : key.toString();

  return (
    <Box
      key={boxKey}
      aria-hidden
      onClick={handleClick}
      onAnimationEnd={(e) => {
        // Guard against bubbled events from children (StardustStar may animate internally)
        const expected = flung ? flingAnimName : animName;
        if (e.animationName !== expected) return;

        if (flung) {
          setFlingDone(true);
        } else {
          scheduleNext(config);
        }
      }}
      sx={{
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'auto',
        cursor: 'pointer',
        width: size,
        height: size,
        ...posStyle,
        animation: flung
          ? `${flingAnimName} ${FLING_MS.toString()}ms cubic-bezier(0.2, 0, 0.6, 1) forwards`
          : `${animName} ${ANIM_MS.toString()}ms linear forwards`,

        [`@keyframes ${flung ? flingAnimName : animName}`]: flung
          ? flingKeyframes
          : normalKeyframes,
      }}
    >
      <StardustStar size={size} isDark={isDark} />
    </Box>
  );
}
