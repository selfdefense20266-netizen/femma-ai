import { useMemo, useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import DataTableToolbar from 'components/admin/DataTableToolbar';
import StatusChip from 'components/admin/StatusChip';
import TablePaginationBar from 'components/admin/TablePaginationBar';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';
import usePagination from 'hooks/usePagination';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';

const emptyForm = {
  id: '',
  title: '',
  subtitle: '',
  description: '',
  icon: 'book',
  color: '#F26BB5',
  status: 'draft'
};

export default function Categories() {
  const { categories, courses, saveCategory, deleteCategory, contentLoading, contentError } = useAdminData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const rows = useMemo(() => {
    return categories
      .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
      .filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [c.title, c.subtitle, c.description].join(' ').toLowerCase().includes(q);
      })
      .map((c) => ({
        ...c,
        courseCount: courses.filter((course) => course.categoryId === c.id).length
      }));
  }, [categories, courses, search, statusFilter]);

  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    rows,
    5,
    `${search}|${statusFilter}`
  );

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setForm({ ...emptyForm, ...row });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    try {
      setSaving(true);
      setActionError('');
      await saveCategory({
        ...form,
        id: form.id || form.title.toLowerCase().replace(/\s+/g, '-')
      });
      setOpen(false);
    } catch (err) {
      setActionError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setActionError('');
      await deleteCategory(id);
    } catch (err) {
      setActionError(err.message || 'Failed to delete category');
    }
  };

  if (contentLoading) return <Loader />;

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Top-level Explore pillars mirrored from the Fema AI mobile app."
        actionLabel="Add category"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />

      {(contentError || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError || contentError}
        </Alert>
      )}

      <MainCard content={false}>
        <Box sx={{ p: 2.5, pb: 0 }}>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search categories…"
            filters={[
              {
                key: 'status',
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: 'all', label: 'All' },
                  { value: 'published', label: 'Published' },
                  { value: 'draft', label: 'Draft' }
                ]
              }
            ]}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Subtitle</TableCell>
                <TableCell>Courses</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((row) => (
                <TableRow hover key={row.id}>
                  <TableCell>
                    <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: row.color }} />
                      <Typography variant="subtitle1">{row.title}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{row.subtitle}</TableCell>
                  <TableCell>{row.courseCount}</TableCell>
                  <TableCell>
                    <StatusChip status={row.status} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => openEdit(row)}>
                      <EditOutlined />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(row.id)}>
                      <DeleteOutlined />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {count === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      No categories match your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField label="Subtitle" fullWidth value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField label="Icon key" fullWidth value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              <TextField label="Color" fullWidth value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </Stack>
            <TextField select label="Status" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
