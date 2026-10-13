import { useMemo, useRef, useState } from 'react';

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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import MainCard from 'components/MainCard';
import Loader from 'components/Loader';
import ConfirmDialog from 'components/admin/ConfirmDialog';
import { useAdminData } from 'contexts/AdminDataContext';
import {
  FOOD_PREFERENCE_OPTIONS,
  INTENSITY_OPTIONS,
  MEAL_SLOT_OPTIONS,
  USER_TYPE_OPTIONS,
  audienceSignature,
  clampDurationDays,
  cmFromFtIn,
  encodeMealAudience,
  formatMealAudienceLabel,
  ftInFromCm,
  mealSlotKey,
  parseMealAudience
} from 'api/dailyPlans';
import { isVideoMediaUrl } from 'utils/mediaUrl';
import { stepsFromText, stepsToText } from 'utils/steps';

import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';

const emptyMeal = () => ({
  id: '',
  title: '',
  itemType: 'food',
  tag: 'Breakfast',
  subtitle: '',
  durationMinutes: 900, // stored in SECONDS (15 min)
  restMinutes: 0,
  mediaUrl: '',
  cue: '',
  steps: [],
  status: 'published',
  sortOrder: 0,
  // UI-only fields (converted on save)
  prepMinutes: 15,
  stepsText: ''
});

/** Library/plan durations are stored in seconds; the meal form edits minutes. */
function prepMinutesFromSeconds(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.max(1, Math.round(n / 60));
}

const emptyAssign = () => ({
  userTypes: ['boxing', 'yoga'],
  intensityLevels: ['beginner', 'active'],
  foods: ['Eat everything'],
  heightUnit: 'cm',
  heightMin: 150,
  heightMax: 175,
  heightMinFt: 4,
  heightMinIn: 11,
  heightMaxFt: 5,
  heightMaxIn: 9,
  weightMin: 50,
  weightMax: 80,
  dayNumber: 1,
  mealSlot: 'Lunch',
  mealId: '',
  mealSearch: ''
});

function userLabel(id) {
  return USER_TYPE_OPTIONS.find((o) => o.id === id)?.label || id;
}

function intensityLabel(id) {
  return INTENSITY_OPTIONS.find((o) => o.id === id)?.label || id;
}

function toggleInList(list, value) {
  const arr = Array.isArray(list) ? list : [];
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function SectionCard({ step, title, hint, children }) {
  return (
    <Box
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1.75 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0
          }}
        >
          {step}
        </Box>
        <Box>
          <Typography fontWeight={800}>{title}</Typography>
          {hint ? (
            <Typography variant="body2" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {children}
    </Box>
  );
}

function ChipMultiSelect({ options, value, onChange, getLabel = (o) => o.label || o, getId = (o) => o.id || o }) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {options.map((opt) => {
        const id = getId(opt);
        const active = selected.includes(id);
        return (
          <Chip
            key={id}
            clickable
            color={active ? 'primary' : 'default'}
            variant={active ? 'filled' : 'outlined'}
            label={getLabel(opt)}
            onClick={() => onChange(toggleInList(selected, id))}
            sx={{ fontWeight: 700 }}
          />
        );
      })}
    </Stack>
  );
}

function MealCard({ item, onEdit, onDelete }) {
  return (
    <Box
      sx={{
        height: 280,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ position: 'relative', height: 160, bgcolor: 'grey.100', overflow: 'hidden' }}>
        {item.mediaUrl ? (
          isVideoMediaUrl(item.mediaUrl) ? (
            <Box component="video" src={item.mediaUrl} muted loop autoPlay playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Box component="img" src={item.mediaUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )
        ) : (
          <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: 'text.disabled', fontWeight: 700 }}>No photo</Box>
        )}
        <Chip
          size="small"
          label={item.tag || 'Meal'}
          sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(255,255,255,0.92)', fontWeight: 700 }}
        />
      </Box>
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        <Typography fontWeight={800} noWrap>
          {item.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {(item.steps || []).length ? `${(item.steps || []).length} steps` : item.cue || item.subtitle || 'No steps yet'}
        </Typography>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ mt: 'auto' }}>
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

export default function MealsPage() {
  const theme = useTheme();
  const {
    dailyPlans,
    dailyPlansLoading,
    exerciseLibrary,
    exerciseLibraryLoading,
    saveDailyPlan,
    addDailyPlanItems,
    removeDailyPlanItems,
    saveExerciseLibraryItem,
    deleteExerciseLibraryItem,
    uploadDailyPlanPicture,
    refreshExerciseLibrary
  } = useAdminData();

  const [pageTab, setPageTab] = useState(0);
  const [slotFilter, setSlotFilter] = useState('all');
  const [error, setError] = useState('');
  const [libError, setLibError] = useState('');
  const [ok, setOk] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [libOpen, setLibOpen] = useState(false);
  const [libForm, setLibForm] = useState(emptyMeal());
  const [libSaving, setLibSaving] = useState(false);
  const [libUploading, setLibUploading] = useState(false);
  const [assignForm, setAssignForm] = useState(emptyAssign());
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const libFileRef = useRef(null);

  const meals = useMemo(() => {
    return (exerciseLibrary || [])
      .filter((item) => String(item.itemType || '').toLowerCase() === 'food')
      .filter((item) => (slotFilter === 'all' ? true : item.tag === slotFilter))
      .slice()
      .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0) || String(a.title).localeCompare(String(b.title)));
  }, [exerciseLibrary, slotFilter]);

  const allMeals = useMemo(
    () => (exerciseLibrary || []).filter((item) => String(item.itemType || '').toLowerCase() === 'food'),
    [exerciseLibrary]
  );

  const assignmentGroups = useMemo(() => {
    const map = new Map();
    for (const plan of dailyPlans || []) {
      for (const item of plan.items || []) {
        if (String(item.itemType || '').toLowerCase() !== 'food') continue;
        const slot = mealSlotKey(item) || item.tag || 'Meal';
        const audience = parseMealAudience(item.subtitle);
        const dayNumber = Number(item.dayNumber) || 1;
        const mealKey = String(item.libraryId || item.title || '').trim().toLowerCase();
        const groupKey = [mealKey, dayNumber, slot, audienceSignature(audience)].join('::');
        const existing = map.get(groupKey);
        if (existing) {
          if (!existing.programs.includes(plan.userType)) existing.programs.push(plan.userType);
          const level = item.intensityLevel || 'beginner';
          if (!existing.levels.includes(level)) existing.levels.push(level);
          existing.rows.push({ planId: plan.id, itemId: item.id });
          if (!existing.mediaUrl && item.mediaUrl) existing.mediaUrl = item.mediaUrl;
        } else {
          map.set(groupKey, {
            key: groupKey,
            title: item.title,
            mediaUrl: item.mediaUrl || '',
            dayNumber,
            slot,
            audience,
            programs: [plan.userType],
            levels: [item.intensityLevel || 'beginner'],
            rows: [{ planId: plan.id, itemId: item.id }]
          });
        }
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        Number(a.dayNumber) - Number(b.dayNumber) ||
        String(a.slot).localeCompare(String(b.slot)) ||
        String(a.title).localeCompare(String(b.title))
    );
  }, [dailyPlans]);

  const filteredAssignmentGroups = useMemo(() => {
    const q = String(assignSearch || '')
      .trim()
      .toLowerCase();
    if (!q) return assignmentGroups;
    return assignmentGroups.filter((g) => {
      const programs = g.programs.map(userLabel).join(' ');
      const levels = g.levels.map(intensityLabel).join(' ');
      const audience = formatMealAudienceLabel(g.audience);
      return `${g.title} ${g.slot} day ${g.dayNumber} ${programs} ${levels} ${audience}`.toLowerCase().includes(q);
    });
  }, [assignmentGroups, assignSearch]);

  const openCreate = () => {
    setLibForm({ ...emptyMeal(), sortOrder: Date.now() });
    setLibError('');
    setLibOpen(true);
  };

  const openEdit = (item) => {
    setLibForm({
      ...emptyMeal(),
      ...item,
      itemType: 'food',
      prepMinutes: prepMinutesFromSeconds(item.durationMinutes),
      stepsText: stepsToText(item.steps)
    });
    setLibError('');
    setLibOpen(true);
  };

  const saveMeal = async () => {
    if (!libForm.title.trim() || libSaving) return;
    try {
      setLibSaving(true);
      setLibError('');
      const { prepMinutes, stepsText, ...rest } = libForm;
      await saveExerciseLibraryItem({
        ...rest,
        itemType: 'food',
        tag: libForm.tag || 'Breakfast',
        // Form edits minutes; DB stores seconds.
        durationMinutes: Math.max(1, Math.round(Number(prepMinutes) || 15)) * 60,
        steps: stepsFromText(stepsText),
        sortOrder: libForm.id ? libForm.sortOrder : Date.now()
      });
      await refreshExerciseLibrary();
      setLibOpen(false);
    } catch (err) {
      setLibError(err?.message || 'Could not save meal');
    } finally {
      setLibSaving(false);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setLibUploading(true);
      const url = await uploadDailyPlanPicture(libForm.id || 'meal', file);
      setLibForm((prev) => ({ ...prev, mediaUrl: url }));
    } catch (err) {
      setLibError(err?.message || 'Upload failed');
    } finally {
      setLibUploading(false);
    }
  };

  const resolveHeightCm = () => {
    if (assignForm.heightUnit === 'ft') {
      return {
        heightMin: cmFromFtIn(assignForm.heightMinFt, assignForm.heightMinIn),
        heightMax: cmFromFtIn(assignForm.heightMaxFt, assignForm.heightMaxIn)
      };
    }
    return {
      heightMin: assignForm.heightMin === '' ? null : Number(assignForm.heightMin),
      heightMax: assignForm.heightMax === '' ? null : Number(assignForm.heightMax)
    };
  };

  const saveAssignment = async () => {
    if (assignSaving) return;
    const meal = allMeals.find((m) => m.id === assignForm.mealId);
    if (!meal) {
      setError('Pick a meal from the library first.');
      return;
    }
    const programs = Array.isArray(assignForm.userTypes) ? assignForm.userTypes.filter(Boolean) : [];
    const levels = Array.isArray(assignForm.intensityLevels) ? assignForm.intensityLevels.filter(Boolean) : [];
    const foods = Array.isArray(assignForm.foods) ? assignForm.foods.filter(Boolean) : [];
    if (!programs.length) {
      setError('Select at least one program (e.g. Yoga and Boxing).');
      return;
    }
    if (!levels.length) {
      setError('Select at least one experience level (e.g. Beginner and Active).');
      return;
    }
    if (!foods.length) {
      setError('Select at least one food style.');
      return;
    }
    const dayNumber = Math.max(1, Math.min(30, Number(assignForm.dayNumber) || 1));
    const mealSlot = assignForm.mealSlot || 'Lunch';
    const { heightMin, heightMax } = resolveHeightCm();
    const audience = {
      foods,
      food: foods[0],
      heightMin,
      heightMax,
      weightMin: assignForm.weightMin === '' ? null : Number(assignForm.weightMin),
      weightMax: assignForm.weightMax === '' ? null : Number(assignForm.weightMax)
    };
    const audienceMeta = encodeMealAudience(audience);
    const sig = audienceSignature(audience);
    const levelSet = new Set(levels);

    try {
      setAssignSaving(true);
      setError('');
      setOk('');

      const savedLabels = [];
      const plansSnapshot = [...(dailyPlans || [])];

      for (const userType of programs) {
        let plan = plansSnapshot.find((p) => p.userType === userType && p.status === 'published');
        if (!plan) plan = plansSnapshot.find((p) => p.userType === userType);

        const buildNewItems = (startOrder) =>
          levels.map((intensityLevel, idx) => ({
            id: '',
            libraryId: meal.id,
            dayNumber,
            intensityLevel,
            recoveryType: '',
            itemType: 'food',
            title: meal.title,
            tag: mealSlot,
            subtitle: audienceMeta,
            scheduledTime: mealSlot.toLowerCase(),
            // Library duration is already stored in seconds: copy as-is (default 15 min).
            durationMinutes: Math.max(1, Number(meal.durationMinutes) || 900),
            restMinutes: 0,
            mediaUrl: meal.mediaUrl || '',
            cue: meal.cue || meal.subtitle || '',
            steps: meal.steps || [],
            sortOrder: startOrder + idx
          }));

        if (!plan) {
          // No plan for this program yet: create one containing just this meal.
          const created = await saveDailyPlan({
            id: '',
            title: `${userLabel(userType)} Plan`,
            description: `Meals & workouts for ${userLabel(userType)}`,
            userType,
            status: 'published',
            sortOrder: plansSnapshot.length,
            durationDays: clampDurationDays(Math.max(30, dayNumber)),
            items: buildNewItems(0)
          });
          plansSnapshot.push(created);
          savedLabels.push(userLabel(userType));
          continue;
        }

        // Only replace food items this screen manages: same day / level / slot AND the same
        // AUDIENCE: tag. Items without an AUDIENCE tag (e.g. added in the plan editor) are kept.
        const replaceIds = (plan.items || [])
          .filter((item) => {
            if (String(item.itemType || '').toLowerCase() !== 'food') return false;
            if (Number(item.dayNumber) !== dayNumber) return false;
            if (!levelSet.has(String(item.intensityLevel || 'beginner'))) return false;
            if (mealSlotKey(item) !== mealSlot) return false;
            const existing = parseMealAudience(item.subtitle);
            if (!existing) return false;
            return audienceSignature(existing) === sig;
          })
          .map((item) => item.id)
          .filter(Boolean);

        const maxOrder = (plan.items || []).reduce((m, item) => Math.max(m, Number(item.sortOrder) || 0), 0);
        const needsLongerPlan = dayNumber > (plan.durationDays || 30);

        // Add the new rows first, then remove the ones they replace (never leaves a gap on failure).
        await addDailyPlanItems(plan.id, buildNewItems(maxOrder + 1), {
          durationDays: needsLongerPlan ? clampDurationDays(dayNumber) : undefined
        });
        if (replaceIds.length) await removeDailyPlanItems(plan.id, replaceIds);
        savedLabels.push(userLabel(userType));
      }

      setOk(
        `Saved on ${savedLabels.join(', ')} · ${levels.map(intensityLabel).join(' + ')} · ${formatMealAudienceLabel(audience)} → ${mealSlot} Day ${dayNumber}: ${meal.title}`
      );
    } catch (err) {
      setError(err?.message || 'Could not assign meal');
    } finally {
      setAssignSaving(false);
    }
  };

  const removeAssignmentGroup = async (group) => {
    if (!group?.rows?.length) return;
    setError('');
    setOk('');
    const byPlan = new Map();
    for (const row of group.rows) {
      if (!row.itemId) continue;
      if (!byPlan.has(row.planId)) byPlan.set(row.planId, []);
      byPlan.get(row.planId).push(row.itemId);
    }
    // Remove only this group's food rows; the rest of each plan is untouched.
    for (const [planId, itemIds] of byPlan.entries()) {
      await removeDailyPlanItems(planId, itemIds);
    }
    if (selectedGroupKey === group.key) setSelectedGroupKey('');
    setOk(`Removed “${group.title}” from ${group.programs.map(userLabel).join(', ')}`);
  };

  if ((exerciseLibraryLoading || dailyPlansLoading) && !(exerciseLibrary || []).length && !(dailyPlans || []).length) {
    return <Loader />;
  }

  return (
    <>
      <MainCard
        title="Meals"
        secondary={
          pageTab === 0 ? (
            <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
              New meal
            </Button>
          ) : null
        }
      >
        <Tabs value={pageTab} onChange={(_, v) => setPageTab(v)} sx={{ mb: 2, minHeight: 42 }}>
          <Tab label="Library" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Assign to audience" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {(error || null) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {(ok || null) && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOk('')}>
            {ok}
          </Alert>
        )}

        {pageTab === 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create meal recipes here. Then use <strong>Assign to audience</strong> to set who eats what (e.g. Boxing + Eat everything + Lunch Day 1).
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip
                clickable
                color={slotFilter === 'all' ? 'primary' : 'default'}
                variant={slotFilter === 'all' ? 'filled' : 'outlined'}
                label="All"
                onClick={() => setSlotFilter('all')}
                sx={{ fontWeight: 700 }}
              />
              {MEAL_SLOT_OPTIONS.map((o) => (
                <Chip
                  key={o.id}
                  clickable
                  color={slotFilter === o.id ? 'primary' : 'default'}
                  variant={slotFilter === o.id ? 'filled' : 'outlined'}
                  label={o.label}
                  onClick={() => setSlotFilter(o.id)}
                  sx={{ fontWeight: 700 }}
                />
              ))}
            </Stack>

            {!meals.length ? (
              <Box
                sx={{
                  p: 4,
                  borderRadius: 2.5,
                  border: '1px dashed',
                  borderColor: 'divider',
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.03)
                }}
              >
                <Typography fontWeight={800} sx={{ mb: 1 }}>
                  No meals yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add oatmeal, chicken bowls, salmon… with photos and cook steps.
                </Typography>
                <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
                  Create first meal
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
                  gap: 2
                }}
              >
                {meals.map((item) => (
                  <MealCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() =>
                      setConfirm({
                        title: 'Delete meal?',
                        message: `“${item.title}” will be removed from the meal library. Meals already assigned to plans stay until you remove them under Assign to audience.`,
                        onConfirm: async () => {
                          await deleteExerciseLibraryItem(item.id);
                          await refreshExerciseLibrary();
                        }
                      })
                    }
                  />
                ))}
              </Box>
            )}
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tap chips to select many at once when the meal is the same (e.g. Boxing + Yoga, Beginner + Active, Eat everything + High protein).
            </Typography>

            <SectionCard step={1} title="Who is this meal for?" hint="Select every program, experience, and food style that should get this same meal.">
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                PROGRAMS
              </Typography>
              <ChipMultiSelect
                options={USER_TYPE_OPTIONS}
                value={assignForm.userTypes}
                onChange={(userTypes) => setAssignForm((p) => ({ ...p, userTypes }))}
              />
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mt: 2.5, mb: 1 }}>
                EXPERIENCE
              </Typography>
              <ChipMultiSelect
                options={INTENSITY_OPTIONS}
                value={assignForm.intensityLevels}
                onChange={(intensityLevels) => setAssignForm((p) => ({ ...p, intensityLevels }))}
              />
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mt: 2.5, mb: 1 }}>
                FOOD STYLE
              </Typography>
              <ChipMultiSelect
                options={FOOD_PREFERENCE_OPTIONS}
                value={assignForm.foods}
                getId={(f) => f}
                getLabel={(f) => f}
                onChange={(foods) => setAssignForm((p) => ({ ...p, foods }))}
              />
            </SectionCard>

            <SectionCard step={2} title="Body range" hint="Members in this height / weight range see the meal. Height can be cm or ft + in. Weight is kg.">
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25 }}>
                <Typography variant="body2" fontWeight={800}>
                  Height
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={assignForm.heightUnit}
                  onChange={(_, v) => {
                    if (!v) return;
                    setAssignForm((p) => {
                      if (v === 'ft' && p.heightUnit === 'cm') {
                        const lo = ftInFromCm(p.heightMin);
                        const hi = ftInFromCm(p.heightMax);
                        return {
                          ...p,
                          heightUnit: 'ft',
                          heightMinFt: lo.ft === '' ? 4 : lo.ft,
                          heightMinIn: lo.inch === '' ? 11 : lo.inch,
                          heightMaxFt: hi.ft === '' ? 5 : hi.ft,
                          heightMaxIn: hi.inch === '' ? 9 : hi.inch
                        };
                      }
                      if (v === 'cm' && p.heightUnit === 'ft') {
                        return {
                          ...p,
                          heightUnit: 'cm',
                          heightMin: cmFromFtIn(p.heightMinFt, p.heightMinIn) ?? 150,
                          heightMax: cmFromFtIn(p.heightMaxFt, p.heightMaxIn) ?? 175
                        };
                      }
                      return { ...p, heightUnit: v };
                    });
                  }}
                >
                  <ToggleButton value="cm" sx={{ textTransform: 'none', fontWeight: 700, px: 1.5 }}>
                    cm
                  </ToggleButton>
                  <ToggleButton value="ft" sx={{ textTransform: 'none', fontWeight: 700, px: 1.5 }}>
                    ft + in
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              {assignForm.heightUnit === 'ft' ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      type="number"
                      label="From (ft)"
                      fullWidth
                      inputProps={{ min: 4, max: 8 }}
                      value={assignForm.heightMinFt}
                      onChange={(e) =>
                        setAssignForm((p) => ({ ...p, heightMinFt: e.target.value === '' ? '' : Number(e.target.value) }))
                      }
                    />
                    <TextField
                      type="number"
                      label="in"
                      fullWidth
                      inputProps={{ min: 0, max: 11 }}
                      value={assignForm.heightMinIn}
                      onChange={(e) =>
                        setAssignForm((p) => ({ ...p, heightMinIn: e.target.value === '' ? '' : Number(e.target.value) }))
                      }
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      type="number"
                      label="To (ft)"
                      fullWidth
                      inputProps={{ min: 4, max: 8 }}
                      value={assignForm.heightMaxFt}
                      onChange={(e) =>
                        setAssignForm((p) => ({ ...p, heightMaxFt: e.target.value === '' ? '' : Number(e.target.value) }))
                      }
                    />
                    <TextField
                      type="number"
                      label="in"
                      fullWidth
                      inputProps={{ min: 0, max: 11 }}
                      value={assignForm.heightMaxIn}
                      onChange={(e) =>
                        setAssignForm((p) => ({ ...p, heightMaxIn: e.target.value === '' ? '' : Number(e.target.value) }))
                      }
                    />
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
                  <TextField
                    type="number"
                    label="Height from (cm)"
                    fullWidth
                    value={assignForm.heightMin}
                    onChange={(e) => setAssignForm((p) => ({ ...p, heightMin: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                  <TextField
                    type="number"
                    label="Height to (cm)"
                    fullWidth
                    value={assignForm.heightMax}
                    onChange={(e) => setAssignForm((p) => ({ ...p, heightMax: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </Box>
              )}

              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mt: 2.5, mb: 1 }}>
                WEIGHT (kg)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
                <TextField
                  type="number"
                  label="Weight from (kg)"
                  fullWidth
                  value={assignForm.weightMin}
                  onChange={(e) => setAssignForm((p) => ({ ...p, weightMin: e.target.value === '' ? '' : Number(e.target.value) }))}
                />
                <TextField
                  type="number"
                  label="Weight to (kg)"
                  fullWidth
                  value={assignForm.weightMax}
                  onChange={(e) => setAssignForm((p) => ({ ...p, weightMax: e.target.value === '' ? '' : Number(e.target.value) }))}
                />
              </Box>
            </SectionCard>

            <SectionCard step={3} title="When & which meal?" hint="Choose the plan day, meal time, then search and tap a meal photo.">
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.75,
                  mb: 2
                }}
              >
                <TextField
                  type="number"
                  label="Day number"
                  fullWidth
                  inputProps={{ min: 1, max: 30 }}
                  value={assignForm.dayNumber}
                  onChange={(e) => setAssignForm((p) => ({ ...p, dayNumber: Number(e.target.value) || 1 }))}
                  helperText="Day 1–30"
                />
                <TextField
                  select
                  label="Meal time"
                  fullWidth
                  value={assignForm.mealSlot}
                  onChange={(e) => setAssignForm((p) => ({ ...p, mealSlot: e.target.value }))}
                >
                  {MEAL_SLOT_OPTIONS.map((o) => (
                    <MenuItem key={o.id} value={o.id}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <TextField
                fullWidth
                size="small"
                placeholder="Search meals…"
                value={assignForm.mealSearch}
                onChange={(e) => setAssignForm((p) => ({ ...p, mealSearch: e.target.value }))}
                sx={{ mb: 1.5 }}
              />

              {!allMeals.length ? (
                <Typography variant="body2" color="text.secondary">
                  Create a meal in Library first.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                    gap: 1.25,
                    maxHeight: 320,
                    overflowY: 'auto',
                    pr: 0.5
                  }}
                >
                  {allMeals
                    .filter((m) => {
                      const q = String(assignForm.mealSearch || '')
                        .trim()
                        .toLowerCase();
                      if (!q) return true;
                      return `${m.title} ${m.tag || ''} ${m.subtitle || ''}`.toLowerCase().includes(q);
                    })
                    .map((m) => {
                      const selected = assignForm.mealId === m.id;
                      return (
                        <Box
                          key={m.id}
                          onClick={() => setAssignForm((p) => ({ ...p, mealId: m.id }))}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '2px solid',
                            borderColor: selected ? 'primary.main' : 'divider',
                            bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
                            transition: 'border-color 0.15s ease'
                          }}
                        >
                          <Box sx={{ position: 'relative', height: 88, bgcolor: 'grey.100' }}>
                            {m.mediaUrl ? (
                              isVideoMediaUrl(m.mediaUrl) ? (
                                <Box
                                  component="video"
                                  src={m.mediaUrl}
                                  muted
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Box component="img" src={m.mediaUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )
                            ) : (
                              <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: 'text.disabled', fontSize: 12, fontWeight: 700 }}>
                                No photo
                              </Box>
                            )}
                            {m.tag ? (
                              <Chip
                                size="small"
                                label={m.tag}
                                sx={{ position: 'absolute', top: 6, left: 6, height: 22, bgcolor: 'rgba(255,255,255,0.92)', fontWeight: 700 }}
                              />
                            ) : null}
                          </Box>
                          <Typography fontWeight={800} sx={{ px: 1, py: 0.75, fontSize: 13 }} noWrap>
                            {m.title}
                          </Typography>
                        </Box>
                      );
                    })}
                </Box>
              )}
            </SectionCard>

            <Box
              sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: alpha(theme.palette.primary.main, 0.06)
              }}
            >
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                WILL SAVE AS
              </Typography>
              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                {(assignForm.userTypes || []).map(userLabel).join(' + ') || 'No program'}
                {' · '}
                {(assignForm.intensityLevels || []).map(intensityLabel).join(' + ') || 'No experience'}
                {' · '}
                {(assignForm.foods || []).join(' + ') || 'No food style'}
                {' · '}
                {assignForm.heightUnit === 'ft'
                  ? `${assignForm.heightMinFt || '?'}'${assignForm.heightMinIn ?? 0}"–${assignForm.heightMaxFt || '?'}'${assignForm.heightMaxIn ?? 0}"`
                  : `${assignForm.heightMin || '?'}–${assignForm.heightMax || '?'} cm`}
                {' · '}
                {assignForm.weightMin || '?'}–{assignForm.weightMax || '?'} kg
                {' → '}
                {assignForm.mealSlot} Day {assignForm.dayNumber}
                {assignForm.mealId
                  ? `: ${allMeals.find((m) => m.id === assignForm.mealId)?.title || 'Meal'}`
                  : ' (pick a meal)'}
              </Typography>
              <Button
                variant="contained"
                size="large"
                disabled={
                  assignSaving ||
                  !assignForm.mealId ||
                  !(assignForm.userTypes || []).length ||
                  !(assignForm.intensityLevels || []).length ||
                  !(assignForm.foods || []).length
                }
                onClick={saveAssignment}
                sx={{ minWidth: 220, fontWeight: 800 }}
              >
                {assignSaving ? 'Saving…' : 'Assign meal'}
              </Button>
            </Box>

            <Typography fontWeight={800} sx={{ mb: 0.5 }}>
              Current meal assignments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Same meal on Boxing + Yoga is one card. Search, tap to select, delete to remove everywhere it was saved.
            </Typography>

            {!assignmentGroups.length ? (
              <Typography variant="body2" color="text.secondary">
                No meals assigned to plans yet.
              </Typography>
            ) : (
              <>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search assigned meals, programs, day…"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                {!filteredAssignmentGroups.length ? (
                  <Typography variant="body2" color="text.secondary">
                    No assignments match “{assignSearch}”.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                      gap: 1.5
                    }}
                  >
                    {filteredAssignmentGroups.map((group) => {
                      const selected = selectedGroupKey === group.key;
                      return (
                        <Box
                          key={group.key}
                          onClick={() => setSelectedGroupKey(group.key)}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 2.5,
                            overflow: 'hidden',
                            border: '2px solid',
                            borderColor: selected ? 'primary.main' : 'divider',
                            bgcolor: selected ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <Box sx={{ position: 'relative', height: 120, bgcolor: 'grey.100' }}>
                            {group.mediaUrl ? (
                              isVideoMediaUrl(group.mediaUrl) ? (
                                <Box
                                  component="video"
                                  src={group.mediaUrl}
                                  muted
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Box
                                  component="img"
                                  src={group.mediaUrl}
                                  alt=""
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              )
                            ) : (
                              <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: 'text.disabled', fontWeight: 700 }}>
                                No photo
                              </Box>
                            )}
                            <Chip
                              size="small"
                              label={`${group.slot} · Day ${group.dayNumber}`}
                              sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(255,255,255,0.94)', fontWeight: 800 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirm({
                                  title: 'Remove meal assignment?',
                                  message: `“${group.title}” (${group.slot}, Day ${group.dayNumber}) will be removed from ${group.programs
                                    .map(userLabel)
                                    .join(', ')} for ${group.levels.map(intensityLabel).join(', ')}.`,
                                  confirmLabel: 'Remove',
                                  onConfirm: () => removeAssignmentGroup(group)
                                });
                              }}
                              sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(255,255,255,0.92)' }}
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </Box>
                          <Box sx={{ p: 1.5, flex: 1 }}>
                            <Typography fontWeight={800} noWrap sx={{ mb: 0.75 }}>
                              {group.title}
                            </Typography>
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.75 }}>
                              {group.programs.map((p) => (
                                <Chip key={p} size="small" label={userLabel(p)} sx={{ fontWeight: 700 }} />
                              ))}
                              {group.levels.map((l) => (
                                <Chip key={l} size="small" variant="outlined" label={intensityLabel(l)} sx={{ fontWeight: 700 }} />
                              ))}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {formatMealAudienceLabel(group.audience)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </MainCard>

      <input ref={libFileRef} type="file" accept="image/*,.gif,video/mp4,video/webm" hidden onChange={onUpload} />
      <Drawer anchor="right" open={libOpen} onClose={() => setLibOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 800 }}>
            {libForm.id ? 'Edit meal' : 'New meal'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Save the recipe, then assign it to a program / day / meal time.
          </Typography>
          {libError ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLibError('')}>
              {libError}
            </Alert>
          ) : null}
          <Stack spacing={1.75} sx={{ flex: 1, overflowY: 'auto' }}>
            <TextField label="Meal name" fullWidth value={libForm.title} onChange={(e) => setLibForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Oatmeal with berries" />
            <TextField
              select
              label="Default meal slot"
              fullWidth
              value={libForm.tag || 'Breakfast'}
              onChange={(e) => setLibForm((p) => ({ ...p, tag: e.target.value }))}
            >
              {MEAL_SLOT_OPTIONS.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Prep time (min)"
              fullWidth
              inputProps={{ min: 1, max: 600 }}
              value={libForm.prepMinutes ?? ''}
              onChange={(e) => setLibForm((p) => ({ ...p, prepMinutes: e.target.value === '' ? '' : Number(e.target.value) }))}
              helperText="Shown in the app as the meal prep time"
            />
            <TextField label="Short note (optional)" fullWidth value={libForm.subtitle || ''} onChange={(e) => setLibForm((p) => ({ ...p, subtitle: e.target.value }))} />
            <TextField label="Tip (optional)" fullWidth multiline minRows={2} value={libForm.cue || ''} onChange={(e) => setLibForm((p) => ({ ...p, cue: e.target.value }))} />
            <TextField
              label="Steps (one per line)"
              fullWidth
              multiline
              minRows={5}
              value={libForm.stepsText ?? ''}
              onChange={(e) => setLibForm((p) => ({ ...p, stepsText: e.target.value }))}
              placeholder={'1. Prep ingredients\n2. Cook\n3. Serve'}
            />
            <Button variant="outlined" startIcon={<CloudUploadOutlined />} onClick={() => libFileRef.current?.click()} disabled={libUploading}>
              {libUploading ? 'Uploading…' : 'Upload photo'}
            </Button>
            {libForm.mediaUrl ? (
              <Box component="img" src={libForm.mediaUrl} alt="" sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 2 }} />
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ pt: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setLibOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth variant="contained" disabled={libSaving || !libForm.title.trim()} onClick={saveMeal}>
              {libSaving ? 'Saving…' : 'Save meal'}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
