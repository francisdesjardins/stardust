import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, useTheme } from '@mui/material';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

type CodeBlockProps = {
  code: string;
  language?: string;
};

export const CodeBlock = ({ code, language = 'tsx' }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Box
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1,
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          backdropFilter: 'blur(8px)',
          border: 1,
          borderColor: 'divider',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            transform: 'scale(1.05)',
          },
        }}
      >
        {copied ? (
          <CheckIcon fontSize="small" color="success" />
        ) : (
          <ContentCopyIcon fontSize="small" />
        )}
      </IconButton>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: isDarkMode ? '#1a1a1a' : '#ffffff',
          '& pre': {
            margin: '0 !important',
            background: 'transparent !important',
            padding: '0 !important',
            borderRadius: '0 !important',
            overflowX: 'auto !important',
          },
          '& code': {
            display: 'block !important',
            padding: '24px !important',
            borderRadius: '0 !important',
          },
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            fontSize: '0.9rem',
            lineHeight: 1.8,
            background: 'transparent',
            margin: 0,
            padding: 0,
            fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          }}
          showLineNumbers
          wrapLines
          lineNumberStyle={{
            minWidth: '3.5em',
            paddingRight: '1.5em',
            color: isDarkMode ? '#4a5568' : '#cbd5e0',
            userSelect: 'none',
            textAlign: 'right',
            fontSize: '0.85rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
};
