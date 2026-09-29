// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// assets
import logo from 'assets/images/logo.jpeg';

// ==============================|| LOGO MAIN - FEMA AI ||============================== //

export default function LogoMain() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
      <Box
        component="img"
        src={logo}
        alt="Fema AI"
        sx={{ width: 32, height: 32, borderRadius: '10px', objectFit: 'cover' }}
      />
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
