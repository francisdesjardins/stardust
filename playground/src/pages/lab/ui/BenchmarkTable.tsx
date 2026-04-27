import BoltIcon from '@mui/icons-material/Bolt';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import benchReport, { type BenchEntry } from 'virtual:bench-results';
import { isNullish } from '@/shared/lib/is-nullish';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

function formatOps(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

function formatNs(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} ms`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)} µs`;
  }
  return `${String(n)} ns`;
}

function opsColor(n: number): 'success' | 'warning' | 'info' {
  if (n >= 10_000_000) {
    return 'success';
  }
  if (n >= 1_000_000) {
    return 'warning';
  }
  return 'info';
}

function cvColor(cv: number): 'success' | 'warning' | 'error' {
  if (cv <= 3) {
    return 'success';
  }
  if (cv <= 10) {
    return 'warning';
  }
  return 'error';
}

const GROUP_CODE_KEYS: Record<string, string> = {
  createStoreSubscription: 'bench-create-store-subscription',
  'createStore — get / set': 'bench-create-store-get-set',
  'createStore — update': 'bench-create-store-update',
  'Path utilities': 'bench-path-utilities',
  'Store — getByPath / setByPath': 'bench-store-get-set-by-path',
  produce: 'bench-produce',
  createArrayMethods: 'bench-create-array-methods',
  createDerivedStore: 'bench-create-derived-store',
  'End-to-end: store + listeners': 'bench-end-to-end',
  'structuredClone baseline': 'bench-structured-clone-baseline',
  copyOnWritePath: 'bench-copy-on-write-path',
  batch: 'bench-batch',
  createStoreDispatch: 'bench-create-store-dispatch',
  shallowEqual: 'bench-shallow-equal',
  watch: 'bench-watch',
};

const MobileEntry = ({ entry, hasStability }: { entry: BenchEntry; hasStability: boolean }) => {
  const cv = entry.samples > 1 ? (entry.stddevOps / entry.opsPerSec) * 100 : undefined;
  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mb: 0.75, wordBreak: 'break-word' }}
      >
        {entry.label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label={`${formatOps(entry.opsPerSec)} ops/s`}
          size="small"
          color={opsColor(entry.opsPerSec)}
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {formatNs(entry.nsPerOp)}/op
        </Typography>
        {hasStability && !isNullish(cv) && (
          <Tooltip
            title={`${formatOps(entry.minOps)} – ${formatOps(entry.maxOps)} ops/s (${String(entry.samples)} samples)`}
          >
            <Chip
              label={`CV ±${cv.toFixed(1)}%`}
              size="small"
              color={cvColor(cv)}
              variant="outlined"
              sx={{ fontFamily: 'monospace', cursor: 'help' }}
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export function BenchmarkTable() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const groups = new Map<string, BenchEntry[]>();
  for (const entry of benchReport.entries) {
    const list = groups.get(entry.group);
    if (list) {
      list.push(entry);
    } else {
      groups.set(entry.group, [entry]);
    }
  }

  const hasStability = benchReport.runs > 1;

  return (
    <Card
      variant="outlined"
      sx={{
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'background.paper'),
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (t) => `0 0 0 1px ${alpha(t.palette.primary.main, 0.3)}, ${t.shadows[4]}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BoltIcon sx={{ color: 'primary.main' }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em', flex: 1 }}
          >
            @stardust/core — Performance
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          Zero-dependency, POJO-based reactive state. Operations run in single-digit nanoseconds —
          fast enough for 60 fps render loops, hot selectors, and deep form trees. No proxy magic,
          no atoms, no reducers. Every operation is a plain object read or write.
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 2.5, lineHeight: 1.5 }}
        >
          {new Date(benchReport.date).toLocaleString()} · Node {benchReport.node} ·{' '}
          {benchReport.platform} · {benchReport.cpu} ({benchReport.cores} cores) ·{' '}
          {benchReport.ramGb} GB RAM · Median across {benchReport.runs} run
          {benchReport.runs > 1 ? 's' : ''} ({benchReport.rounds} total rounds)
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: '>= 10M', color: 'success' as const, desc: '< 100 ns — near-zero cost' },
            { label: '>= 1M', color: 'warning' as const, desc: 'sub-microsecond' },
            { label: '< 1M', color: 'info' as const, desc: 'clone-bound' },
          ].map(({ label, color, desc }) => (
            <Box key={label} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={label}
                size="small"
                color={color}
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
              <Typography variant="caption" color="text.secondary">
                {desc}
              </Typography>
            </Box>
          ))}
        </Box>

        {[...groups.entries()].map(([group, entries]) => (
          <Box key={group} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontFamily: 'monospace', color: 'text.secondary', flex: 1 }}
              >
                {group}
              </Typography>
              <ViewCodeButton codeKey={GROUP_CODE_KEYS[group] ?? ''} />
            </Box>

            {isMobile ? (
              <Box>
                {entries.map((entry) => (
                  <MobileEntry key={entry.label} entry={entry} hasStability={hasStability} />
                ))}
              </Box>
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Benchmark</TableCell>
                      <TableCell align="right">ops/s</TableCell>
                      <TableCell align="right">ns/op</TableCell>
                      <TableCell align="right">Iterations</TableCell>
                      {hasStability && (
                        <Tooltip title="Coefficient of variation across runs — lower is more stable">
                          <TableCell align="right" sx={{ cursor: 'help' }}>
                            Stability
                          </TableCell>
                        </Tooltip>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry) => {
                      const cv =
                        entry.samples > 1 ? (entry.stddevOps / entry.opsPerSec) * 100 : undefined;
                      return (
                        <TableRow key={entry.label} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {entry.label}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={formatOps(entry.opsPerSec)}
                              size="small"
                              color={opsColor(entry.opsPerSec)}
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', minWidth: 72 }}
                            />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                          >
                            {formatNs(entry.nsPerOp)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              color: 'text.secondary',
                            }}
                          >
                            {entry.iterations.toLocaleString()}
                          </TableCell>
                          {hasStability && (
                            <TableCell align="right">
                              {!isNullish(cv) ? (
                                <Tooltip
                                  title={`${formatOps(entry.minOps)} – ${formatOps(entry.maxOps)} ops/s (${String(entry.samples)} samples)`}
                                >
                                  <Chip
                                    label={`±${cv.toFixed(1)}%`}
                                    size="small"
                                    color={cvColor(cv)}
                                    variant="outlined"
                                    sx={{
                                      fontFamily: 'monospace',
                                      minWidth: 72,
                                      cursor: 'help',
                                    }}
                                  />
                                </Tooltip>
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{ fontFamily: 'monospace' }}
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
