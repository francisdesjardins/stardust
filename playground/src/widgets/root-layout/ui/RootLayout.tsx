import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { CodePaneProvider } from '@/app/providers/CodePaneProvider/CodePaneProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider/ThemeProvider';
import { useCodePane } from '@/widgets/code-viewer/model/useCodePane';
import { CodeModal } from '@/widgets/code-viewer/ui/CodeModal';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { TopBar } from '@/widgets/top-bar/ui/TopBar';
import { PeekingStar } from '@/shared/ui/PeekingStar/PeekingStar';
import { StarfieldBanner } from '@/shared/ui/StarfieldBanner/StarfieldBanner';

const MainContent = () => {
  const { setCodeModalOpen } = useCodePane();
  const [codeOpen, setCodeOpen] = useState(false);

  const openRef = useRef(() => {
    setCodeOpen(true);
  });

  useEffect(() => {
    setCodeModalOpen(() => () => {
      openRef.current();
    });
    return () => {
      setCodeModalOpen(null);
    };
  }, [setCodeModalOpen]);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Toolbar sx={{ height: 64 }} />
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', mb: 4 }}>
          <StarfieldBanner />
        </Box>
        <Outlet />
      </Box>
      <CodeModal
        open={codeOpen}
        onClose={() => {
          setCodeOpen(false);
        }}
      />
    </Box>
  );
};

const ResponsiveShell = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <TopBar
        isMobile={isMobile}
        onMenuClick={() => {
          setMobileOpen((p) => !p);
        }}
      />
      <Sidebar
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onClose={() => {
          setMobileOpen(false);
        }}
      />
      <MainContent />
    </Box>
  );
};

export const RootLayout = () => (
  <ThemeProvider>
    <CodePaneProvider>
      <PeekingStar />
      <ResponsiveShell />
    </CodePaneProvider>
  </ThemeProvider>
);
