import PropTypes from 'prop-types';

// material-ui
import Chip from '@mui/material/Chip';

const STATUS_MAP = {
  active: { label: 'Active', color: 'success' },
  published: { label: 'Published', color: 'success' },
  draft: { label: 'Draft', color: 'warning' },
  premium: { label: 'Premium', color: 'primary' },
  free: { label: 'Free', color: 'secondary' },
  cancelled: { label: 'Cancelled', color: 'error' },
  trial: { label: 'Trial', color: 'info' },
  suspended: { label: 'Suspended', color: 'error' },
  sent: { label: 'Sent', color: 'success' },
  uploaded: { label: 'Ready', color: 'success' },
  ready: { label: 'Ready', color: 'success' },
  awaiting: { label: 'Awaiting', color: 'warning' },
  uploading: { label: 'Uploading', color: 'info' },
  processing: { label: 'Processing', color: 'info' },
  errored: { label: 'Error', color: 'error' }
};

export default function StatusChip({ status }) {
  const key = String(status || '').toLowerCase();
  const config = STATUS_MAP[key] || { label: status || 'Unknown', color: 'default' };
  return <Chip size="small" color={config.color} label={config.label} variant="light" />;
}

StatusChip.propTypes = { status: PropTypes.string };
