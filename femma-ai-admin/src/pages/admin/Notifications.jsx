import { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
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
import { useAdminData } from 'contexts/AdminDataContext';
import usePagination from 'hooks/usePagination';

const emptyForm = {
  title: '',
  body: '',
  audience: 'all'
};

export default function Notifications() {
  const { notifications, categories, saveNotification, sendNotification } = useAdminData();
  const [form, setForm] = useState(emptyForm);
  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    notifications,
    5,
    notifications.length
  );

  const handleSaveDraft = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    saveNotification({ ...form, status: 'draft' });
    setForm(emptyForm);
  };

  const handleSend = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const id = `notif-${Date.now().toString(36)}`;
    saveNotification({ ...form, id, status: 'draft' });
    sendNotification(id);
    setForm(emptyForm);
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Compose member push messages and review send history (local demo)." />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <MainCard title="Compose">
            <Stack spacing={2}>
              <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField
                label="Body"
                fullWidth
                multiline
                minRows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <TextField
                select
                label="Audience"
                fullWidth
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                <MenuItem value="all">All members</MenuItem>
                <MenuItem value="premium">Premium only</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={`category:${c.id}`}>
                    Category: {c.title}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={handleSaveDraft}>
                  Save draft
                </Button>
                <Button variant="contained" onClick={handleSend}>
                  Send now
                </Button>
              </Stack>
            </Stack>
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <MainCard title="History" content={false}>
            <List disablePadding>
              {paginatedItems.map((n, index) => (
                <Box key={n.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    alignItems="flex-start"
                    secondaryAction={
                      n.status === 'draft' ? (
                        <Button size="small" onClick={() => sendNotification(n.id)}>
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
                            Audience: {n.audience} ·{' '}
                            {n.sentAt
                              ? `Sent ${new Date(n.sentAt).toLocaleString()}`
                              : `Created ${new Date(n.createdAt).toLocaleString()}`}
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
    </>
  );
}
