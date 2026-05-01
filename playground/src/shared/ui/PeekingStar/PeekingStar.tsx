import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

type Side = 'left' | 'right' | 'top' | 'bottom';

type Config = {
  side: Side;
  offset: number;
  key: number;
};

const ANIM_MS = 3600;
const VISIBILITY_RATIO = 0.56;

function getResponsiveSize(viewportWidth: number) {
  if (viewportWidth < 480) {
    return 140;
  }
  if (viewportWidth < 640) {
    return 160;
  }
  if (viewportWidth < 960) {
    return 180;
  }
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
  if (side === undefined) {
    throw new Error('PeekingStar: side pool must not be empty');
  }
  return { side, offset: computeOffset(side, size), key: (prev?.key ?? 0) + 1 };
}

// 5-pointed star, 200×200 viewBox, outer r=90 inner r=36
const STAR_D =
  'M100,10 L121.2,70.9 L185.6,72.2 L134.2,111.1 L152.9,172.8 L100,136 L47.1,172.8 L65.8,111.1 L14.4,72.2 L78.8,70.9 Z';

export function PeekingStar() {
  const [size, setSize] = useState(() =>
    typeof window !== 'undefined' ? getResponsiveSize(window.innerWidth) : 200
  );
  const [config, setConfig] = useState<Config | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeRef = useRef(size);
  const isFirstRef = useRef(true);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const scheduleNext = (prev?: Config) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const delay = isFirstRef.current ? 1500 + Math.random() * 1500 : 4000 + Math.random() * 5000;
    isFirstRef.current = false;
    timerRef.current = setTimeout(() => {
      setConfig(makeConfig(prev, sizeRef.current));
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!config) {
    return null;
  }

  const { side, offset, key } = config;

  const visible = Math.round(size * VISIBILITY_RATIO);
  const hidden = size - visible;
  const animName = `sd-ps-${key.toString()}`;

  // Jiggle direction: lean away from the edge the star came from
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

  const posStyle =
    side === 'left'
      ? { left: 0, top: offset }
      : side === 'right'
        ? { right: 0, top: offset }
        : side === 'top'
          ? { top: 0, left: offset }
          : { bottom: 0, left: offset };

  return (
    <Box
      key={key}
      aria-hidden
      onAnimationEnd={() => {
        scheduleNext(config);
      }}
      sx={{
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'none',
        width: size,
        height: size,
        ...posStyle,
        animation: `${animName} ${ANIM_MS.toString()}ms ease-in-out forwards`,

        [`@keyframes ${animName}`]: {
          '0%': { transform: tHide },
          // slide in with a bubbly overshoot
          '17%': { transform: `${tPeek} rotate(${(r * -14).toString()}deg) scale(1.1)` },
          '25%': { transform: `${tPeek} rotate(${(r * 8).toString()}deg) scale(0.95)` },
          '32%': { transform: `${tPeek} rotate(${(r * -6).toString()}deg) scale(1.04)` },
          '39%': { transform: `${tPeek} rotate(${(r * 3).toString()}deg)` },
          '46%': { transform: `${tPeek} rotate(${(r * -1.5).toString()}deg)` },
          // settled smile
          '54%': { transform: `${tPeek} rotate(0deg) scale(1)` },
          '68%': { transform: `${tPeek} rotate(0deg) scale(1)` },
          // tiny wave before leaving
          '76%': { transform: `${tPeek} rotate(${(r * 5).toString()}deg) scale(0.98)` },
          '83%': { transform: `${tPeek} rotate(${(r * -3).toString()}deg)` },
          // slide back out
          '100%': { transform: tHide },
        },
      }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} overflow="visible">
        <defs>
          <filter id="sd-ps-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="sd-ps-fill" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#fbc8ff" />
            <stop offset="55%" stopColor="#e040fb" />
            <stop offset="100%" stopColor="#8e00b0" />
          </radialGradient>
        </defs>

        {/* star body */}
        <path
          d={STAR_D}
          fill="url(#sd-ps-fill)"
          stroke="#c000e0"
          strokeWidth="2"
          filter="url(#sd-ps-glow)"
        />

        {/* rosy cheeks */}
        <ellipse cx="76" cy="109" rx="13" ry="8" fill="#ff6ec7" opacity="0.38" />
        <ellipse cx="124" cy="109" rx="13" ry="8" fill="#ff6ec7" opacity="0.38" />

        {/* eyes — white sclera */}
        <circle cx="83" cy="88" r="9" fill="white" />
        <circle cx="117" cy="88" r="9" fill="white" />
        {/* pupils — offset up-left for cute look */}
        <circle cx="81" cy="86" r="5" fill="#2a002a" />
        <circle cx="115" cy="86" r="5" fill="#2a002a" />
        {/* eye shine */}
        <circle cx="83" cy="84" r="2" fill="white" />
        <circle cx="117" cy="84" r="2" fill="white" />

        {/* smile */}
        <path
          d="M 77,110 Q 100,134 123,110"
          fill="none"
          stroke="#2a002a"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* nose */}
        <circle cx="100" cy="103" r="2.5" fill="#2a002a" opacity="0.45" />

        {/* sparkles around tips */}
        <text x="16" y="50" fontSize="13" fill="#fbc8ff" opacity="0.9">
          ✦
        </text>
        <text x="160" y="50" fontSize="10" fill="#fbc8ff" opacity="0.85">
          ✧
        </text>
        <text x="172" y="148" fontSize="9" fill="#fbc8ff" opacity="0.75">
          ✦
        </text>
        <text x="10" y="152" fontSize="12" fill="#fbc8ff" opacity="0.8">
          ✧
        </text>
        <text x="88" y="188" fontSize="8" fill="#fbc8ff" opacity="0.7">
          ✦
        </text>
      </svg>
    </Box>
  );
}
