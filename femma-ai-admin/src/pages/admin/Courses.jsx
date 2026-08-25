import { useMemo, useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
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

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import DataTableToolbar from 'components/admin/DataTableToolbar';
import StatusChip from 'components/admin/StatusChip';
import TablePaginationBar from 'components/admin/TablePaginationBar';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';
import usePagination from 'hooks/usePagination';
import { countCourseStats } from 'data/content';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';

const COURSE_LEVELS = [
  'Beginner friendly',
  'Beginner',
  'Beginner to advanced',
  'All levels',
  'Intermediate',
  'Advanced',
  'Guided',
  'Tutorial'
];

const emptyForm = {
  id: '',
  categoryId: 'fitness',
  title: '',
  shortTitle: '',
  description: '',
  level: 'All levels',
  equipment: 'None',
  color: '#F26BB5',
  status: 'draft',
  disclaimer: '',
  modules: []
};

export default function Courses() {
  const { categories, courses, saveCourse, deleteCourse, contentLoading, contentError } = useAdminData();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const rows = useMemo(() => {
    return courses
      .filter((c) => (categoryFilter === 'all' ? true : c.categoryId === categoryFilter))
      .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
      .filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [c.title, c.description, c.level].join(' ').toLowerCase().includes(q);
      })
      .map((c) => {
        const stats = countCourseStats(c);
        const category = categories.find((cat) => cat.id === c.categoryId);
        return { ...c, ...stats, categoryTitle: category?.title || c.categoryId };
      });
  }, [courses, categories, search, categoryFilter, statusFilter]);

  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    rows,
    10,
    `${search}|${categoryFilter}|${statusFilter}`
  );

  const openCreate = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id || 'fitness' });
    setOpen(true);
  };

  const openEdit = (row) => {
    setForm({ ...emptyForm, ...row, modules: row.modules || [] });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    const { modules, lessons, awaiting, categoryTitle, ...rest } = form;
    try {
      setSaving(true);
      setActionError('');
      await saveCourse({
        ...rest,
        shortTitle: rest.shortTitle || rest.title,
        id: rest.id || rest.title.toLowerCase().replace(/\s+/g, '-'),
        modules: modules || []
      });
      setOpen(false);
    } catch (err) {
      setActionError(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setActionError('');
      await deleteCourse(id);
    } catch (err) {
      setActionError(err.message || 'Failed to delete course');
    }
  };

  if (contentLoading) return <Loader />;

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Progressive learning paths under each category — Self Defence, Fitness, Cycle & Health, Diet & Nutrition."
        actionLabel="Add course"
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
            searchPlaceholder="Search courses…"
            filters={[
              {
                key: 'category',
                label: 'Category',
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: [{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.title }))]
              },
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
                <TableCell>Course</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Modules</TableCell>
                <TableCell>Lessons</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((row) => (
                <TableRow hover key={row.id}>
                  <TableCell>
                    <Typography variant="subtitle1">{row.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.equipment}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.categoryTitle}</TableCell>
                  <TableCell>{row.level}</TableCell>
                  <TableCell>{row.modules}</TableCell>
                  <TableCell>
                    {row.lessons}
                    {row.awaiting > 0 && (
                      <Typography variant="caption" display="block" color="warning.main">
                        {row.awaiting} awaiting upload
                      </Typography>
                    )}
                  </TableCell>
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

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 560, md: 640 } } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Typography variant="h4">{form.id ? 'Edit course' : 'Add course'}</Typography>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button color="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save course'}
              </Button>
            </Stack>
          </Stack>
          <Stack spacing={2} sx={{ flex: 1, overflow: 'auto' }}>
            <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField
              select
              label="Category"
              fullWidth
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              select
              label="Level"
              fullWidth
              helperText="Who this course is for — shown on the course card in the Fema AI app."
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            >
              {[...new Set([...COURSE_LEVELS, form.level].filter(Boolean))].map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Equipment"
              fullWidth
              helperText="What members need for this course — shown on the course detail screen (e.g. No equipment, Yoga mat, Optional bands)."
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            />
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                component="input"
                type="color"
                value={form.color || '#F26BB5'}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                aria-label="Course color"
                sx={{
                  width: 56,
                  height: 40,
                  p: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  cursor: 'pointer'
                }}
              />
              <TextField
                label="Color"
                fullWidth
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                helperText="Brand accent for this course in the app."
              />
            </Stack>
            <TextField select label="Status" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </TextField>
            <TextField
              label="Disclaimer (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.disclaimer || ''}
              onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
            />
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
