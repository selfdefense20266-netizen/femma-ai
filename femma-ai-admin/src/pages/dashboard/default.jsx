import { Link as RouterLink, useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { BarChart, axisClasses, barClasses } from '@mui/x-charts';

// project imports
import MainCard from 'components/MainCard';
import AnalyticEcommerce from 'components/cards/statistics/AnalyticEcommerce';
import PageHeader from 'components/admin/PageHeader';
import StatusChip from 'components/admin/StatusChip';
import { useAdminData } from 'contexts/AdminDataContext';

// ==============================|| DASHBOARD - Fema AI ||============================== //

export default function DashboardDefault() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { stats, users, lessons, analytics, courses } = useAdminData();

  const recentUsers = [...users].sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1)).slice(0, 5);
  const awaiting = lessons.filter((l) => !l.videoUrl).slice(0, 6);

  return (
    <Grid container rowSpacing={4.5} columnSpacing={2.75}>
      <Grid size={12}>
        <PageHeader
          title="Dashboard"
          subtitle="Fema AI overview — members, premium access, and content health."
          actionLabel="Open courses"
          onAction={() => navigate('/content/courses')}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticEcommerce title="Active members" count={String(stats.activeUsers)} extra={`${users.length} total`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticEcommerce
          title="Premium subscribers"
          count={String(stats.premiumUsers)}
          color="primary"
          extra={`${analytics.premiumConversion}% of actives`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticEcommerce
          title="Published courses"
          count={String(stats.publishedCourses)}
          color="info"
          extra={`${courses.length} total`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticEcommerce
          title="Lessons awaiting upload"
          count={String(stats.awaitingUpload)}
          isLoss
          color="warning"
          extra={`${stats.totalLessons} lessons`}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <MainCard title="New members (last 7 days)">
          <BarChart
            hideLegend
            height={300}
            series={[{ data: analytics.weeklySignups || analytics.weeklyCompletions, label: 'Signups' }]}
            xAxis={[{ data: analytics.weekLabels, scaleType: 'band', categoryGapRatio: 0.4 }]}
            margin={{ left: 30, right: 20, top: 20, bottom: 30 }}
            colors={[theme.vars.palette.primary.main]}
            slotProps={{ bar: { rx: 5, ry: 5 } }}
            sx={{
              [`& .${barClasses.element}:hover`]: { opacity: 0.7 },
              [`& .${axisClasses.root}`]: { stroke: theme.vars.palette.divider }
            }}
          />
        </MainCard>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <MainCard title="Recent signups" content={false}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{user.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={user.planId === 'premium' ? 'premium' : 'free'} />
                    </TableCell>
                    <TableCell>{user.joinedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 2 }}>
            <Button component={RouterLink} to="/users" size="small">
              View all users
            </Button>
          </Box>
        </MainCard>
      </Grid>

      <Grid size={12}>
        <MainCard title="Content awaiting video upload" content={false}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lesson</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Upload key</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {awaiting.map((lesson) => (
                  <TableRow key={lesson.id} hover>
                    <TableCell>{lesson.title}</TableCell>
                    <TableCell>{lesson.courseTitle}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{lesson.uploadKey}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status="awaiting" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" sx={{ p: 2 }}>
            <Button component={RouterLink} to="/content/media" size="small">
              Open media library
            </Button>
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}
