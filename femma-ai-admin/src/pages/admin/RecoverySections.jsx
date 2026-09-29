import { useEffect, useMemo, useRef, useState } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import MainCard from 'components/MainCard';
import StatusChip from 'components/admin/StatusChip';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';
import { INTENSITY_OPTIONS } from 'api/dailyPlans';
import {
  RECOVERY_KEY_OPTIONS,
  fetchRecoverySections,
  upsertRecoverySection,
  removeRecoverySection,
  uploadRecoveryCover
} from 'api/recoverySections';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';

const emptySection = () => ({
  id: '',
  title: '',
  sectionKey: 'full-body',
  isRest: false,
  coverUrl: '',
  status: 'published',
  sortOrder: Math.floor(Date.now() / 1000),
  items: []
});

export default function RecoverySections() {
  const theme = useTheme();
  const { exerciseLibrary, exerciseLibraryLoading, refreshExerciseLibrary } = useAdminData();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptySection());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeLevel, setActiveLevel] = useState('beginner');
  const [pickerSearch, setPickerSearch] = useState('');
  const fileRef = useRef(null);

  const refresh = async () => {
    const rows = await fetchRecoverySections();
    setSections(rows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([refresh(), refreshExerciseLibrary?.()]);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load recovery');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshExerciseLibrary]);

  const library = useMemo(() => {
    return (exerciseLibrary || [])
      .filter((item) => String(item.itemType || 'exercise') === 'exercise')
      .slice()
      .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  }, [exerciseLibrary]);

  const pickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return library.filter((item) => !q || item.title.toLowerCase().includes(q) || (item.tag || '').toLowerCase().includes(q));
  }, [library, pickerSearch]);

  const levelItems = useMemo(
    () => (form.items || []).filter((item) => (item.intensityLevel || 'beginner') === activeLevel),
    [form.items, activeLevel]
  );

  const openCreate = () => {
    setForm(emptySection());
    setActiveLevel('beginner');
    setError('');
    setOpen(true);
  };

  const openEdit = (section) => {
    setForm({
      ...emptySection(),
      ...section,
      items: (section.items || []).map((item) => ({ ...item }))
    });
    setActiveLevel('beginner');
    setError('');
    setOpen(true);
  };

  const addExercise = (libItem) => {
    if (form.isRest || form.sectionKey === 'rest') return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: '',
          intensityLevel: activeLevel,
          title: libItem.title,
          durationMinutes: libItem.durationMinutes || 8,
          restMinutes: libItem.restMinutes || 0,
          mediaUrl: libItem.mediaUrl || '',
          cue: libItem.cue || '',
          steps: libItem.steps || [],
          sortOrder: levelItems.length
        }
      ]
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadRecoveryCover(form.id || 'new', file);
      setForm((prev) => ({ ...prev, coverUrl: url }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || saving) return;
    try {
      setSaving(true);
      setError('');
      const isRest = form.sectionKey === 'rest' || form.isRest;
      await upsertRecoverySection({
        ...form,
        isRest,
        sectionKey: isRest ? 'rest' : form.sectionKey,
        items: isRest ? [] : form.items
      });
      await refresh();
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || exerciseLibraryLoading) return <Loader />;

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h3" fontWeight={800}>
            Recovery
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create Rest / stretch sections with a cover image and exercises. Shown on the app Today screen.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
          Add section
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
        {sections.map((section) => (
          <MainCard key={section.id} contentSX={{ p: 0 }} border boxShadow>
            <Box
              sx={{
                height: 160,
                bgcolor: 'grey.100',
                backgroundImage: section.coverUrl ? `url(${section.coverUrl})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                <StatusChip status={section.status} />
              </Box>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography variant="h5" fontWeight={800} noWrap>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {section.isRest
                  ? 'Rest day · skips Today Tasks'
                  : `1 Section · ${section.items?.length || 0} exercises`}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button fullWidth variant="contained" startIcon={<EditOutlined />} onClick={() => openEdit(section)}>
                  Edit
                </Button>
                <IconButton
                  color="error"
                  onClick={async () => {
                    try {
                      await removeRecoverySection(section.id);
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

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 520 }, height: '100%', overflow: 'hidden' } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, flexShrink: 0 }}>
            {form.id ? 'Edit section' : 'New section'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexShrink: 0 }}>
            Upload a cover photo, then add exercises for each fitness level.
          </Typography>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', pr: 0.5 }}>
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                label="Title"
                fullWidth
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Full Body Stretch"
              />
              <TextField
                select
                label="Type"
                value={form.sectionKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setForm((p) => ({
                    ...p,
                    sectionKey: key,
                    isRest: key === 'rest',
                    items: key === 'rest' ? [] : p.items
                  }));
                }}
              >
                {RECOVERY_KEY_OPTIONS.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
              </TextField>
              <Button variant="outlined" startIcon={<CloudUploadOutlined />} onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload cover image'}
              </Button>
              {form.coverUrl ? (
                <Box
                  component="img"
                  src={form.coverUrl}
                  alt=""
                  sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 2, bgcolor: 'grey.50' }}
                />
              ) : null}
            </Stack>

            {!form.isRest && form.sectionKey !== 'rest' ? (
              <>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                  {INTENSITY_OPTIONS.map((o) => {
                    const n = (form.items || []).filter((i) => (i.intensityLevel || 'beginner') === o.id).length;
                    return (
                      <Chip
                        key={o.id}
                        clickable
                        color={activeLevel === o.id ? 'primary' : 'default'}
                        variant={activeLevel === o.id ? 'filled' : 'outlined'}
                        label={`${o.label}${n ? ` · ${n}` : ''}`}
                        onClick={() => setActiveLevel(o.id)}
                        sx={{ fontWeight: 700 }}
                      />
                    );
                  })}
                </Stack>

                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search library…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  sx={{ mb: 1 }}
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                    minHeight: 280,
                    height: 320,
                    mb: 1
                  }}
                >
                  <Box sx={{ minHeight: 0, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ px: 0.5 }}>
                      Library
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                      {pickerItems.slice(0, 40).map((item) => (
                        <Stack
                          key={item.id}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03) }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              bgcolor: 'grey.100',
                              backgroundImage: item.mediaUrl ? `url(${item.mediaUrl})` : 'none',
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              flexShrink: 0
                            }}
                          />
                          <Typography variant="caption" fontWeight={700} noWrap sx={{ flex: 1 }}>
                            {item.title}
                          </Typography>
                          <Button size="small" onClick={() => addExercise(item)}>
                            Add
                          </Button>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                  <Box sx={{ minHeight: 0, overflowY: 'auto', border: '2px solid', borderColor: 'primary.main', borderRadius: 2, p: 1 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ px: 0.5 }}>
                      {activeLevel} list ({levelItems.length})
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                      {(form.items || []).map((item, index) => {
                        if ((item.intensityLevel || 'beginner') !== activeLevel) return null;
                        return (
                          <Stack
                            key={`ri-${index}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ p: 0.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1,
                                bgcolor: 'grey.100',
                                backgroundImage: item.mediaUrl ? `url(${item.mediaUrl})` : 'none',
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                flexShrink: 0
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" fontWeight={700} noWrap display="block">
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.durationMinutes} min
                              </Typography>
                            </Box>
                            <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                              <DeleteOutlined />
                            </IconButton>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                </Box>
              </>
            ) : (
              <Alert severity="info">Rest sections only need a title and cover image — no exercises.</Alert>
            )}
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexShrink: 0, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button fullWidth variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth variant="contained" onClick={save} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : 'Save section'}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
