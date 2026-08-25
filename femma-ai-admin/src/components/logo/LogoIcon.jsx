// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// ==============================|| LOGO ICON - FEMA AI ||============================== //

export default function LogoIcon() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        background: `linear-gradient(135deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.primary.dark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: 16
      }}
    >
      F
    </Box>
  );
}
