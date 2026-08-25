import PropTypes from 'prop-types';

// material-ui
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// project imports
import MainCard from 'components/MainCard';

// ==============================|| ADMIN PLACEHOLDER PAGE ||============================== //

export default function AdminPage({ title, description }) {
  return (
    <MainCard title={title}>
      <Stack spacing={1}>
        <Typography variant="body1" color="text.secondary">
          {description || `${title} management for Fema AI will live here.`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connected to Self Defence, Fitness, Cycle / Pregnancy &amp; Health, and Diet &amp; Nutrition content.
        </Typography>
      </Stack>
    </MainCard>
  );
}

AdminPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string
};
