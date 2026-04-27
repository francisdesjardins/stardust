import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import type { ReactNode } from 'react';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

type ExampleCardProps = {
  title: string;
  description?: string;
  codeKey?: string;
  children?: ReactNode;
};

export const ExampleCard = ({ title, description, codeKey, children }: ExampleCardProps) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      borderColor: 'divider',
      bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper'),
      '&:hover': {
        borderColor: 'primary.main',
        boxShadow: (theme) =>
          `0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}, ${theme.shadows[4]}`,
        transform: 'translateY(-2px)',
      },
    }}
  >
    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em', flex: 1 }}
        >
          {title}
        </Typography>
        {codeKey && <ViewCodeButton codeKey={codeKey} />}
      </Box>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6, flex: 1 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 'auto' }}>{children}</Box>
    </CardContent>
  </Card>
);
