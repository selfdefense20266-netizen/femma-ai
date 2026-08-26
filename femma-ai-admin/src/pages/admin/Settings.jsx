import { useEffect, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

// project imports
import MainCard from 'components/MainCard';
import PageHeader from 'components/admin/PageHeader';
import { useAdminData } from 'contexts/AdminDataContext';
import { useAuth } from 'contexts/AuthContext';

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

export default function Settings() {
  const { settings, saveSettings } = useAdminData();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (key) => {
    setForm((prev) => ({
      ...prev,
      featureFlags: { ...prev.featureFlags, [key]: !prev.featureFlags[key] }
    }));
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Branding, feature flags, and admin account preferences (saved to Supabase)." />

      <MainCard>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Branding" />
          <Tab label="Feature flags" />
          <Tab label="Admin account" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField label="App name" fullWidth value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} />
            <TextField label="Tagline" fullWidth value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            <TextField
              label="Primary color"
              fullWidth
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            />
            <Box sx={{ height: 48, borderRadius: 2, bgcolor: form.primaryColor, border: '1px solid', borderColor: 'divider' }} />
            <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ alignSelf: 'flex-start' }}>
              Save branding
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack spacing={1} sx={{ maxWidth: 420 }}>
            {Object.entries(form.featureFlags || {}).map(([key, enabled]) => (
              <FormControlLabel
                key={key}
                control={<Switch checked={Boolean(enabled)} onChange={() => toggleFlag(key)} color="primary" />}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              />
            ))}
            <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ alignSelf: 'flex-start', mt: 1 }}>
              Save flags
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <Typography variant="body2" color="text.secondary">
              Signed in as {user?.email || form.adminEmail}
            </Typography>
            <TextField
              label="Admin email"
              fullWidth
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            />
            <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ alignSelf: 'flex-start' }}>
              Save account
            </Button>
          </Stack>
        </TabPanel>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {saved && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Settings saved to Supabase.
          </Alert>
        )}
      </MainCard>
    </>
  );
}
