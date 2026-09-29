import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import MainCard from 'components/MainCard';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';
import {
  USER_TYPE_OPTIONS,
  INTENSITY_OPTIONS,
  DURATION_DAY_PRESETS,
  RECOVERY_TYPE_OPTIONS,
  clampDurationDays
} from 'api/dailyPlans';

// assets
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import ArrowRightOutlined from '@ant-design/icons/ArrowRightOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';

const emptyPlan = () => ({
  id: '',
  title: '',
  description: '',
  userType: 'yoga',
  status: 'published',
  sortOrder: 0,
  durationDays: 30,
  items: []
});

const emptyLibrary = () => ({
  id: '',
  title: '',
  itemType: 'exercise',
  tag: '',
  subtitle: '',
  durationMinutes: 10,
  restMinutes: 0,
  mediaUrl: '',
  cue: '',
  steps: [],
  status: 'published',
  sortOrder: 0
});

function userLabel(id) {
  return USER_TYPE_OPTIONS.find((o) => o.id === id)?.label || id;
}

function intensityLabel(id) {
  return INTENSITY_OPTIONS.find((o) => o.id === id)?.label || id;
}

const DEFAULT_LEVEL_MINUTES = {
  beginner: 5,
  intermediate: 10,
  active: 15
};

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

export default function DailyPlanEditor() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !planId || planId === 'new';

  const {
    dailyPlans,
    dailyPlansLoading,
    exerciseLibrary,
    exerciseLibraryLoading,
    saveDailyPlan,
    saveExerciseLibraryItem,
    uploadDailyPlanPicture,
    refreshExerciseLibrary
  } = useAdminData();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [planForm, setPlanForm] = useState(emptyPlan());
  const [planSaving, setPlanSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [activeLevel, setActiveLevel] = useState('beginner');
  const [contentKind, setContentKind] = useState('workout'); // workout | recovery
  const [recoveryType, setRecoveryType] = useState('full-body');
  const [pickerSearch, setPickerSearch] = useState('');
  const [ready, setReady] = useState(false);

  const [libOpen, setLibOpen] = useState(false);
  const [libForm, setLibForm] = useState(emptyLibrary());
  const [libSaving, setLibSaving] = useState(false);
  const [libUploading, setLibUploading] = useState(false);
  const libFileRef = useRef(null);
  const pickerListRef = useRef(null);

  useEffect(() => {
    if (dailyPlansLoading || exerciseLibraryLoading) return;

    if (isNew) {
      setPlanForm({ ...emptyPlan(), sortOrder: (dailyPlans || []).length });
      setStep(0);
      setActiveDay(1);
      setActiveLevel('beginner');
      setReady(true);
      return;
    }

    const plan = (dailyPlans || []).find((p) => p.id === planId);
    if (!plan) {
      setError('Plan not found');
      setReady(true);
      return;
    }

    const durationDays = clampDurationDays(plan.durationDays || 30);
    const dayParam = Number(searchParams.get('day') || 1);

    setPlanForm({
      ...emptyPlan(),
      ...plan,
      durationDays,
          items: (plan.items || [])
            .map((item) => ({
              ...item,
              dayNumber: item.dayNumber || 1,
              intensityLevel: item.intensityLevel || 'beginner',
              recoveryType: item.recoveryType || (item.itemType === 'recovery' ? 'full-body' : '')
            }))
            .filter((item) => Number(item.dayNumber) <= durationDays)
    });
    setStep(1);
    setActiveDay(Math.min(Math.max(1, dayParam), durationDays));
    setActiveLevel('beginner');
    setReady(true);
  }, [dailyPlans, dailyPlansLoading, exerciseLibraryLoading, isNew, planId, searchParams]);

  const library = useMemo(() => {
    return (exerciseLibrary || [])
      .filter((item) => {
        const type = String(item.itemType || 'exercise').toLowerCase();
        return type === 'exercise' || type === 'rest';
      })
      .slice()
      .sort((a, b) => {
        const customA = String(a.id || '').startsWith('lib-seed-') ? 0 : 1;
        const customB = String(b.id || '').startsWith('lib-seed-') ? 0 : 1;
        if (customA !== customB) return customB - customA;
        return (b.sortOrder ?? 0) - (a.sortOrder ?? 0) || String(a.title).localeCompare(String(b.title));
      });
  }, [exerciseLibrary]);

  const dayLevelItems = useMemo(
    () =>
      (planForm.items || []).filter((item) => {
        if ((item.intensityLevel || 'beginner') !== activeLevel) return false;
        const type = String(item.itemType || 'exercise').toLowerCase();
        if (contentKind === 'recovery') {
          return type === 'recovery' && (item.recoveryType || 'full-body') === recoveryType;
        }
        if (Number(item.dayNumber) !== Number(activeDay)) return false;
        return type === 'exercise' || type === 'rest';
      }),
    [planForm.items, activeDay, activeLevel, contentKind, recoveryType]
  );

  const pickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return library.filter((item) => {
      const type = String(item.itemType || 'exercise').toLowerCase();
      if (type !== 'exercise' && type !== 'rest') return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.tag || '').toLowerCase().includes(q) ||
        (item.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [library, pickerSearch]);

  const setDurationDays = (days) => {
    const durationDays = clampDurationDays(days);
    setPlanForm((prev) => ({
      ...prev,
      durationDays,
      items: (prev.items || []).filter((item) => Number(item.dayNumber) <= durationDays)
    }));
    setActiveDay((d) => Math.min(d, durationDays));
  };

  const goToWorkouts = () => {
    if (!planForm.title.trim()) {
      setPlanForm((prev) => ({
        ...prev,
        title: `${userLabel(prev.userType)} Plan`
      }));
    }
    setActiveDay(1);
    setActiveLevel('beginner');
    setStep(1);
  };

  const addFromLibrary = (libItem) => {
    const minutes =
      contentKind === 'recovery'
        ? Math.max(5, Number(libItem.durationMinutes) || 10)
        : DEFAULT_LEVEL_MINUTES[activeLevel] || libItem.durationMinutes || 10;
    const recoveryLabel = RECOVERY_TYPE_OPTIONS.find((o) => o.id === recoveryType)?.label || 'Recovery';
    setPlanForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: '',
          libraryId: libItem.id,
          dayNumber: contentKind === 'recovery' ? 1 : activeDay,
          intensityLevel: activeLevel,
          recoveryType: contentKind === 'recovery' ? recoveryType : '',
          itemType: contentKind === 'recovery' ? 'recovery' : libItem.itemType || 'exercise',
          title: libItem.title,
          tag: contentKind === 'recovery' ? `${intensityLabel(activeLevel)} · ${recoveryLabel}` : libItem.tag,
          subtitle: libItem.subtitle,
          scheduledTime: '',
          durationMinutes: minutes,
          restMinutes: libItem.restMinutes,
          mediaUrl: libItem.mediaUrl,
          cue: libItem.cue,
          steps: libItem.steps || [],
          sortOrder: dayLevelItems.length
        }
      ]
    }));
  };

  const removeItem = (index) => {
    setPlanForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateItemDuration = (index, minutes) => {
    setPlanForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, durationMinutes: Math.max(1, Number(minutes) || 1) } : item
      )
    }));
  };

  const savePlan = async () => {
    if (!planForm.title.trim() || planSaving) return;
    if (!planForm.items.some((item) => item.title.trim())) {
      setError('Add at least one exercise for a level.');
      setStep(1);
      return;
    }
    try {
      setPlanSaving(true);
      setError('');
      await saveDailyPlan({
        ...planForm,
        durationDays: clampDurationDays(planForm.durationDays),
        items: planForm.items.filter((item) => item.title.trim()).map((item, i) => ({ ...item, sortOrder: i }))
      });
      navigate('/content/daily-plans');
    } catch (err) {
      setError(err.message || 'Could not save plan');
    } finally {
      setPlanSaving(false);
    }
  };

  const openLibCreate = () => {
    setLibForm({ ...emptyLibrary(), sortOrder: Date.now() });
    setLibOpen(true);
  };

  const saveLib = async () => {
    if (!libForm.title.trim() || libSaving) return;
    try {
      setLibSaving(true);
      setError('');
      const saved = await saveExerciseLibraryItem({
        ...libForm,
        itemType: libForm.itemType || 'exercise',
        sortOrder: libForm.id ? libForm.sortOrder : Date.now()
      });
      await refreshExerciseLibrary();
      setLibOpen(false);
      setPickerSearch(saved.title || '');
      if (pickerListRef.current) pickerListRef.current.scrollTop = 0;
    } catch (err) {
      setError(err.message || 'Could not save exercise');
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

  if (!ready || dailyPlansLoading || exerciseLibraryLoading) {
    return <Loader />;
  }

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Button size="small" startIcon={<ArrowLeftOutlined />} onClick={() => navigate('/content/daily-plans')} sx={{ mb: 1 }}>
            Back to Daily Plans
          </Button>
          <Typography variant="h3" fontWeight={800}>
            {isNew ? 'Create plan' : 'Edit plan'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {step === 0
              ? 'Activity → days (1–30) → then set exercises per level'
              : `${userLabel(planForm.userType)} · ${planForm.durationDays} days · ${intensityLabel(activeLevel)}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {['Setup', 'Workouts'].map((label, i) => (
            <Chip
              key={label}
              color={step === i ? 'primary' : 'default'}
              variant={step === i ? 'filled' : 'outlined'}
              label={`${i + 1}. ${label}`}
              onClick={() => {
                if (i === 0 || planForm.title.trim() || !isNew) setStep(i);
              }}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {step === 0 && (
        <MainCard>
          <TextField
            label="Plan name"
            fullWidth
            value={planForm.title}
            onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Yoga Plan"
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Activity
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
              gap: 1,
              mb: 3
            }}
          >
            {USER_TYPE_OPTIONS.map((o) => {
              const selected = planForm.userType === o.id;
              return (
                <Button
                  key={o.id}
                  fullWidth
                  variant={selected ? 'contained' : 'outlined'}
                  onClick={() =>
                    setPlanForm((prev) => ({
                      ...prev,
                      userType: o.id,
                      title: prev.id ? prev.title : `${o.label} Plan`
                    }))
                  }
                  sx={{ height: 48, textTransform: 'none', fontWeight: 700, fontSize: 13, borderRadius: 2 }}
                >
                  {o.label}
                </Button>
              );
            })}
          </Box>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Plan length (1–30 days)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {DURATION_DAY_PRESETS.map((days) => {
              const selected = Number(planForm.durationDays) === days;
              return (
                <Button
                  key={days}
                  variant={selected ? 'contained' : 'outlined'}
                  onClick={() => setDurationDays(days)}
                  sx={{ minWidth: 72, height: 44, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  {days} days
                </Button>
              );
            })}
          </Stack>
          <TextField
            type="number"
            label="Days"
            value={planForm.durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            inputProps={{ min: 1, max: 30 }}
            sx={{ mb: 3, maxWidth: 160 }}
            helperText="Members cycle through Day 1…N in Today Tasks"
          />

          <Alert severity="info" sx={{ mb: 3 }}>
            Next you will set exercises and duration separately for <strong>Beginner</strong>, <strong>Intermediate</strong>, and{' '}
            <strong>Active</strong> on each day.
          </Alert>

          <Button variant="contained" size="large" endIcon={<ArrowRightOutlined />} onClick={goToWorkouts}>
            Continue to workouts ({planForm.durationDays} days)
          </Button>
        </MainCard>
      )}

      {step === 1 && (
        <MainCard contentSX={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Button size="small" startIcon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>
              Back to setup
            </Button>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {planForm.durationDays} days · pick a day, then a level
            </Typography>
          </Stack>

          {contentKind === 'workout' ? (
            <Box sx={{ ...scrollBoxSx, mb: 2 }}>
              <Box sx={{ display: 'inline-flex', gap: 0.75, width: 'max-content', pr: 1 }}>
                {Array.from({ length: planForm.durationDays }, (_, i) => {
                  const day = i + 1;
                  const n = (planForm.items || []).filter((item) => Number(item.dayNumber) === day && String(item.itemType || 'exercise') !== 'recovery').length;
                  const selected = activeDay === day;
                  return (
                    <Chip
                      key={day}
                      clickable
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      label={n ? `Day ${day} (${n})` : `Day ${day}`}
                      onClick={() => setActiveDay(day)}
                      sx={{ flexShrink: 0, fontWeight: 700 }}
                    />
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              {RECOVERY_TYPE_OPTIONS.map((o) => {
                const count = (planForm.items || []).filter(
                  (item) =>
                    String(item.itemType || '') === 'recovery' &&
                    (item.recoveryType || 'full-body') === o.id &&
                    (item.intensityLevel || 'beginner') === activeLevel
                ).length;
                const selected = recoveryType === o.id;
                return (
                  <Chip
                    key={o.id}
                    clickable
                    color={selected ? 'secondary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    label={`${o.label}${count ? ` · ${count}` : ''}`}
                    onClick={() => setRecoveryType(o.id)}
                    sx={{ fontWeight: 700 }}
                  />
                );
              })}
            </Stack>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            {[
              { id: 'workout', label: 'Workouts (Today Tasks)' },
              { id: 'recovery', label: 'Recovery stretches' }
            ].map((o) => (
              <Chip
                key={o.id}
                clickable
                color={contentKind === o.id ? 'secondary' : 'default'}
                variant={contentKind === o.id ? 'filled' : 'outlined'}
                label={o.label}
                onClick={() => setContentKind(o.id)}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {INTENSITY_OPTIONS.map((o) => {
              const count = (planForm.items || []).filter((item) => {
                if ((item.intensityLevel || 'beginner') !== o.id) return false;
                const type = String(item.itemType || 'exercise').toLowerCase();
                if (contentKind === 'recovery') {
                  return type === 'recovery' && (item.recoveryType || 'full-body') === recoveryType;
                }
                return Number(item.dayNumber) === Number(activeDay) && (type === 'exercise' || type === 'rest');
              }).length;
              const selected = activeLevel === o.id;
              return (
                <Chip
                  key={o.id}
                  clickable
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  label={`${o.label}${count ? ` · ${count}` : ''}`}
                  onClick={() => setActiveLevel(o.id)}
                  sx={{ fontWeight: 700 }}
                />
              );
            })}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
              gap: 2,
              minHeight: 480
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                height: { xs: 420, md: 560 }
              }}
            >
              <Box sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={800}>1. Choose exercise</Typography>
                  <Button size="small" startIcon={<PlusOutlined />} onClick={openLibCreate}>
                    New
                  </Button>
                </Stack>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Box>
              <Box ref={pickerListRef} sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Stack spacing={0.75}>
                  {pickerItems.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.25,
                          bgcolor: 'grey.100',
                          backgroundImage: item.mediaUrl ? `url(${item.mediaUrl})` : 'none',
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          flexShrink: 0
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Library default {item.durationMinutes} min
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => addFromLibrary(item)}>
                        Add →
                      </Button>
                    </Stack>
                  ))}
                  {!pickerItems.length && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                      No exercises found
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>

            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                height: { xs: 420, md: 560 }
              }}
            >
              <Box sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'primary.light', bgcolor: 'primary.main' }}>
                <Typography fontWeight={800} sx={{ color: '#fff' }}>
                  2.{' '}
                  {contentKind === 'recovery'
                    ? `${RECOVERY_TYPE_OPTIONS.find((o) => o.id === recoveryType)?.label || 'Recovery'} · ${intensityLabel(activeLevel)}`
                    : `Day ${activeDay} · ${intensityLabel(activeLevel)} · Tasks`}{' '}
                  ({dayLevelItems.length})
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.85) }}>
                  {contentKind === 'recovery'
                    ? 'Users pick this stretch type — Today Tasks are skipped (no points)'
                    : 'Exercises shown in Today Tasks — set duration per level'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Stack spacing={0.75}>
                  {!dayLevelItems.length && (
                    <Box sx={{ py: 5, px: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Empty for {intensityLabel(activeLevel)}. Click <strong>Add →</strong> on the left.
                      </Typography>
                    </Box>
                  )}
                  {(planForm.items || []).map((item, index) => {
                    if ((item.intensityLevel || 'beginner') !== activeLevel) return null;
                    const type = String(item.itemType || 'exercise').toLowerCase();
                    if (contentKind === 'recovery') {
                      if (type !== 'recovery' || (item.recoveryType || 'full-body') !== recoveryType) return null;
                    } else {
                      if (Number(item.dayNumber) !== Number(activeDay)) return null;
                      if (type !== 'exercise' && type !== 'rest') return null;
                    }
                    let order = 0;
                    for (let i = 0; i <= index; i += 1) {
                      const it = planForm.items[i];
                      if ((it?.intensityLevel || 'beginner') !== activeLevel) continue;
                      const t = String(it?.itemType || 'exercise').toLowerCase();
                      if (contentKind === 'recovery') {
                        if (t !== 'recovery' || (it?.recoveryType || 'full-body') !== recoveryType) continue;
                      } else {
                        if (Number(it?.dayNumber) !== Number(activeDay)) continue;
                        if (t !== 'exercise' && t !== 'rest') continue;
                      }
                      order += 1;
                    }
                    return (
                      <Stack
                        key={`i-${index}`}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper'
                        }}
                      >
                        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ width: 16 }}>
                          {order}
                        </Typography>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.25,
                            bgcolor: 'grey.100',
                            backgroundImage: item.mediaUrl ? `url(${item.mediaUrl})` : 'none',
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            flexShrink: 0
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {item.title}
                          </Typography>
                        </Box>
                        <TextField
                          size="small"
                          type="number"
                          value={item.durationMinutes || 0}
                          onChange={(e) => updateItemDuration(index, e.target.value)}
                          inputProps={{ min: 1, max: 180 }}
                          sx={{ width: 88 }}
                          InputProps={{ endAdornment: <Typography variant="caption">min</Typography> }}
                        />
                        <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                          <DeleteOutlined />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
            <Button fullWidth variant="outlined" onClick={() => navigate('/content/daily-plans')}>
              Cancel
            </Button>
            <Button fullWidth variant="contained" size="large" onClick={savePlan} disabled={planSaving || !planForm.title.trim()}>
              {planSaving ? 'Saving…' : 'Save plan'}
            </Button>
          </Stack>
        </MainCard>
      )}

      <input ref={libFileRef} type="file" accept="image/*,.gif" hidden onChange={onLibUpload} />
      <Drawer anchor="right" open={libOpen} onClose={() => setLibOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, height: '100%', overflow: 'hidden' } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 800, flexShrink: 0 }}>
            New exercise
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flexShrink: 0 }}>
            Add a name and GIF — then place it on any plan day / level.
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Stack spacing={1.75}>
              <TextField label="Name" fullWidth value={libForm.title} onChange={(e) => setLibForm((p) => ({ ...p, title: e.target.value }))} />
              <Stack direction="row" spacing={1}>
                <TextField
                  type="number"
                  label="Minutes"
                  fullWidth
                  value={libForm.durationMinutes}
                  onChange={(e) => setLibForm((p) => ({ ...p, durationMinutes: Number(e.target.value) || 0 }))}
                />
                <TextField
                  type="number"
                  label="Rest (min)"
                  fullWidth
                  value={libForm.restMinutes}
                  onChange={(e) => setLibForm((p) => ({ ...p, restMinutes: Number(e.target.value) || 0 }))}
                />
              </Stack>
              <Button variant="outlined" startIcon={<CloudUploadOutlined />} onClick={() => libFileRef.current?.click()} disabled={libUploading}>
                {libUploading ? 'Uploading…' : 'Upload photo / GIF'}
              </Button>
              {libForm.mediaUrl ? (
                <Box component="img" src={libForm.mediaUrl} alt="" sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 2, bgcolor: 'grey.50' }} />
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
