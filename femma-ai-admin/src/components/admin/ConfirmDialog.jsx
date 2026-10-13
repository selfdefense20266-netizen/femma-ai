import PropTypes from 'prop-types';
import { useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

/**
 * Confirmation dialog for destructive actions.
 * `onConfirm` may be async; the dialog stays open (with the error shown) if it throws.
 */
export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (busy) return;
    setError('');
    onClose?.();
  };

  const handleConfirm = async () => {
    try {
      setBusy(true);
      setError('');
      await onConfirm?.();
      setBusy(false);
      onClose?.();
    } catch (err) {
      setBusy(false);
      setError(err?.message || 'Action failed');
    }
  };

  return (
    <Dialog open={Boolean(open)} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message ? <DialogContentText component="div">{message}</DialogContentText> : null}
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.node,
  message: PropTypes.node,
  confirmLabel: PropTypes.string,
  onConfirm: PropTypes.func,
  onClose: PropTypes.func
};
