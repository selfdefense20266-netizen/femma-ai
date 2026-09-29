import { useMemo, useRef, useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import StatusChip from 'components/admin/StatusChip';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';
import RocketOutlined from '@ant-design/icons/RocketOutlined';

const emptyForm = {
  id: '',
  title: '',
  eyebrow: '',
  detail: '',
  imageUrl: '',
  colorStart: '#1B6B67',
  colorEnd: '#012E2D',
  status: 'published',
  sortOrder: 0,
  courseIds: []
};

export default function Journeys() {
  const {
    journeys,
    journeysLoading,
    journeysError,
    courses,
    saveJourney,
    deleteJourney,
    uploadJourneyPicture
  } = useAdminData();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState('');
  const fileInputRef = useRef(null);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ id: c.id, label: c.title })),
    [courses]
  );

  const rows = useMemo(
    () => [...journeys].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [journeys]
  );

  const openCreate = () => {
    setForm({ ...emptyForm, sortOrder: journeys.length });
    setActionError('');
    setOpen(true);
  };

  const openEdit = (journey) => {
    setForm({ ...emptyForm, ...journey });
    setActionError('');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    try {
      setSaving(true);
      setActionError('');
      await saveJourney(form);
      setOpen(false);
    } catch (err) {
      setActionError(err.message || 'Failed to save guided journey');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setActionError('');
      await deleteJourney(id);
    } catch (err) {
      setActionError(err.message || 'Failed to delete guided journey');
    }
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      setActionError('');
      const url = await uploadJourneyPicture(form.id || form.title || 'journey', file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setActionError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (journeysLoading) return <Loader />;

  return (
    <>
      <PageHeader
        title="Guided Journeys"
        subtitle="Curated collections of courses shown on the app's home and explore screens."
        actionLabel="Add journey"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />

      {(journeysError || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError || journeysError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {rows.map((journey) => (
          <Grid key={journey.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <MainCard content={false} border boxShadow>
              <Box
                sx={{
                  height: 120,
                  borderRadius: '4px 4px 0 0',
                  backgroundImage: journey.imageUrl
                    ? `url(${journey.imageUrl})`
                    : `linear-gradient(135deg, ${journey.colorStart}, ${journey.colorEnd})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 1.5
                }}
              >
                {!journey.imageUrl && <RocketOutlined style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)' }} />}
              </Box>
              <Box sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">{journey.title}</Typography>
                  <StatusChip status={journey.status} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {journey.eyebrow}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {journey.detail}
                </Typography>
                <Chip label={`${journey.courseIds.length} course${journey.courseIds.length === 1 ? '' : 's'}`} size="small" />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <IconButton color="primary" size="small" onClick={() => openEdit(journey)}>
                    <EditOutlined />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(journey.id)}>
                    <DeleteOutlined />
                  </IconButton>
                </Stack>
              </Box>
            </MainCard>
          </Grid>
        ))}
        {rows.length === 0 && (
          <Grid size={12}>
            <MainCard>
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No guided journeys yet. Add one to feature a curated set of courses in the app.
              </Typography>
            </MainCard>
          </Grid>
        )}
      </Grid>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 560, md: 640 }, height: '100%', overflow: 'hidden' } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexShrink: 0 }}>
            <Typography variant="h4">{form.id ? 'Edit journey' : 'Add journey'}</Typography>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button color="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save journey'}
              </Button>
            </Stack>
          </Stack>
          <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField
              label="Eyebrow"
              fullWidth
              helperText="Small label above the title on the journey card (e.g. RECOVERY, ACTIVE JOURNEY)."
              value={form.eyebrow}
              onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
            />
            <TextField
              label="Detail"
              fullWidth
              helperText="Short description shown under the title (e.g. Postpartum + Nutrition + Yoga)."
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Cover image
              </Typography>
              <Box
                sx={{
                  height: 140,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundImage: form.imageUrl
                    ? `url(${form.imageUrl})`
                    : `linear-gradient(135deg, ${form.colorStart}, ${form.colorEnd})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  mb: 1.5
                }}
              />
              <Button
                variant="outlined"
                startIcon={<CloudUploadOutlined />}
                onClick={handlePickImage}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : form.imageUrl ? 'Replace image' : 'Upload image'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
              <TextField
                label="or paste an image URL"
                fullWidth
                sx={{ mt: 1.5 }}
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </Box>

            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Fallback gradient start
                </Typography>
                <Box
                  component="input"
                  type="color"
                  value={form.colorStart}
                  onChange={(e) => setForm({ ...form, colorStart: e.target.value })}
                  sx={{ width: '100%', height: 40, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Fallback gradient end
                </Typography>
                <Box
                  component="input"
                  type="color"
                  value={form.colorEnd}
                  onChange={(e) => setForm({ ...form, colorEnd: e.target.value })}
                  sx={{ width: '100%', height: 40, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }}
                />
              </Box>
            </Stack>

            <Autocomplete
              multiple
              options={courseOptions}
              value={courseOptions.filter((opt) => form.courseIds.includes(opt.id))}
              onChange={(_, selected) => setForm({ ...form, courseIds: selected.map((s) => s.id) })}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="Courses in this journey" placeholder="Add courses from the library" />
              )}
            />

            <TextField select label="Status" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </TextField>
            <TextField
              label="Sort order"
              type="number"
              fullWidth
              helperText="Lower numbers appear first in the Guided Journeys row."
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            />
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
