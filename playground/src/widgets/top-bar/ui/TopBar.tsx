import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { ThemeToggleButton } from '@/shared/ui/ThemeToggleButton';

type TopBarProps = {
  readonly isMobile: boolean;
  readonly onMenuClick: () => void;
};

export const TopBar = ({ isMobile, onMenuClick }: TopBarProps) => (
  <AppBar
    position="fixed"
    elevation={0}
    sx={{
      zIndex: (theme) => theme.zIndex.drawer + 1,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
      color: 'text.primary',
    }}
  >
    <Toolbar sx={{ height: 64 }}>
      {isMobile && (
        <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation" sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
            ✦
          </Typography>
        </Box>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
          Stardust
        </Typography>
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 0.5,
            bgcolor: 'action.hover',
            color: 'text.secondary',
            fontWeight: 500,
            display: { xs: 'none', sm: 'inline-flex' },
          }}
        >
          Playground
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <ThemeToggleButton sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }} />
    </Toolbar>
  </AppBar>
);
