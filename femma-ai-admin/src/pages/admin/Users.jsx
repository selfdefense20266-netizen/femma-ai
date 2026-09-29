import { useMemo, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
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
import EyeOutlined from '@ant-design/icons/EyeOutlined';

export default function Users() {
  const {
    users,
    plans,
    dailyPlans,
    levelNames,
    setUserStatus,
    assignPlan,
    assignDailyPlan,
    saveUser,
    sendNewNotification,
    membersLoading,
    membersError
  } = useAdminData();

  const planStats = useMemo(() => {
    const premium = users.filter((u) => u.planId === 'premium').length;
    return { total: users.length, premium, free: users.length - premium };
  }, [users]);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteMsg, setNoteMsg] = useState('');

  const rows = useMemo(() => {
    return users
      .filter((u) => (planFilter === 'all' ? true : u.planId === planFilter))
      .filter((u) => (statusFilter === 'all' ? true : u.status === statusFilter))
      .filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [u.name, u.email, u.goal, u.planName].join(' ').toLowerCase().includes(q);
      });
  }, [users, search, planFilter, statusFilter]);

  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    rows,
    10,
    `${search}|${planFilter}|${statusFilter}`
  );

  const handleAssignPlan = async (planId) => {
    if (!selected) return;
    setSaving(true);
    try {
      await assignPlan(selected.id, planId, 'active');
      setSelected((prev) => ({ ...prev, planId, planName: plans.find((p) => p.id === planId)?.name }));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDailyPlan = async (planId) => {
    if (!selected) return;
    setSaving(true);
    try {
      await assignDailyPlan(selected.id, planId || null);
      setSelected((prev) => ({
        ...prev,
        dailyPlanId: planId || '',
        dailyPlanTitle: dailyPlans.find((p) => p.id === planId)?.title || ''
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Fema AI members from Supabase — profile fields mirror the mobile app (goal, level, streak, cycle, plan). Premium count includes both app purchases and admin-assigned plans."
      />

      {membersError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {membersError}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <StatTile label="Total members" value={planStats.total} />
        <StatTile label="Premium members" value={planStats.premium} color="success.main" />
        <StatTile label="Free members" value={planStats.free} />
      </Stack>

      <MainCard content={false}>
        {membersLoading ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">Loading members…</Typography>
          </Box>
        ) : null}
        <Box sx={{ p: 2.5, pb: 0 }}>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search members…"
            filters={[
              {
                key: 'plan',
                label: 'Plan',
                value: planFilter,
                onChange: setPlanFilter,
                options: [{ value: 'all', label: 'All plans' }, ...plans.map((p) => ({ value: p.id, label: p.name }))]
              },
              {
                key: 'status',
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'suspended', label: 'Suspended' }
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
                <TableCell>Level</TableCell>
                <TableCell>Streak</TableCell>
                <TableCell>Goal</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">View</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((user) => (
                <TableRow hover key={user.id}>
                  <TableCell>
                    <Typography variant="subtitle1">{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={user.planId === 'premium' ? 'premium' : 'free'} />
                  </TableCell>
                  <TableCell>
                    {levelNames[user.level] || user.level} · {user.points} pts
                  </TableCell>
                  <TableCell>{user.streak} days</TableCell>
                  <TableCell>{user.goal}</TableCell>
                  <TableCell>
                    <StatusChip status={user.status} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => setSelected(user)}>
                      <EyeOutlined />
                    </IconButton>
                  </TableCell>
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

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setNoteTitle('');
          setNoteBody('');
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, height: '100%', overflow: 'hidden' } }}
      >
        {selected && (
          <Box sx={{ p: 3, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
            <Typography variant="h4">{selected.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selected.email}
            </Typography>

            <Stack spacing={1.25} sx={{ mb: 2 }}>
              <Detail label="Goal" value={selected.goal} />
              <Detail label="Fitness level" value={selected.fitnessLevel} />
              <Detail label="Environment" value={selected.environment} />
              <Detail label="Level" value={`${levelNames[selected.level] || selected.level} (${selected.points} pts)`} />
              <Detail label="Journey day" value={selected.journeyDay} />
              <Detail label="Streak" value={`${selected.streak} days`} />
              <Detail label="Completed lessons" value={selected.completedLessons} />
              <Detail
                label="Cycle"
                value={
                  selected.isPregnant ? `Pregnant · week ${selected.pregnancyWeek}` : `${selected.cyclePhase} · day ${selected.cycleDay}`
                }
              />
              <Detail label="Joined" value={selected.joinedAt} />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
              Send notification
            </Typography>
            <Stack spacing={1.25} sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Title"
                fullWidth
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
              <TextField
                size="small"
                label="Message"
                fullWidth
                multiline
                minRows={3}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              {noteMsg ? (
                <Alert severity={noteMsg.startsWith('Sent') ? 'success' : 'error'} onClose={() => setNoteMsg('')}>
                  {noteMsg}
                </Alert>
              ) : null}
              <Button
                variant="contained"
                disabled={saving || !noteTitle.trim() || !noteBody.trim()}
                onClick={async () => {
                  setSaving(true);
                  setNoteMsg('');
                  try {
                    await sendNewNotification({
                      title: noteTitle.trim(),
                      body: noteBody.trim(),
                      audience: `email:${String(selected.email).trim().toLowerCase()}`
                    });
                    setNoteTitle('');
                    setNoteBody('');
                    setNoteMsg(`Sent to ${selected.email}`);
                  } catch (err) {
                    setNoteMsg(err?.message || 'Could not send notification');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Sending…' : 'Send to this user'}
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
              Subscription
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              label="Plan"
              value={selected.planId}
              onChange={(e) => handleAssignPlan(e.target.value)}
              sx={{ mb: 2 }}
            >
              {plans.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="h6" sx={{ mb: 1 }}>
              Daily plan (Today)
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              label="Assigned daily plan"
              value={selected.dailyPlanId || ''}
              onChange={(e) => handleAssignDailyPlan(e.target.value)}
              helperText="Overrides auto-match by user type (goal). Controls Today Tasks, Recovery & Food."
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Auto (by goal / user type)</MenuItem>
              {(dailyPlans || []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.title} ({p.userType})
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1}>
              {selected.status === 'active' ? (
                <Button
                  color="error"
                  variant="outlined"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await setUserStatus(selected.id, 'suspended');
                      setSelected({ ...selected, status: 'suspended' });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  color="success"
                  variant="outlined"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await setUserStatus(selected.id, 'active');
                      setSelected({ ...selected, status: 'active' });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Activate
                </Button>
              )}
              <Button
                variant="contained"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await saveUser(selected);
                    setSelected(null);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Done
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
}

function StatTile({ label, value, color }) {
  return (
    <MainCard content={false} sx={{ flex: 1, px: 2.5, py: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h3" sx={{ mt: 0.5, color: color || 'text.primary' }}>
        {value}
      </Typography>
    </MainCard>
  );
}

function Detail({ label, value }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}
