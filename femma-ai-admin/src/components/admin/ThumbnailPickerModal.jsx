import { useState, useEffect } from 'react';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// assets
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';
import FieldTimeOutlined from '@ant-design/icons/FieldTimeOutlined';
import LinkOutlined from '@ant-design/icons/LinkOutlined';
import PictureOutlined from '@ant-design/icons/PictureOutlined';

export default function ThumbnailPickerModal({ open, lesson, onClose, onSaveUrl, onUploadFile }) {
  const [tab, setTab] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(15);
  const [debouncedTime, setDebouncedTime] = useState(15);
  const [imgLoading, setImgLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const muxPlaybackId = lesson?.muxPlaybackId;
  const currentThumbnail = lesson?.thumbnailUrl;
  const maxDuration = Math.max(30, (lesson?.durationMinutes || 1) * 60);

  useEffect(() => {
    if (open) {
      setError('');
      setSaving(false);
      setCustomUrl(currentThumbnail || '');
      setTimeSeconds(15);
      setDebouncedTime(15);
      setTab(muxPlaybackId ? 0 : 1);
    }
  }, [open, lesson, muxPlaybackId, currentThumbnail]);

  // Debounce time slider changes to prevent spamming image requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTime(timeSeconds);
    }, 200);
    return () => clearTimeout(timer);
  }, [timeSeconds]);

  useEffect(() => {
    if (muxPlaybackId) {
      setImgLoading(true);
    }
  }, [debouncedTime, muxPlaybackId]);

  const timestampUrl = muxPlaybackId
    ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=${debouncedTime}&width=600`
    : '';

  const handleApplyTimestamp = async () => {
    if (!timestampUrl) return;
    try {
      setSaving(true);
      setError('');
      await onSaveUrl(lesson.id, timestampUrl);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update thumbnail');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customUrl.trim()) return;
    try {
      setSaving(true);
      setError('');
      await onSaveUrl(lesson.id, customUrl.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update thumbnail');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      setError('');
      await onUploadFile(lesson.id, file);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload thumbnail image');
    } finally {
      setSaving(false);
    }
  };

  if (!lesson) return null;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <PictureOutlined style={{ fontSize: 20 }} />
          <Typography variant="h5">Lesson Thumbnail — {lesson.title}</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Current Thumbnail Preview */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Current Active Thumbnail:
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 160,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.neutral',
                backgroundImage: currentThumbnail ? `url(${currentThumbnail})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {!currentThumbnail && (
                <Stack alignItems="center" spacing={0.5}>
                  <PictureOutlined style={{ fontSize: 32, opacity: 0.4 }} />
                  <Typography variant="caption" color="text.secondary">
                    No thumbnail set yet
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, val) => setTab(val)} variant="fullWidth">
            {muxPlaybackId && <Tab icon={<FieldTimeOutlined />} label="Pick Frame (Time)" iconPosition="start" />}
            <Tab icon={<CloudUploadOutlined />} label="Upload Image" iconPosition="start" />
            <Tab icon={<LinkOutlined />} label="Image URL" iconPosition="start" />
          </Tabs>

          {/* TAB 0: Pick Timestamp from Mux Video */}
          {muxPlaybackId && tab === 0 && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Select a video frame timestamp (e.g. 15s) to auto-extract the thumbnail:
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center">
                <Slider
                  value={timeSeconds}
                  min={0}
                  max={maxDuration}
                  step={1}
                  onChange={(_, val) => setTimeSeconds(val)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(val) => `${val}s`}
                />
                <TextField
                  label="Time (sec)"
                  type="number"
                  size="small"
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(Math.max(0, Number(e.target.value) || 0))}
                  sx={{ width: 110 }}
                />
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Preview at {timeSeconds}s frame:
                </Typography>
                <Box
                  sx={{
                    position: 'relative',
                    height: 160,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'primary.light',
                    overflow: 'hidden',
                    bgcolor: '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {imgLoading && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        backdropFilter: 'blur(1px)'
                      }}
                    >
                      <CircularProgress size={28} sx={{ color: '#fff' }} />
                    </Box>
                  )}
                  {timestampUrl ? (
                    <img
                      src={timestampUrl}
                      alt={`Frame preview at ${debouncedTime}s`}
                      onLoad={() => setImgLoading(false)}
                      onError={() => setImgLoading(false)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No playback ID found for frame extraction
                    </Typography>
                  )}
                </Box>
              </Box>

              <Button
                variant="contained"
                color="primary"
                onClick={handleApplyTimestamp}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : <FieldTimeOutlined />}
              >
                {saving ? 'Saving...' : `Use ${timeSeconds}s Frame as Thumbnail`}
              </Button>
            </Stack>
          )}

          {/* TAB 1: Upload Image File */}
          {((muxPlaybackId && tab === 1) || (!muxPlaybackId && tab === 0)) && (
            <Stack spacing={2} sx={{ pt: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Upload a custom JPG, PNG, or WebP image file for this lesson thumbnail:
              </Typography>

              <Button variant="contained" component="label" startIcon={<CloudUploadOutlined />} disabled={saving}>
                {saving ? 'Uploading...' : 'Choose Image File'}
                <input type="file" accept="image/*" hidden onChange={handleFileChange} />
              </Button>
            </Stack>
          )}

          {/* TAB 2: Image URL */}
          {((muxPlaybackId && tab === 2) || (!muxPlaybackId && tab === 1)) && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Thumbnail Image URL"
                placeholder="https://example.com/image.jpg"
                fullWidth
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <Button variant="contained" onClick={handleApplyCustomUrl} disabled={saving || !customUrl.trim()}>
                Save Image URL
              </Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
