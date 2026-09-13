import { useMemo, useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import StatusChip from 'components/admin/StatusChip';
import TablePaginationBar from 'components/admin/TablePaginationBar';
import { audienceLabel } from 'api/notifications';
import { useAdminData } from 'contexts/AdminDataContext';
import usePagination from 'hooks/usePagination';

const emptyForm = {
  title: '',
  body: '',
  audience: 'all'
};

export default function Notifications() {
  const { notifications, categories, users, saveNotification, sendNotification, sendNewNotification, membersLoading } =
    useAdminData();
  const [form, setForm] = useState(emptyForm);
  const [member, setMember] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    notifications,
    5,
    notifications.length
  );

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email))),
    [users]
  );

  const canSend =
    Boolean(form.title.trim() && form.body.trim()) && !(form.audience === 'member' && !member?.email) && !busy;

  const resolvedAudience = () => {
    if (form.audience === 'member') {
      if (!member?.email) throw new Error('Pick a member');
      return `email:${String(member.email).trim().toLowerCase()}`;
    }
    return form.audience;
  };

  const handleSaveDraft = async () => {
    if (!canSend && form.audience === 'member' && !member?.email) {
      setError('Pick a member before saving.');
      return;
    }
    if (!form.title.trim() || !form.body.trim() || busy) {
      setError('Title and body are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveNotification({ ...form, audience: resolvedAudience(), status: 'draft' });
      setForm(emptyForm);
      setMember(null);
      setToast('Draft saved');
    } catch (err) {
      setError(err?.message || 'Could not save draft');
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!canSend) {
      setError(form.audience === 'member' && !member?.email ? 'Pick a member first.' : 'Title and body are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const audience = resolvedAudience();
      await sendNewNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        audience
      });
      setForm(emptyForm);
      setMember(null);
      setToast(
        audience.startsWith('email:')
          ? `Sent to ${audience.slice(6)}`
          : audience === 'premium'
            ? 'Sent to premium members'
            : 'Sent to all members'
      );
    } catch (err) {
      setError(err?.message || 'Could not send notification');
    } finally {
      setBusy(false);
    }
  };

  const handleSendDraft = async (id) => {
    setBusy(true);
    setError('');
    try {
      await sendNotification(id);
      setToast('Notification sent');
    } catch (err) {
      setError(err?.message || 'Could not send notification');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Send a message to every member, premium members, or one specific user. The app shows it in the bell inbox."
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <MainCard title="Compose">
            <Stack spacing={2}>
              <TextField
                label="Title"
                fullWidth
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New workout tip"
              />
              <TextField
                label="Body"
                fullWidth
                multiline
                minRows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Message users will see in the app bell"
              />
              <TextField
                select
                label="Audience"
                fullWidth
                value={form.audience}
                onChange={(e) => {
                  const audience = e.target.value;
                  setForm({ ...form, audience });
                  if (audience !== 'member') setMember(null);
                }}
              >
                <MenuItem value="all">All members</MenuItem>
                <MenuItem value="premium">Premium only</MenuItem>
                <MenuItem value="member">Specific member</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={`category:${c.id}`}>
                    Category: {c.title}
                  </MenuItem>
                ))}
              </TextField>
              {form.audience === 'member' ? (
                <Autocomplete
                  options={sortedUsers}
                  value={member}
                  loading={membersLoading}
                  onChange={(_e, next) => setMember(next)}
                  getOptionLabel={(option) => `${option.name || 'Member'} · ${option.email || ''}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, { inputValue }) => {
                    const q = inputValue.trim().toLowerCase();
                    if (!q) return options;
                    return options.filter((u) =>
                      [u.name, u.email, u.goal].filter(Boolean).join(' ').toLowerCase().includes(q)
                    );
                  }}
                  noOptionsText={membersLoading ? 'Loading members…' : 'No members found'}
                  renderInput={(params) => (
                    <TextField {...params} label="Member" placeholder="Search name or email" helperText="Required for specific member" />
                  )}
                />
              ) : null}
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" disabled={busy || !form.title.trim() || !form.body.trim()} onClick={handleSaveDraft}>
                  Save draft
                </Button>
                <Button variant="contained" disabled={!canSend} onClick={handleSend}>
                  {busy ? 'Sending…' : 'Send now'}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Sent messages appear in the member app under the bell icon (open or refresh the app).
              </Typography>
            </Stack>
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <MainCard title="History" content={false}>
            {membersLoading && notifications.length === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">Loading…</Typography>
              </Box>
            )}
            {!membersLoading && notifications.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">No notifications yet. Compose one and tap Send now.</Typography>
              </Box>
            ) : null}
            <List disablePadding>
              {paginatedItems.map((n, index) => (
                <Box key={n.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    alignItems="flex-start"
                    secondaryAction={
                      n.status === 'draft' ? (
                        <Button size="small" disabled={busy} onClick={() => handleSendDraft(n.id)}>
                          Send
                        </Button>
                      ) : (
                        <StatusChip status="sent" />
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1">{n.title}</Typography>
                          {n.status === 'draft' && <StatusChip status="draft" />}
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {n.body}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            To: {audienceLabel(n.audience, users)} ·{' '}
                            {n.sentAt ? `Sent ${new Date(n.sentAt).toLocaleString()}` : `Created ${new Date(n.createdAt).toLocaleString()}`}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
            <TablePaginationBar
              count={count}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10]}
            />
          </MainCard>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')} message={toast} />
    </>
  );
}
