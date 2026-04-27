import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Typography } from '@mui/material';

type ShootingStarSpec = {
  top: string;
  keyframe: string;
  duration: number;
  delay: number;
  length: number;
  height: number;
};

// Four racers — different speeds and angles so they naturally lap and overtake each other.
const SHOOTING_STARS: ShootingStarSpec[] = [
  { top: '28%', keyframe: 'sd-race-a', duration: 7, delay: 0, length: 90, height: 2 },
  { top: '36%', keyframe: 'sd-race-b', duration: 11, delay: 1.8, length: 65, height: 1.5 },
  { top: '44%', keyframe: 'sd-race-c', duration: 9, delay: 4.5, length: 80, height: 2 },
  { top: '32%', keyframe: 'sd-race-d', duration: 13, delay: 2.5, length: 50, height: 1.5 },
];

// Deterministic seeded RNG — same stars every render, no hydration drama.
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type StarSpec = {
  top: string;
  left: string;
  size: string;
  delay: number;
  duration: number;
  symbol: string;
  colorKey: 'primary.main' | 'primary.light' | 'secondary.main' | 'secondary.light';
};

const SYMBOLS = ['✦', '✧', '★', '·', '✦', '·', '·', '✧'];
const COLORS = [
  'primary.main',
  'primary.light',
  'secondary.main',
  'secondary.light',
] as const satisfies StarSpec['colorKey'][];

const STAR_COUNT = 48;

const STARS: StarSpec[] = (() => {
  const rng = seededRng(2025);
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    top: `${Math.round(rng() * 90 + 5).toString()}%`,
    left: `${Math.round(rng() * 96 + 2).toString()}%`,
    size: `${(rng() * 0.6 + 0.55).toFixed(2)}rem`,
    delay: rng() * 4,
    duration: rng() * 2.5 + 1.8,
    symbol: SYMBOLS[i % SYMBOLS.length] ?? '✦',
    colorKey: COLORS[i % COLORS.length] ?? 'primary.main',
  }));
})();

export function StarfieldBanner() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: 110, sm: 140 },
        borderRadius: 2,
        overflow: 'hidden',
        mb: 4,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #050010 0%, #12002a 40%, #1a0040 70%, #0a0020 100%)'
            : 'linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 40%, #e879f9 70%, #fae8ff 100%)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? 'inset 0 0 60px rgba(217,70,239,0.08)'
            : 'inset 0 0 60px rgba(217,70,239,0.12)',

        '@keyframes sd-twinkle': {
          '0%, 100%': { opacity: 0.08, transform: 'scale(0.8)' },
          '50%': { opacity: 1, transform: 'scale(1.15)' },
        },
        '@keyframes sd-drift': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        '@keyframes sd-glow-pulse': {
          '0%, 100%': { textShadow: '0 0 8px #d946ef, 0 0 20px #d946ef66' },
          '50%': { textShadow: '0 0 16px #e879f9, 0 0 40px #d946ef99, 0 0 60px #a21caf44' },
        },
        '@keyframes sd-race-a': {
          '0%': { transform: 'rotate(-14deg) translateX(-120px)', opacity: 0 },
          '2%': { opacity: 0.95 },
          '17%': { transform: 'rotate(-14deg) translateX(1800px)', opacity: 0 },
          '100%': { transform: 'rotate(-14deg) translateX(-120px)', opacity: 0 },
        },
        '@keyframes sd-race-b': {
          '0%': { transform: 'rotate(-10deg) translateX(-90px)', opacity: 0 },
          '2%': { opacity: 0.7 },
          '17%': { transform: 'rotate(-10deg) translateX(1800px)', opacity: 0 },
          '100%': { transform: 'rotate(-10deg) translateX(-90px)', opacity: 0 },
        },
        '@keyframes sd-race-c': {
          '0%': { transform: 'rotate(-17deg) translateX(-130px)', opacity: 0 },
          '2%': { opacity: 0.85 },
          '17%': { transform: 'rotate(-17deg) translateX(1800px)', opacity: 0 },
          '100%': { transform: 'rotate(-17deg) translateX(-130px)', opacity: 0 },
        },
        '@keyframes sd-race-d': {
          '0%': { transform: 'rotate(-12deg) translateX(-80px)', opacity: 0 },
          '2%': { opacity: 0.6 },
          '17%': { transform: 'rotate(-12deg) translateX(1800px)', opacity: 0 },
          '100%': { transform: 'rotate(-12deg) translateX(-80px)', opacity: 0 },
        },
      }}
    >
      {STARS.map((s, i) => (
        <Typography
          key={i}
          component="span"
          sx={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            fontSize: s.size,
            lineHeight: 1,
            color: s.colorKey,
            animation: `sd-twinkle ${s.duration.toFixed(1)}s ease-in-out ${s.delay.toFixed(1)}s infinite`,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {s.symbol}
        </Typography>
      ))}

      {SHOOTING_STARS.map((s, i) => (
        <Box
          key={`shoot-${String(i)}`}
          sx={{
            position: 'absolute',
            top: s.top,
            left: 0,
            width: s.length,
            height: s.height,
            borderRadius: 1,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.9) 75%, white 100%)'
                : 'linear-gradient(to right, transparent 0%, rgba(107,0,128,0.85) 75%, #d946ef 100%)',
            animation: `${s.keyframe} ${s.duration.toString()}s linear ${s.delay.toString()}s infinite`,
            animationFillMode: 'backwards',
            pointerEvents: 'none',
          }}
        />
      ))}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          animation: 'sd-drift 6s ease-in-out infinite',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon
            sx={{
              fontSize: { xs: '1.4rem', sm: '1.75rem' },
              color: 'primary.main',
              animation: 'sd-twinkle 2.2s ease-in-out 0.3s infinite',
            }}
          />
          <Typography
            variant="h5"
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.4rem', sm: '1.75rem' },
              letterSpacing: '0.05em',
              color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : '#6b0080'),
              animation: 'sd-glow-pulse 3s ease-in-out infinite',
            }}
          >
            Stardust
          </Typography>
          <AutoAwesomeIcon
            sx={{
              fontSize: { xs: '1.4rem', sm: '1.75rem' },
              color: 'primary.main',
              animation: 'sd-twinkle 2.2s ease-in-out 1.1s infinite',
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(80,0,100,0.6)',
            letterSpacing: '0.12em',
            fontStyle: 'italic',
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
          }}
        >
          Zero deps. Infinite stars. Finite bugs.™
        </Typography>
      </Box>
    </Box>
  );
}
