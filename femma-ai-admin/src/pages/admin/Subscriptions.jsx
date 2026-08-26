import { useMemo, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import DataTableToolbar from 'components/admin/DataTableToolbar';
import StatusChip from 'components/admin/StatusChip';
import TablePaginationBar from 'components/admin/TablePaginationBar';
import { useAdminData } from 'contexts/AdminDataContext';
import usePagination from 'hooks/usePagination';

// assets
import EditOutlined from '@ant-design/icons/EditOutlined';

export default function Subscriptions() {
  const { plans, subscriptions, users, updatePremiumPrice } = useAdminData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const premiumPlan = plans.find((p) => p.id === 'premium');
  const [priceDialog, setPriceDialog] = useState({ open: false, price: '' });
  const [priceError, setPriceError] = useState('');

  const planCounts = useMemo(() => {
    return plans.map((plan) => ({
      ...plan,
      members: users.filter((u) => u.planId === plan.id && u.status === 'active').length
    }));
  }, [plans, users]);

  const rows = useMemo(() => {
    return subscriptions
      .map((sub) => {
        const user = users.find((u) => u.id === sub.userId);
        const plan = plans.find((p) => p.id === sub.planId);
        return {
          ...sub,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          planName: plan?.name || sub.planId
        };
      })
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.userName, r.userEmail, r.planName].join(' ').toLowerCase().includes(q);
      });
  }, [subscriptions, users, plans, search, statusFilter]);

  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    rows,
    10,
    `${search}|${statusFilter}`
  );

  const openEditPrice = () => {
    setPriceError('');
    setPriceDialog({
      open: true,
      price: premiumPlan?.priceMonthly != null ? String(premiumPlan.priceMonthly) : '14.99'
    });
  };

  const handleSavePrice = async () => {
    const amount = Number(priceDialog.price);
    if (Number.isNaN(amount) || amount < 0) {
      setPriceError('Enter a valid price (0 or greater).');
      return;
    }
    try {
      await updatePremiumPrice(amount);
      setPriceDialog({ open: false, price: '' });
      setPriceError('');
    } catch (err) {
      setPriceError(err.message || 'Could not update price');
    }
  };

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Free and Premium plans for Fema AI members. Update the Premium monthly price here."
        actionLabel="Edit Premium price"
        actionIcon={<EditOutlined />}
        onAction={openEditPrice}
      />

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {planCounts.map((plan) => (
          <Grid key={plan.id} size={{ xs: 12, md: 6 }}>
            <MainCard
              sx={{
                height: '100%',
                borderColor: plan.highlighted ? 'primary.main' : 'divider',
                bgcolor: plan.highlighted ? 'primary.lighter' : 'background.paper'
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h4">{plan.name}</Typography>
                  <Typography variant="h3" color="primary" sx={{ mt: 0.5 }}>
                    {plan.priceLabel}
                  </Typography>
                </Box>
                <Stack spacing={1} alignItems="flex-end">
                  <StatusChip status={plan.id === 'premium' ? 'premium' : 'free'} />
                  {plan.id === 'premium' && (
                    <Button size="small" startIcon={<EditOutlined />} onClick={openEditPrice}>
                      Edit price
                    </Button>
                  )}
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {plan.description}
              </Typography>
              <List dense disablePadding>
                {plan.features.map((feature) => (
                  <ListItem key={feature} disableGutters sx={{ py: 0.25 }}>
                    <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                ))}
              </List>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                {plan.members} active members
              </Typography>
            </MainCard>
          </Grid>
        ))}
      </Grid>

      <MainCard title="Member subscriptions" content={false}>
        <Box sx={{ p: 2.5, pb: 0 }}>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search members…"
            filters={[
              {
                key: 'status',
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]
              }
            ]}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Renews</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((row) => (
                <TableRow hover key={row.id}>
                  <TableCell>
                    <Typography variant="subtitle1">{row.userName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.userEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.planName}</TableCell>
                  <TableCell>
                    <StatusChip status={row.status} />
                  </TableCell>
                  <TableCell>{row.startedAt}</TableCell>
                  <TableCell>{row.renewDate || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePaginationBar
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </MainCard>

      <Dialog open={priceDialog.open} onClose={() => setPriceDialog({ open: false, price: '' })} fullWidth maxWidth="xs">
        <DialogTitle>Edit Premium price</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Set the monthly price shown for the Premium plan across Fema AI.
            </Typography>
            <TextField
              label="Monthly price"
              type="number"
              fullWidth
              value={priceDialog.price}
              onChange={(e) => {
                setPriceDialog((s) => ({ ...s, price: e.target.value }));
                setPriceError('');
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                },
                htmlInput: { min: 0, step: '0.01' }
              }}
              error={Boolean(priceError)}
              helperText={priceError || 'Example: 14.99'}
            />
            {priceDialog.price !== '' && !Number.isNaN(Number(priceDialog.price)) && (
              <Alert severity="info" sx={{ bgcolor: 'primary.lighter', color: 'text.primary', border: 'none' }}>
                Preview: ${Number(priceDialog.price).toFixed(2)}/mo
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setPriceDialog({ open: false, price: '' })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSavePrice}>
            Save price
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
