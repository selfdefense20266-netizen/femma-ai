import PropTypes from 'prop-types';

// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

// ==============================|| ADMIN PAGE HEADER ||============================== //

export default function PageHeader({ title, subtitle, actionLabel, onAction, actionIcon, secondaryAction }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}
    >
      <Box>
        <Typography variant="h3">{title}</Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {secondaryAction}
        {actionLabel && onAction && (
          <Button variant="contained" color="primary" startIcon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  actionIcon: PropTypes.node,
  secondaryAction: PropTypes.node
};
