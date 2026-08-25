// material-ui
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// ==============================|| LOGO MAIN - FEMA AI ||============================== //

export default function LogoMain() {
  const theme = useTheme();

  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.primary.dark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: 0.5
        }}
      >
        F
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          letterSpacing: 0.2,
          color: 'text.primary',
          lineHeight: 1
        }}
      >
        Fema AI
      </Typography>
    </Stack>
  );
}
