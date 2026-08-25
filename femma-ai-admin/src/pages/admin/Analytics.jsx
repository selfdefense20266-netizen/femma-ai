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
      <PageHeader
        title="Analytics"
        subtitle="Engagement signals from the Fema AI member base — completions, streaks, and premium conversion."
      />

      <Grid container spacing={2.75}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce title="Weekly completions" count={String(analytics.weeklyCompletions.reduce((a, b) => a + b, 0))} percentage={9.3} extra="lessons" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce title="Premium conversion" count={`${analytics.premiumConversion}%`} percentage={3.1} color="primary" extra="of actives" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce title="Avg streak" count={`${avgStreak}d`} percentage={5.4} color="info" extra="across members" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticEcommerce title="Library size" count={String(stats.totalLessons)} percentage={1.2} color="success" extra="lessons" />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <MainCard title="Completions by category">
            <BarChart
              height={320}
              hideLegend
              series={[{ data: analytics.completionsByCategory.map((c) => c.value), label: 'Completions' }]}
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
              Fitness drives the majority of lesson completions, while Safety remains a strong secondary pillar. Premium conversion sits at{' '}
              {analytics.premiumConversion}% of active members. Use Media Library to clear awaiting uploads and Courses to publish draft
              Pregnancy / Nutrition paths when ready.
            </Typography>
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
}
