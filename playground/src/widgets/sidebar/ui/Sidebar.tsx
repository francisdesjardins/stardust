import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { Link, useRouterState } from '@tanstack/react-router';

const SIDEBAR_WIDTH = 220;

const navItems = [
  { path: '/getting-started', label: 'Getting Started', icon: PlayArrowIcon },
  { path: '/react', label: 'React', icon: CodeIcon },
  { path: '/solid', label: 'SolidJS', icon: ScienceIcon },
  { path: '/lab', label: 'Lab', icon: AutoAwesomeIcon },
] as const;

type SidebarProps = {
  readonly isMobile: boolean;
  readonly mobileOpen: boolean;
  readonly onClose: () => void;
};

export const Sidebar = ({ isMobile, mobileOpen, onClose }: SidebarProps) => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : undefined}
      onClose={isMobile ? onClose : undefined}
      ModalProps={isMobile ? { keepMounted: true } : undefined}
      sx={{
        ...(!isMobile && { width: SIDEBAR_WIDTH, flexShrink: 0 }),
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        },
      }}
    >
      <Toolbar sx={{ height: 64 }} />
      <Box sx={{ overflow: 'auto', py: 1 }}>
        <List disablePadding>
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={isActive}
                onClick={isMobile ? onClose : undefined}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: { variant: 'body2', sx: { fontWeight: isActive ? 600 : 400 } },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export { SIDEBAR_WIDTH };
