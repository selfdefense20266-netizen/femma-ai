// material-ui
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// project imports
import ContainerWrapper from 'components/ContainerWrapper';

// ==============================|| FOOTER - AUTHENTICATION ||============================== //

export default function AuthFooter() {
  return (
    <ContainerWrapper>
      <Stack direction="row" sx={{ justifyContent: 'center', textAlign: 'center', py: 2 }}>
        <Typography variant="subtitle2" sx={{ color: 'secondary.main' }}>
          © Fema AI Admin — Women&apos;s Transformation Platform
        </Typography>
      </Stack>
    </ContainerWrapper>
  );
}
