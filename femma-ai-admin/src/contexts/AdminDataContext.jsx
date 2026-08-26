import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  fetchCatalog,
  upsertCategory,
  removeCategory,
  upsertCourse,
  removeCourse,
  upsertModule,
  removeModule,
  upsertLesson,
  removeLesson,
  uploadLessonVideo,
  syncProcessingLessonVideos
} from 'api/content';
import { fetchMembersBundle, upsertMember, updateMemberStatus, assignMemberPlan, updatePlanPrice } from 'api/members';
import { fetchNotifications, upsertNotification, markNotificationSent } from 'api/notifications';
import { DEFAULT_SETTINGS, fetchSettings, saveAppSettings } from 'api/settings';
import { flattenLessons } from 'data/content';
import { LEVEL_NAMES } from 'data/users';

const AdminDataContext = createContext(null);

function buildAnalytics({ users, categories, courses }) {
  const now = new Date();
  const active = users.filter((u) => u.status === 'active');
  const premiumActive = active.filter((u) => u.planId === 'premium').length;
  const premiumConversion = active.length ? Math.round((premiumActive / active.length) * 100) : 0;

  const weekLabels = [];
  const weeklyCompletions = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    weekLabels.push(day.toLocaleDateString(undefined, { weekday: 'short' }));
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    weeklyCompletions.push(users.filter((u) => u.joinedAt === key).length);
  }

  const lessonsByCategory = Object.fromEntries(categories.map((c) => [c.id, 0]));
  courses.forEach((course) => {
    const count = (course.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
    if (lessonsByCategory[course.categoryId] !== undefined) {
      lessonsByCategory[course.categoryId] += count;
    }
  });

  const completionsByCategory = categories.map((c) => ({
    id: c.id,
    label: c.title,
    value: lessonsByCategory[c.id] || 0
  }));

  const streakBuckets = [
    { label: '0 days', value: 0 },
    { label: '1–3', value: 0 },
    { label: '4–7', value: 0 },
    { label: '8–14', value: 0 },
    { label: '15+', value: 0 }
  ];
  users.forEach((u) => {
    const s = Number(u.streak) || 0;
    if (s <= 0) streakBuckets[0].value += 1;
    else if (s <= 3) streakBuckets[1].value += 1;
    else if (s <= 7) streakBuckets[2].value += 1;
    else if (s <= 14) streakBuckets[3].value += 1;
    else streakBuckets[4].value += 1;
  });

  return {
    weekLabels,
    weeklyCompletions,
    weeklySignups: weeklyCompletions,
    completionsByCategory,
    streakBuckets,
    premiumConversion,
    totalCompletedLessons: users.reduce((sum, u) => sum + (Number(u.completedLessons) || 0), 0)
  };
}

export function AdminDataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [contentLoading, setContentLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [contentError, setContentError] = useState(null);
  const [membersError, setMembersError] = useState(null);

  const refreshCatalog = useCallback(async () => {
    try {
      await syncProcessingLessonVideos();
    } catch {
      // Mux sync is best-effort
    }
    const catalog = await fetchCatalog();
    setCategories(catalog.categories);
    setCourses(catalog.courses);
    setContentError(null);
    return catalog;
  }, []);

  const refreshMembers = useCallback(async () => {
    const bundle = await fetchMembersBundle();
    setPlans(bundle.plans);
    setUsers(bundle.users);
    setSubscriptions(bundle.subscriptions);
    setMembersError(null);
    return bundle;
  }, []);

  const refreshNotifications = useCallback(async () => {
    const rows = await fetchNotifications();
    setNotifications(rows);
    return rows;
  }, []);

  const refreshSettings = useCallback(async () => {
    const next = await fetchSettings();
    setSettings(next);
    return next;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setContentLoading(true);
        await refreshCatalog();
      } catch (err) {
        if (!mounted) return;
        setContentError(err.message || 'Failed to load catalog from Supabase');
        setCategories([]);
        setCourses([]);
      } finally {
        if (mounted) setContentLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshCatalog]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setMembersLoading(true);
        await Promise.all([refreshMembers(), refreshNotifications(), refreshSettings()]);
      } catch (err) {
        if (!mounted) return;
        setMembersError(err.message || 'Failed to load members data from Supabase');
      } finally {
        if (mounted) setMembersLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshMembers, refreshNotifications, refreshSettings]);

  // Categories
  const saveCategory = useCallback(async (payload) => {
    const saved = await upsertCategory(payload);
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
    });
    return saved;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await removeCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setCourses((prev) => prev.filter((c) => c.categoryId !== id));
  }, []);

  // Courses
  const saveCourse = useCallback(async (payload) => {
    const saved = await upsertCourse(payload);
    setCourses((prev) => {
      const existing = prev.find((c) => c.id === saved.id);
      const next = {
        ...saved,
        modules: existing?.modules || payload.modules || []
      };
      const exists = Boolean(existing);
      return exists ? prev.map((c) => (c.id === saved.id ? next : c)) : [...prev, next];
    });
    return saved;
  }, []);

  const deleteCourse = useCallback(async (id) => {
    await removeCourse(id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const saveModule = useCallback(async (courseId, modulePayload) => {
    const saved = await upsertModule(courseId, modulePayload);
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        const modules = [...(course.modules || [])];
        const idx = modules.findIndex((m) => m.id === saved.id);
        if (idx >= 0) {
          modules[idx] = { ...modules[idx], ...saved, lessons: modules[idx].lessons || [] };
        } else {
          modules.push({ ...saved, lessons: [] });
        }
        return { ...course, modules };
      })
    );
    return saved;
  }, []);

  const deleteModule = useCallback(async (courseId, moduleId) => {
    await removeModule(moduleId);
    setCourses((prev) =>
      prev.map((course) => (course.id === courseId ? { ...course, modules: course.modules.filter((m) => m.id !== moduleId) } : course))
    );
  }, []);

  const saveLesson = useCallback(async (courseId, moduleId, lessonPayload) => {
    const saved = await upsertLesson(courseId, moduleId, lessonPayload);
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          modules: course.modules.map((module) => {
            if (module.id !== moduleId) return module;
            const lessons = [...(module.lessons || [])];
            const idx = lessons.findIndex((l) => l.id === saved.id);
            if (idx >= 0) lessons[idx] = { ...lessons[idx], ...saved };
            else lessons.push(saved);
            return { ...module, lessons };
          })
        };
      })
    );
    return saved;
  }, []);

  const deleteLesson = useCallback(async (courseId, moduleId, lessonId) => {
    await removeLesson(lessonId);
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          modules: course.modules.map((module) =>
            module.id === moduleId ? { ...module, lessons: module.lessons.filter((l) => l.id !== lessonId) } : module
          )
        };
      })
    );
  }, []);

  const uploadLessonMedia = useCallback(async (lessonId, file, onProgress) => {
    const saved = await uploadLessonVideo(lessonId, file, onProgress);
    setCourses((prev) =>
      prev.map((course) => ({
        ...course,
        modules: course.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...saved } : lesson))
        }))
      }))
    );
    return saved;
  }, []);

  const saveUser = useCallback(
    async (payload) => {
      const saved = await upsertMember(payload, plans);
      setUsers((prev) => {
        const exists = prev.some((u) => u.id === saved.id);
        return exists ? prev.map((u) => (u.id === saved.id ? { ...u, ...saved } : u)) : [...prev, saved];
      });

      if (payload.planId) {
        const { subscription } = await assignMemberPlan(saved.id, payload.planId, 'active');
        setSubscriptions((prev) => {
          const exists = prev.some((s) => s.userId === saved.id);
          return exists ? prev.map((s) => (s.userId === saved.id ? subscription : s)) : [...prev, subscription];
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === saved.id
              ? { ...u, planId: payload.planId, planName: plans.find((p) => p.id === payload.planId)?.name || u.planName }
              : u
          )
        );
      }

      return saved;
    },
    [plans]
  );

  const setUserStatus = useCallback(async (userId, status) => {
    const saved = await updateMemberStatus(userId, status);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...saved, planName: u.planName } : u)));
    return saved;
  }, []);

  const assignPlan = useCallback(
    async (userId, planId, status = 'active') => {
      const { member, subscription } = await assignMemberPlan(userId, planId, status);
      const planName = plans.find((p) => p.id === planId)?.name || member.planName;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...member, planName } : u)));
      setSubscriptions((prev) => {
        const exists = prev.some((s) => s.userId === userId);
        return exists ? prev.map((s) => (s.userId === userId ? subscription : s)) : [...prev, subscription];
      });
      return { member, subscription };
    },
    [plans]
  );

  const updatePremiumPrice = useCallback(async (priceMonthly) => {
    const saved = await updatePlanPrice('premium', priceMonthly);
    setPlans((prev) => prev.map((plan) => (plan.id === 'premium' ? saved : plan)));
    return true;
  }, []);

  const saveNotification = useCallback(async (payload) => {
    const saved = await upsertNotification(payload);
    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === saved.id);
      return exists ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev];
    });
    return saved;
  }, []);

  const sendNotification = useCallback(async (id) => {
    const saved = await markNotificationSent(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? saved : n)));
    return saved;
  }, []);

  const saveSettings = useCallback(async (partial) => {
    const saved = await saveAppSettings(partial);
    setSettings(saved);
    return saved;
  }, []);

  const lessons = useMemo(() => flattenLessons(courses), [courses]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.status === 'active').length;
    const premiumUsers = users.filter((u) => u.planId === 'premium' && u.status === 'active').length;
    const publishedCourses = courses.filter((c) => c.status === 'published').length;
    const awaitingUpload = lessons.filter((l) => {
      const status = l.videoStatus || (l.videoUrl ? 'ready' : 'awaiting');
      return status !== 'ready';
    }).length;
    return { activeUsers, premiumUsers, publishedCourses, awaitingUpload, totalLessons: lessons.length };
  }, [users, courses, lessons]);

  const analytics = useMemo(() => buildAnalytics({ users, categories, courses }), [users, categories, courses]);

  const value = useMemo(
    () => ({
      users,
      plans,
      subscriptions,
      notifications,
      settings,
      categories,
      courses,
      contentLoading,
      membersLoading,
      contentError,
      membersError,
      refreshCatalog,
      refreshMembers,
      lessons,
      stats,
      analytics,
      levelNames: LEVEL_NAMES,
      saveCategory,
      deleteCategory,
      saveCourse,
      deleteCourse,
      saveModule,
      deleteModule,
      saveLesson,
      deleteLesson,
      uploadLessonMedia,
      saveUser,
      setUserStatus,
      assignPlan,
      updatePremiumPrice,
      saveNotification,
      sendNotification,
      saveSettings
    }),
    [
      users,
      plans,
      subscriptions,
      notifications,
      settings,
      categories,
      courses,
      contentLoading,
      membersLoading,
      contentError,
      membersError,
      refreshCatalog,
      refreshMembers,
      lessons,
      stats,
      analytics,
      saveCategory,
      deleteCategory,
      saveCourse,
      deleteCourse,
      saveModule,
      deleteModule,
      saveLesson,
      deleteLesson,
      uploadLessonMedia,
      saveUser,
      setUserStatus,
      assignPlan,
      updatePremiumPrice,
      saveNotification,
      sendNotification,
      saveSettings
    ]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

AdminDataProvider.propTypes = { children: PropTypes.node };

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}

export default AdminDataContext;
