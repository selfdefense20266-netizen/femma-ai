import { useEffect, useMemo, useRef, useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'components/MainCard';
import StatusChip from 'components/admin/StatusChip';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';
import { fetchProgramCards, upsertProgramCard, removeProgramCard, uploadProgramCardImage } from 'api/programCards';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';

const emptyCard = () => ({
  id: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  courseId: '',
  status: 'published',
  sortOrder: Math.floor(Date.now() / 1000)
});

export default function ProgramCards() {
  const { courses, contentLoading } = useAdminData();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCard());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const publishedCourses = useMemo(
    () =>
      (courses || [])
        .filter((c) => (c.status || 'published') === 'published')
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title)),
    [courses]
  );

  const refresh = async () => {
    const rows = await fetchProgramCards();
    setCards(rows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load program cards');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setForm(emptyCard());
    setError('');
    setOpen(true);
  };

  const openEdit = (card) => {
    setForm({
      ...emptyCard(),
      ...card,
      courseId: card.courseId || ''
    });
    setError('');
    setOpen(true);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadProgramCardImage(form.id || 'new', file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.courseId || saving) return;
    try {
      setSaving(true);
      setError('');
      await upsertProgramCard(form);
      await refresh();
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || contentLoading) return <Loader />;

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h3" fontWeight={800}>
            Program
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create cards for the Today screen. Each card opens an assigned course when tapped.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
          Add card
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
          gap: 2
        }}
      >
        {cards.map((card) => (
          <MainCard key={card.id} contentSX={{ p: 0 }} border boxShadow>
            <Box
              sx={{
                height: 140,
                bgcolor: 'grey.100',
                backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                <StatusChip status={card.status} />
              </Box>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography variant="h5" fontWeight={700}>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {card.subtitle || 'No subtitle'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Opens: {card.courseTitle || card.courseId || '—'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button fullWidth variant="contained" startIcon={<EditOutlined />} onClick={() => openEdit(card)}>
                  Edit
                </Button>
                <IconButton
                  color="error"
                  onClick={async () => {
                    if (!window.confirm(`Delete “${card.title}”?`)) return;
                    try {
                      await removeProgramCard(card.id);
                      await refresh();
                    } catch (err) {
                      setError(err.message || 'Delete failed');
                    }
                  }}
                >
                  <DeleteOutlined />
                </IconButton>
              </Stack>
            </Box>
          </MainCard>
        ))}
      </Box>

      {!cards.length ? (
        <MainCard sx={{ mt: 2 }}>
          <Typography color="text.secondary">No program cards yet. Add a card and assign a course.</Typography>
        </MainCard>
      ) : null}

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
        <Box sx={{ p: 2.5, height: '100%', overflow: 'auto' }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
            {form.id ? 'Edit card' : 'New card'}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Card title"
              fullWidth
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Boxing Basics"
            />
            <TextField
              label="Subtitle"
              fullWidth
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. 4 weeks · Beginner"
            />
            <TextField
              select
              label="Assign course"
              fullWidth
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              helperText="When the user taps this card, they open this course"
            >
              <MenuItem value="">Select a course…</MenuItem>
              {publishedCourses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.title} ({course.categoryId})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              fullWidth
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </TextField>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Card image (optional)
              </Typography>
              {form.imageUrl ? (
                <Box
                  component="img"
                  src={form.imageUrl}
                  alt=""
                  sx={{ width: '100%', maxHeight: 160, objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 2, mb: 1 }}
                />
              ) : null}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
              <Button
                variant="outlined"
                startIcon={<CloudUploadOutlined />}
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Uploading…' : 'Upload image'}
              </Button>
            </Box>

            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Button fullWidth variant="outlined" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button fullWidth variant="contained" disabled={saving || !form.title.trim() || !form.courseId} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
