import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import MainCard from 'components/MainCard';
import StatusChip from 'components/admin/StatusChip';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';
import { ITEM_TYPE_OPTIONS, USER_TYPE_OPTIONS, INTENSITY_OPTIONS } from 'api/dailyPlans';
import { isVideoMediaUrl } from 'utils/mediaUrl';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import CalendarOutlined from '@ant-design/icons/CalendarOutlined';
import FireOutlined from '@ant-design/icons/FireOutlined';

const emptyLibrary = () => ({
  id: '',
  title: '',
  itemType: 'exercise',
  tag: '',
  subtitle: '',
  durationMinutes: 300,
  restMinutes: 30,
  mediaUrl: '',
  cue: '',
  steps: [],
  status: 'published',
  sortOrder: 0
});

function typeLabel(type) {
  return ITEM_TYPE_OPTIONS.find((o) => o.id === type)?.label || type;
}

function userLabel(id) {
  return USER_TYPE_OPTIONS.find((o) => o.id === id)?.label || id;
}

function formatSec(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

const scrollBoxSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  pb: 1,
  scrollbarWidth: 'thin',
  WebkitOverflowScrolling: 'touch'
};

const PLAN_DRAWER_WIDTH = 880;

function ExerciseCard({ item, onEdit, onDelete }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: 260,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 28px rgba(1, 46, 45, 0.12)'
        }
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 180,
          flexShrink: 0,
          bgcolor: 'grey.100',
          overflow: 'hidden'
        }}
      >
        {item.mediaUrl ? (
          isVideoMediaUrl(item.mediaUrl) ? (
            <Box
              component="video"
              src={item.mediaUrl}
              muted
              loop
              autoPlay
              playsInline
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          ) : (
            <Box
              component="img"
              src={item.mediaUrl}
              alt={item.title}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          )
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: 'text.disabled' }}>
            <FireOutlined style={{ fontSize: 28 }} />
          </Stack>
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(1,20,19,0.72) 100%)',
            pointerEvents: 'none'
          }}
        />
        <Chip
          size="small"
          label={formatSec(item.durationMinutes)}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            height: 24,
            bgcolor: 'rgba(255,255,255,0.92)',
            fontWeight: 700,
            fontSize: 11
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 10,
            color: '#fff',
            fontWeight: 800,
            lineHeight: 1.2,
            textShadow: '0 1px 8px rgba(0,0,0,0.45)'
          }}
          noWrap
        >
          {item.title}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          height: 80,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {item.tag || typeLabel(item.itemType)}
          {item.restMinutes ? ` · rest ${formatSec(item.restMinutes)}` : ''}
        </Typography>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <IconButton size="small" onClick={onEdit} sx={{ bgcolor: 'primary.lighter' }}>
            <EditOutlined />
          </IconButton>
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteOutlined />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

export default function DailyPlans() {
  const theme = useTheme();
  const navigate = useNavigate();
  const {
    dailyPlans,
    dailyPlansLoading,
    dailyPlansError,
    exerciseLibrary,
    exerciseLibraryLoading,
    deleteDailyPlan,
    saveExerciseLibraryItem,
    deleteExerciseLibraryItem,
    uploadDailyPlanPicture,
    refreshExerciseLibrary
  } = useAdminData();

  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [libOpen, setLibOpen] = useState(false);
  const [libForm, setLibForm] = useState(emptyLibrary());
  const [libSaving, setLibSaving] = useState(false);
  const [libUploading, setLibUploading] = useState(false);
  const libFileRef = useRef(null);

  const library = useMemo(() => {
    return (exerciseLibrary || [])
      .filter((item) => {
        const type = String(item.itemType || 'exercise').toLowerCase();
        return type === 'exercise';
      })
      .slice()
      .sort((a, b) => {
        const customA = String(a.id || '').startsWith('lib-seed-') ? 0 : 1;
        const customB = String(b.id || '').startsWith('lib-seed-') ? 0 : 1;
        if (customA !== customB) return customB - customA;
        return (b.sortOrder ?? 0) - (a.sortOrder ?? 0) || String(a.title).localeCompare(String(b.title));
      });
  }, [exerciseLibrary]);
  const plans = useMemo(() => [...(dailyPlans || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [dailyPlans]);
  const visiblePlans = useMemo(
    () => (filterType === 'all' ? plans : plans.filter((p) => p.userType === filterType)),
    [plans, filterType]
  );

  const openLibCreate = () => {
    setLibForm({ ...emptyLibrary(), sortOrder: Date.now() });
    setError('');
    setLibOpen(true);
  };

  const openLibEdit = (item) => {
    setLibForm({ ...emptyLibrary(), ...item });
    setError('');
    setLibOpen(true);
  };

  const saveLib = async () => {
    if (!libForm.title.trim() || libSaving) return;
    try {
      setLibSaving(true);
      setError('');
      await saveExerciseLibraryItem({
        ...libForm,
        itemType: 'exercise',
        sortOrder: libForm.id ? libForm.sortOrder : Date.now()
      });
      await refreshExerciseLibrary();
      setLibOpen(false);
    } catch (err) {
      setError(err.message || 'Could not save');
    } finally {
      setLibSaving(false);
    }
  };

  const onLibUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setLibUploading(true);
      const url = await uploadDailyPlanPicture(libForm.id || 'library', file);
      setLibForm((prev) => ({ ...prev, mediaUrl: url }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLibUploading(false);
    }
  };

  const openPlanCreate = () => {
    if (!library.length) {
      setTab(0);
      setError('Add at least one exercise first, then create a plan.');
      return;
    }
    navigate('/content/daily-plans/new');
  };

  const openPlanEdit = (plan, day = 1) => {
    const q = day > 1 ? `?day=${day}` : '';
    navigate(`/content/daily-plans/${plan.id}${q}`);
  };

  if ((dailyPlansLoading || exerciseLibraryLoading) && !plans.length && !library.length) {
    return <Loader />;
  }

  return (
    <>
      <Box
        sx={{
          mb: 2.5,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 55%, ${theme.palette.primary[700]} 100%)`,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.08)
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: 60,
            bottom: -50,
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.06)
          }}
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          spacing={2}
          sx={{ width: '100%', position: 'relative', zIndex: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0, pr: { sm: 2 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <ThunderboltOutlined style={{ fontSize: 18 }} />
              <Typography variant="caption" sx={{ opacity: 0.85, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>
                Today Tasks engine
              </Typography>
            </Stack>
            <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800, mb: 0.5 }}>
              Daily Plans
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, maxWidth: 480 }}>
              One plan per activity. Pick 1–30 days, then set exercises and duration for Beginner, Intermediate, and Active.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                icon={<FireOutlined style={{ color: '#fff' }} />}
                label={`${library.length} exercises`}
                sx={{ bgcolor: alpha('#fff', 0.16), color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
              />
              <Chip
                size="small"
                icon={<CalendarOutlined style={{ color: '#fff' }} />}
                label={`${plans.length} plans`}
                sx={{ bgcolor: alpha('#fff', 0.16), color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
              />
            </Stack>
          </Box>
          <Box sx={{ ml: { xs: 0, sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'flex-start' }, flexShrink: 0 }}>
            {tab === 0 ? (
              <Button
                variant="contained"
                startIcon={<PlusOutlined />}
                onClick={openLibCreate}
                sx={{
                  bgcolor: '#fff',
                  color: 'primary.main',
                  fontWeight: 700,
                  float: { sm: 'right' },
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': { bgcolor: alpha('#fff', 0.9) }
                }}
              >
                Add exercise
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<PlusOutlined />}
                onClick={openPlanCreate}
                sx={{
                  bgcolor: '#fff',
                  color: 'primary.main',
                  fontWeight: 700,
                  float: { sm: 'right' },
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': { bgcolor: alpha('#fff', 0.9) }
                }}
              >
                Create plan
              </Button>
            )}
          </Box>
        </Stack>
      </Box>

      {(dailyPlansError || error) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error || dailyPlansError}
        </Alert>
      )}

      <MainCard contentSX={{ p: 0 }} border boxShadow>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setError('');
          }}
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 52,
            '& .MuiTab-root': { minHeight: 52, textTransform: 'none', fontWeight: 700, fontSize: 15 },
            '& .Mui-selected': { color: 'primary.main' }
          }}
        >
          <Tab icon={<FireOutlined />} iconPosition="start" label={`Exercises (${library.length})`} />
          <Tab icon={<CalendarOutlined />} iconPosition="start" label={`Plans (${plans.length})`} />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2.5 }}>
            {!library.length ? (
              <Box
                sx={{
                  py: 7,
                  px: 2,
                  textAlign: 'center',
                  borderRadius: 3,
                  border: '1px dashed',
                  borderColor: 'primary.light',
                  bgcolor: alpha(theme.palette.primary.main, 0.04)
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    color: 'primary.main'
                  }}
                >
                  <FireOutlined style={{ fontSize: 28 }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 800 }}>
                  Start with your exercise library
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 380, mx: 'auto' }}>
                  Add workouts with a photo or GIF. Then drop them into plan days for Yoga, Boxing, and more.
                </Typography>
                <Button variant="contained" size="large" startIcon={<PlusOutlined />} onClick={openLibCreate}>
                  Add first exercise
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))'
                  },
                  gap: 2
                }}
              >
                {library.map((item) => (
                  <ExerciseCard
                    key={item.id}
                    item={item}
                    onEdit={() => openLibEdit(item)}
                    onDelete={async () => {
                      try {
                        await deleteExerciseLibraryItem(item.id);
                      } catch (err) {
                        setError(err.message || 'Delete failed');
                      }
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
              spacing={1.5}
              sx={{ mb: 2.5 }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  User plans
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Each plan is one activity. Members see their level&apos;s exercises for today&apos;s day.
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label="Audience"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All audiences</MenuItem>
                {USER_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {!visiblePlans.length ? (
              <Box
                sx={{
                  py: 7,
                  textAlign: 'center',
                  borderRadius: 3,
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.primary.main, 0.03)
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    color: 'primary.main'
                  }}
                >
                  <CalendarOutlined style={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 800 }}>
                  No plans yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 360, mx: 'auto' }}>
                  {library.length
                    ? 'Create a plan, choose an activity and days, then set exercises per level.'
                    : 'Add exercises first, then create a plan.'}
                </Typography>
                <Button variant="contained" size="large" startIcon={<PlusOutlined />} onClick={openPlanCreate}>
                  Create plan
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  gap: 2
                }}
              >
                {visiblePlans.map((plan) => {
                  const days = Math.min(30, Math.max(1, Number(plan.durationDays || 30)));
                  const previewMedia = (plan.items || []).map((i) => i.mediaUrl).filter(Boolean).slice(0, 5);
                  const audience = userLabel(plan.userType);
                  const levelCounts = INTENSITY_OPTIONS.map((lvl) => {
                    const n = (plan.items || []).filter((i) => (i.intensityLevel || 'beginner') === lvl.id).length;
                    return n ? `${lvl.label[0]}:${n}` : null;
                  }).filter(Boolean);
                  return (
                    <Box
                      key={plan.id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                        '&:hover': {
                          boxShadow: '0 10px 28px rgba(1, 46, 45, 0.1)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.75,
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          color: '#fff'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h5" fontWeight={800} noWrap sx={{ color: '#fff' }}>
                              {plan.title}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>
                              For {audience}
                            </Typography>
                          </Box>
                          <StatusChip status={plan.status} />
                        </Stack>
                      </Box>

                      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" color="primary" variant="outlined" label={`${days} days`} />
                          <Chip size="small" variant="outlined" label={`${plan.items?.length || 0} workouts`} />
                          {levelCounts.length ? (
                            <Chip size="small" variant="outlined" label={levelCounts.join(' · ')} />
                          ) : null}
                        </Stack>

                        {previewMedia.length > 0 ? (
                          <Stack direction="row" spacing={1}>
                            {previewMedia.map((url, idx) => (
                              <Box
                                key={`${plan.id}-m-${idx}`}
                                sx={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 1.5,
                                  backgroundImage: `url(${url})`,
                                  backgroundSize: 'contain',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'center',
                                  border: '1px solid',
                                  borderColor: 'divider'
                                }}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No workouts attached yet
                          </Typography>
                        )}

                        <Box sx={scrollBoxSx}>
                          <Box sx={{ display: 'inline-flex', gap: 0.75, width: 'max-content', pr: 1 }}>
                            {Array.from({ length: Math.min(days, 14) }, (_, i) => {
                              const day = i + 1;
                              const count = (plan.items || []).filter((item) => Number(item.dayNumber || 1) === day).length;
                              return (
                                <Chip
                                  key={day}
                                  size="small"
                                  variant={count ? 'filled' : 'outlined'}
                                  color={count ? 'primary' : 'default'}
                                  label={`Day ${day}${count ? ` · ${count}` : ''}`}
                                  onClick={() => openPlanEdit(plan, day)}
                                  sx={{ flexShrink: 0 }}
                                />
                              );
                            })}
                            {days > 14 ? (
                              <Chip size="small" variant="outlined" label={`+${days - 14} days`} onClick={() => openPlanEdit(plan)} sx={{ flexShrink: 0 }} />
                            ) : null}
                          </Box>
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 0.5 }}>
                          <Button fullWidth variant="contained" startIcon={<EditOutlined />} onClick={() => openPlanEdit(plan)}>
                            Edit plan
                          </Button>
                          <IconButton
                            color="error"
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                            onClick={async () => {
                              try {
                                await deleteDailyPlan(plan.id);
                              } catch (err) {
                                setError(err.message || 'Delete failed');
                              }
                            }}
                          >
                            <DeleteOutlined />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </MainCard>

      {/* Exercise drawer */}
      <input ref={libFileRef} type="file" accept="image/*,.gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" hidden onChange={onLibUpload} />
      <Drawer anchor="right" open={libOpen} onClose={() => setLibOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, height: '100%', overflow: 'hidden' } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 800, flexShrink: 0 }}>
            {libForm.id ? 'Edit exercise' : 'New exercise'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flexShrink: 0 }}>
            Add a name and video or GIF — then place it on any plan day.
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Stack spacing={1.75}>
              <TextField label="Name" fullWidth value={libForm.title} onChange={(e) => setLibForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Bodyweight Squats" />
              <Stack direction="row" spacing={1}>
                <TextField type="number" label="Work (sec)" fullWidth value={libForm.durationMinutes} onChange={(e) => setLibForm((p) => ({ ...p, durationMinutes: Number(e.target.value) || 0 }))} helperText="e.g. 300 = 5m, 45 = 45s" />
                <TextField type="number" label="Rest after (sec)" fullWidth value={libForm.restMinutes} onChange={(e) => setLibForm((p) => ({ ...p, restMinutes: Number(e.target.value) || 0 }))} helperText="e.g. 30 or 10" />
              </Stack>
              <TextField label="Tip (optional)" fullWidth multiline minRows={2} value={libForm.cue} onChange={(e) => setLibForm((p) => ({ ...p, cue: e.target.value }))} />
              <Button variant="outlined" startIcon={<CloudUploadOutlined />} onClick={() => libFileRef.current?.click()} disabled={libUploading}>
                {libUploading ? 'Uploading…' : 'Upload video / GIF / photo'}
              </Button>
              {libForm.mediaUrl ? (
                isVideoMediaUrl(libForm.mediaUrl) ? (
                  <Box
                    component="video"
                    src={libForm.mediaUrl}
                    controls
                    muted
                    loop
                    autoPlay
                    playsInline
                    sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={libForm.mediaUrl}
                    alt=""
                    sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}
                  />
                )
              ) : null}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexShrink: 0, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button fullWidth variant="outlined" onClick={() => setLibOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth variant="contained" onClick={saveLib} disabled={libSaving || !libForm.title.trim()}>
              {libSaving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Box>
      </Drawer>

    </>
  );
}
