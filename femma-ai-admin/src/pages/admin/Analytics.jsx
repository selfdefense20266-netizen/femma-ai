// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { BarChart, PieChart } from '@mui/x-charts';

// project imports
import MainCard from 'components/MainCard';
import AnalyticEcommerce from 'components/cards/statistics/AnalyticEcommerce';
import PageHeader from 'components/admin/PageHeader';
import { useAdminData } from 'contexts/AdminDataContext';

export default function Analytics() {
  const theme = useTheme();
  const { analytics, stats, users } = useAdminData();

  const avgStreak = users.length ? Math.round(users.reduce((sum, u) => sum + u.streak, 0) / users.length) : 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Live engagement signals from Supabase members and the content library." />

      <Grid container spacing={2.75}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce
            title="Lessons completed (all time)"
            count={String(analytics.totalCompletedLessons || 0)}
            extra="from member profiles"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce
            title="Premium conversion"
            count={`${analytics.premiumConversion}%`}
            color="primary"
            extra="of active members"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce title="Avg streak" count={`${avgStreak}d`} color="info" extra="across members" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce title="Library size" count={String(stats.totalLessons)} color="success" extra="lessons" />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <MainCard title="Lessons by category">
            <BarChart
              height={320}
              hideLegend
              series={[{ data: analytics.completionsByCategory.map((c) => c.value), label: 'Lessons' }]}
              xAxis={[{ data: analytics.completionsByCategory.map((c) => c.label), scaleType: 'band', categoryGapRatio: 0.35 }]}
              margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
              colors={[theme.vars.palette.primary.main]}
              slotProps={{ bar: { rx: 5, ry: 5 } }}
            />
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <MainCard title="Streak distribution">
            <PieChart
              height={320}
              series={[
                {
                  data: analytics.streakBuckets.map((b, index) => ({
                    id: index,
                    value: b.value,
                    label: b.label
                  })),
                  innerRadius: 50,
                  paddingAngle: 2,
                  cornerRadius: 4
                }
              ]}
              colors={[
                theme.vars.palette.grey[400],
                theme.vars.palette.info.light,
                theme.vars.palette.primary.light,
                theme.vars.palette.primary.main,
                theme.vars.palette.primary.dark
              ]}
            />
          </MainCard>
        </Grid>

        <Grid size={12}>
          <MainCard>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Reading the numbers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Charts use live member and catalog data. Premium conversion is {analytics.premiumConversion}% of active members. Clear
              awaiting uploads in Media Library and publish draft courses when ready.
            </Typography>
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
}
