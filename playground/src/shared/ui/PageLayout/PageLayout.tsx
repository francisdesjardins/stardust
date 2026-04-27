import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';

type PageLayoutProps = {
  title: string;
  description: string;
  result?: string | null | undefined;
  children: ReactNode;
};

export const PageLayout = ({ title, description, result, children }: PageLayoutProps) => (
  <Box sx={{ maxWidth: 900, mx: 'auto' }}>
    <Box sx={{ mb: { xs: 2, md: 4 }, textAlign: 'center' }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 1,
          letterSpacing: '-0.02em',
          fontSize: { xs: '1.5rem', md: undefined },
        }}
      >
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
        {description}
      </Typography>
    </Box>

    {result !== undefined && result !== null && <ResultDisplay result={result} />}

    <Box sx={{ mt: 3 }}>{children}</Box>
  </Box>
);
