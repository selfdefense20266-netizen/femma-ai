import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import StatusChip from 'components/admin/StatusChip';
import Loader from 'components/Loader';
import { useAdminData } from 'contexts/AdminDataContext';

// assets
import DownOutlined from '@ant-design/icons/DownOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';

const emptyLessonForm = {
  id: '',
  title: '',
  durationMinutes: null,
  description: '',
  videoStatus: 'awaiting'
};

function lessonMediaStatus(lesson) {
  if (lesson?.videoStatus) return lesson.videoStatus;
  return lesson?.videoUrl || lesson?.muxPlaybackId ? 'ready' : 'awaiting';
}

export default function ModulesLessons() {
  const navigate = useNavigate();
  const { courses, saveModule, deleteModule, saveLesson, deleteLesson, contentLoading, contentError } = useAdminData();
  const [courseId, setCourseId] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingModule, setSavingModule] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [moduleDialog, setModuleDialog] = useState({ open: false, form: { id: '', title: '', description: '' } });
  const [lessonDialog, setLessonDialog] = useState({
    open: false,
    moduleId: '',
    form: emptyLessonForm
  });

  useEffect(() => {
    if (!courses.length) {
      setCourseId('');
      return;
    }
    if (!courseId || !courses.some((c) => c.id === courseId)) {
      setCourseId(courses[0].id);
    }
  }, [courses, courseId]);

  const course = useMemo(() => courses.find((c) => c.id === courseId) || courses[0], [courses, courseId]);

  const openModule = (module = null) => {
    setModuleDialog({
      open: true,
      form: module
        ? { id: module.id, title: module.title, description: module.description || '' }
        : { id: '', title: '', description: '' }
    });
  };

  const saveModuleForm = async () => {
    if (!course || !moduleDialog.form.title.trim() || savingModule) return;
    try {
      setSavingModule(true);
      setActionError('');
      await saveModule(course.id, moduleDialog.form);
      setModuleDialog({ open: false, form: { id: '', title: '', description: '' } });
    } catch (err) {
      setActionError(err.message || 'Failed to save module');
    } finally {
      setSavingModule(false);
    }
  };

  const openLesson = (moduleId, lesson = null) => {
    setLessonDialog({
      open: true,
      moduleId,
      form: lesson
        ? {
            id: lesson.id,
            title: lesson.title,
            durationMinutes: lesson.durationMinutes ?? null,
            description: lesson.description || '',
            videoStatus: lessonMediaStatus(lesson)
          }
        : { ...emptyLessonForm }
    });
  };

  const saveLessonForm = async () => {
    if (!course || !lessonDialog.moduleId || !lessonDialog.form.title.trim() || savingLesson) return;
    try {
      setSavingLesson(true);
      setActionError('');
      await saveLesson(course.id, lessonDialog.moduleId, {
        id: lessonDialog.form.id || undefined,
        title: lessonDialog.form.title.trim(),
        description: lessonDialog.form.description.trim()
      });
      setLessonDialog({ open: false, moduleId: '', form: emptyLessonForm });
    } catch (err) {
      setActionError(err.message || 'Failed to save lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  if (contentLoading) return <Loader />;

  if (!course) {
    return (
      <MainCard>
        <Typography>No courses available. Create a course first.</Typography>
      </MainCard>
    );
  }

  const isEditingLesson = Boolean(lessonDialog.form.id);
  const lessonNeedsVideo = lessonDialog.form.videoStatus === 'awaiting';

  return (
    <>
      <PageHeader
        title="Modules & Lessons"
        subtitle="Build curriculum here. Attach video for each lesson in Media Library."
        actionLabel="Add module"
        actionIcon={<PlusOutlined />}
        onAction={() => openModule()}
        secondaryAction={
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="course-select-label">Course</InputLabel>
            <Select
              labelId="course-select-label"
              label="Course"
              value={course.id}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      {(contentError || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError || contentError}
        </Alert>
      )}

      <MainCard title={`${course.title} curriculum`}>
        <Stack spacing={1.5}>
          {(course.modules || []).map((module) => (
            <Accordion key={module.id} defaultExpanded disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<DownOutlined />}>
                <Stack direction="row" sx={{ width: '100%', pr: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1">{module.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {module.lessons?.length || 0} lessons
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" color="primary" onClick={() => openModule(module)}>
                      <EditOutlined />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={async () => {
                        try {
                          setActionError('');
                          await deleteModule(course.id, module.id);
                        } catch (err) {
                          setActionError(err.message || 'Failed to delete module');
                        }
                      }}
                    >
                      <DeleteOutlined />
                    </IconButton>
                    <Button size="small" startIcon={<PlusOutlined />} onClick={() => openLesson(module.id)}>
                      Add lesson
                    </Button>
                  </Stack>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lesson</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Video</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(module.lessons || []).map((lesson) => {
                      const status = lessonMediaStatus(lesson);
                      return (
                        <TableRow key={lesson.id} hover>
                          <TableCell>
                            <Typography variant="body2">{lesson.title}</Typography>
                            {lesson.description && (
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 280 }}>
                                {lesson.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {lessonMediaStatus(lesson) === 'ready' || lesson.muxPlaybackId || lesson.videoUrl
                              ? `${lesson.durationMinutes} min`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <StatusChip status={status} />
                          </TableCell>
                          <TableCell align="right">
                            {status === 'awaiting' && (
                              <IconButton size="small" color="primary" title="Upload video" onClick={() => navigate('/content/media')}>
                                <CloudUploadOutlined />
                              </IconButton>
                            )}
                            <IconButton size="small" color="primary" onClick={() => openLesson(module.id, lesson)}>
                              <EditOutlined />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                try {
                                  setActionError('');
                                  await deleteLesson(course.id, module.id, lesson.id);
                                } catch (err) {
                                  setActionError(err.message || 'Failed to delete lesson');
                                }
                              }}
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(module.lessons || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary">
                            No lessons yet. Click Add lesson to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          ))}
          {(course.modules || []).length === 0 && (
            <Typography color="text.secondary">No modules yet. Add the first module for this course.</Typography>
          )}
        </Stack>
      </MainCard>

      <Dialog open={moduleDialog.open} onClose={() => setModuleDialog((s) => ({ ...s, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{moduleDialog.form.id ? 'Edit module' : 'Add module'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={moduleDialog.form.title}
              onChange={(e) => setModuleDialog((s) => ({ ...s, form: { ...s.form, title: e.target.value } }))}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={moduleDialog.form.description}
              onChange={(e) => setModuleDialog((s) => ({ ...s, form: { ...s.form, description: e.target.value } }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setModuleDialog((s) => ({ ...s, open: false }))}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveModuleForm} disabled={savingModule}>
            {savingModule ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={lessonDialog.open} onClose={() => !savingLesson && setLessonDialog((s) => ({ ...s, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{isEditingLesson ? 'Edit lesson' : 'Add lesson'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Lesson title"
              fullWidth
              required
              placeholder="e.g. Introduction to stance work"
              value={lessonDialog.form.title}
              onChange={(e) => setLessonDialog((s) => ({ ...s, form: { ...s.form, title: e.target.value } }))}
            />
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2">Estimated duration</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isEditingLesson && (lessonDialog.form.videoStatus === 'ready' || lessonDialog.form.durationMinutes)
                  ? `Auto-calculated from video · ${lessonDialog.form.durationMinutes || 1} min`
                  : 'Filled automatically when you upload the lesson video in Media Library.'}
              </Typography>
            </Box>
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              placeholder="What the member will learn in this lesson"
              value={lessonDialog.form.description}
              onChange={(e) => setLessonDialog((s) => ({ ...s, form: { ...s.form, description: e.target.value } }))}
            />

            {isEditingLesson && (
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Video</Typography>
                  <StatusChip status={lessonDialog.form.videoStatus} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {lessonNeedsVideo
                    ? 'No video attached yet. Upload the lesson video from Media Library.'
                    : 'Video is managed through Mux. Upload a replacement from Media Library if needed.'}
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 1.5 }}
                  startIcon={<CloudUploadOutlined />}
                  onClick={() => {
                    setLessonDialog((s) => ({ ...s, open: false }));
                    navigate('/content/media');
                  }}
                >
                  {lessonNeedsVideo ? 'Go to Media Library' : 'Manage video'}
                </Button>
              </Box>
            )}

            {!isEditingLesson && (
              <Alert severity="info" icon={false}>
                Save this lesson first, then upload its video in <strong>Media Library</strong>.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setLessonDialog((s) => ({ ...s, open: false }))} disabled={savingLesson}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveLessonForm} disabled={savingLesson || !lessonDialog.form.title.trim()}>
            {savingLesson ? 'Saving…' : isEditingLesson ? 'Save changes' : 'Create lesson'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
