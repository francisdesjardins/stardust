import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { useCodePane } from '@/widgets/code-viewer/model/useCodePane';
import { codeSamples } from '../model/codeSamples';

type CodeModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export const CodeModal = ({ open, onClose }: CodeModalProps) => {
  const { selectedExample, exampleActions } = useCodePane();
  const code = selectedExample ? (codeSamples[selectedExample] ?? '') : '';
  const title = selectedExample ?? '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#1a1a1a' : '#fafafa'),
        }}
      >
        <CodeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
            Source
          </Typography>
          {title && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </Typography>
            </Box>
          )}
        </Box>
        {exampleActions && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {exampleActions}
          </Box>
        )}
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {code ? (
          <CodeBlock code={code} language="tsx" />
        ) : (
          <Box
            sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              No code available
            </Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};
