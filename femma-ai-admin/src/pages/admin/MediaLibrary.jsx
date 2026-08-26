import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CardActionArea from '@mui/material/CardActionArea';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

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
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';
import PlayCircleOutlined from '@ant-design/icons/PlayCircleOutlined';
import BookOutlined from '@ant-design/icons/BookOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';

const UPLOAD_GUIDE_KEY = 'fema-ai-media-upload-guide-dismissed';

function lessonStatus(lesson) {
  if (lesson.videoStatus) return lesson.videoStatus;
  return lesson.videoUrl || lesson.muxPlaybackId ? 'ready' : 'awaiting';
}

const UPLOAD_STEPS = [
  {
    icon: BookOutlined,
    title: 'Create a lesson',
    description: 'Add it under Modules & Lessons first.'
  },
  {
    icon: CloudUploadOutlined,
    title: 'Upload video',
    description: 'Use the Upload video button or Upload on a lesson card.'
  },
  {
    icon: CheckCircleOutlined,
    title: 'Mux encodes',
    description: 'Pick MP4/MOV. Status becomes Ready when processing finishes.'
  }
];

function UploadGuide({ onDismiss, onGoToLessons }) {
  return (
    <Box
      sx={{
        mb: 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Video upload flow
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Follow these steps — only buttons upload files, not this panel.
          </Typography>
        </Box>
        <Button size="small" color="secondary" startIcon={<CloseOutlined />} onClick={onDismiss} sx={{ flexShrink: 0, mt: -0.5 }}>
          Got it
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {UPLOAD_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Grid key={step.title} size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.25 }}>
                    <Icon style={{ fontSize: 14, opacity: 0.75 }} />
                    <Typography variant="subtitle2">{step.title}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          );
        })}
      </Grid>

      <Stack direction="row" sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button size="small" variant="text" onClick={onGoToLessons}>
          Open Modules & Lessons
        </Button>
      </Stack>
    </Box>
  );
}

export default function MediaLibrary() {
  const navigate = useNavigate();
  const { lessons, categories, uploadLessonMedia, refreshCatalog, contentLoading, contentError } = useAdminData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickLessonId, setPickLessonId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [actionError, setActionError] = useState('');
  const [guideOpen, setGuideOpen] = useState(() => localStorage.getItem(UPLOAD_GUIDE_KEY) !== '1');
  const fileInputRef = useRef(null);

  const rows = useMemo(() => {
    return lessons
      .filter((l) => (categoryFilter === 'all' ? true : l.categoryId === categoryFilter))
      .filter((l) => {
        const status = lessonStatus(l);
        if (statusFilter === 'uploaded' || statusFilter === 'ready') return status === 'ready';
        if (statusFilter === 'awaiting') return status === 'awaiting';
        if (statusFilter === 'processing') return status === 'processing' || status === 'uploading';
        return true;
      })
      .filter((l) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [l.title, l.courseTitle, l.uploadKey, l.muxPlaybackId].join(' ').toLowerCase().includes(q);
      });
  }, [lessons, search, statusFilter, categoryFilter]);

  const { page, rowsPerPage, paginatedItems, handleChangePage, handleChangeRowsPerPage, count } = usePagination(
    rows,
    12,
    `${search}|${statusFilter}|${categoryFilter}`
  );

  const awaitingCount = lessons.filter((l) => lessonStatus(l) === 'awaiting').length;
  const processingCount = lessons.filter((l) => {
    const status = lessonStatus(l);
    return status === 'processing' || status === 'uploading';
  }).length;
  const showGuide = guideOpen && (lessons.length === 0 || awaitingCount > 0);

  useEffect(() => {
    if (processingCount === 0) return undefined;
    const timer = setInterval(() => {
      refreshCatalog().catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [processingCount, refreshCatalog]);

  const dismissGuide = () => {
    localStorage.setItem(UPLOAD_GUIDE_KEY, '1');
    setGuideOpen(false);
  };

  const openFilePickerForLesson = (lesson) => {
    setActionError('');
    setSelected(lesson);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const startUploadFlow = () => {
    setActionError('');
    if (!lessons.length) {
      navigate('/content/modules-lessons');
      return;
    }
    setPickLessonId(lessons.find((l) => lessonStatus(l) === 'awaiting')?.id || lessons[0].id);
    setPickOpen(true);
  };

  const confirmLessonAndPickFile = () => {
    const lesson = lessons.find((l) => l.id === pickLessonId);
    if (!lesson) {
      setActionError('Select a lesson first');
      return;
    }
    setPickOpen(false);
    openFilePickerForLesson(lesson);
  };

  const handlePickFile = () => {
    setActionError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected) return;

    try {
      setUploading(true);
      setProgress(0);
      setActionError('');
      await uploadLessonMedia(selected.id, file, setProgress);
      await refreshCatalog();
      setSelected(null);
    } catch (err) {
      setActionError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (contentLoading) return <Loader />;

  return (
    <>
      <PageHeader
        title="Media Library"
        subtitle={
          lessons.length
            ? `${awaitingCount} lesson${awaitingCount === 1 ? '' : 's'} still need video. Use Upload video or open a lesson card below.`
            : 'Create a lesson first, then attach video here.'
        }
        actionLabel={lessons.length ? 'Upload video' : 'Add lesson'}
        actionIcon={<CloudUploadOutlined />}
        onAction={startUploadFlow}
      />

      {(contentError || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError || contentError}
        </Alert>
      )}

      {showGuide && <UploadGuide onDismiss={dismissGuide} onGoToLessons={() => navigate('/content/modules-lessons')} />}

      <MainCard>
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search media…"
          filters={[
            {
              key: 'category',
              label: 'Category',
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: [{ value: 'all', label: 'All' }, ...categories.map((c) => ({ value: c.id, label: c.title }))]
            },
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All' },
                { value: 'ready', label: 'Ready' },
                { value: 'processing', label: 'Processing' },
                { value: 'awaiting', label: 'Awaiting' }
              ]
            }
          ]}
        />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {paginatedItems.map((lesson) => {
            const status = lessonStatus(lesson);
            const needsVideo = status === 'awaiting';
            return (
              <Grid key={lesson.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <MainCard content={false} border boxShadow>
                  <CardActionArea onClick={() => setSelected(lesson)}>
                    <Box
                      sx={{
                        height: 120,
                        bgcolor: status === 'ready' ? 'success.lighter' : status === 'awaiting' ? 'warning.lighter' : 'info.lighter',
                        backgroundImage: lesson.thumbnailUrl ? `url(${lesson.thumbnailUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {!lesson.thumbnailUrl && <PlayCircleOutlined style={{ fontSize: 36, opacity: 0.7 }} />}
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1" noWrap>
                        {lesson.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {lesson.courseTitle} · {lesson.durationMinutes} min
                      </Typography>
                      <Stack direction="row" sx={{ mt: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <StatusChip status={status} />
                        {needsVideo && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CloudUploadOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openFilePickerForLesson(lesson);
                            }}
                          >
                            Upload
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </CardActionArea>
                </MainCard>
              </Grid>
            );
          })}
          {count === 0 && (
            <Grid size={12}>
              <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
                <Typography color="text.secondary" textAlign="center">
                  No lessons yet. Lessons must exist before you can attach video.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/content/modules-lessons')}>
                  Go to Modules & Lessons
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>
        <TablePaginationBar
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[8, 12, 24]}
        />
      </MainCard>

      <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFileChange} />

      <Dialog open={pickOpen} onClose={() => setPickOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload video to lesson</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pick which lesson this video belongs to, then choose your file.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="pick-lesson-label">Lesson</InputLabel>
            <Select
              labelId="pick-lesson-label"
              label="Lesson"
              value={pickLessonId}
              onChange={(e) => setPickLessonId(e.target.value)}
            >
              {lessons.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.courseTitle} — {l.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setPickOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<CloudUploadOutlined />} onClick={confirmLessonAndPickFile}>
            Choose file
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selected)} onClose={() => (!uploading ? setSelected(null) : null)} fullWidth maxWidth="sm">
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Course:</strong> {selected.courseTitle}
              </Typography>
              <Typography variant="body2">
                <strong>Module:</strong> {selected.moduleTitle}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {lessonStatus(selected)}
              </Typography>
              {selected.muxPlaybackId && (
                <Typography variant="body2">
                  <strong>Playback ID:</strong> {selected.muxPlaybackId}
                </Typography>
              )}
              {selected.videoUrl && (
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  <strong>Stream:</strong> {selected.videoUrl}
                </Typography>
              )}
              {selected.description && (
                <Typography variant="body2" color="text.secondary">
                  {selected.description}
                </Typography>
              )}
              {uploading && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Uploading… {progress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setSelected(null)} disabled={uploading}>
            Close
          </Button>
          {selected && (
            <Button variant="contained" startIcon={<CloudUploadOutlined />} onClick={handlePickFile} disabled={uploading}>
              {lessonStatus(selected) === 'ready' ? 'Replace video' : 'Upload'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
