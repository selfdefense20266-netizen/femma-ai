// material-ui
import Box from '@mui/material/Box';

// assets
import logo from 'assets/images/logo.jpeg';

// ==============================|| LOGO ICON - FEMA AI ||============================== //

export default function LogoIcon() {
  return (
    <Box
      component="img"
      src={logo}
      alt="Fema AI"
      sx={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }}
    />
  );
}
