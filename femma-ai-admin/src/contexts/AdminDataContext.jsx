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
  markLessonMediaUploaded,
  uploadLessonVideo,
  syncProcessingLessonVideos,
  syncLessonVideoStatus
} from 'api/content';
import { flattenLessons } from 'data/content';
import { SEED_USERS, LEVEL_NAMES } from 'data/users';
import { SEED_PLANS, SEED_SUBSCRIPTIONS } from 'data/subscriptions';
import { SEED_NOTIFICATIONS, SEED_SETTINGS, SEED_ANALYTICS } from 'data/notifications';

const STORAGE_KEY = 'fema-ai-admin-local-v2';

const defaultLocalState = {
  users: SEED_USERS,
  plans: SEED_PLANS,
  subscriptions: SEED_SUBSCRIPTIONS,
  notifications: SEED_NOTIFICATIONS,
  settings: SEED_SETTINGS
};

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultLocalState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultLocalState),
      ...parsed,
      settings: { ...SEED_SETTINGS, ...(parsed.settings || {}) }
    };
  } catch {
    return structuredClone(defaultLocalState);
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const [localState, setLocalState] = useState(() => loadLocalState());
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
  }, [localState]);

  const refreshCatalog = useCallback(async () => {
    try {
      await syncProcessingLessonVideos();
    } catch {
      // Mux sync is best-effort; catalog still loads if sync fails
    }
    const catalog = await fetchCatalog();
    setCategories(catalog.categories);
    setCourses(catalog.courses);
    setContentError(null);
    return catalog;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setContentLoading(true);
        try {
          await syncProcessingLessonVideos();
        } catch {
          // ignore initial sync errors
        }
        const catalog = await fetchCatalog();
        if (!mounted) return;
        setCategories(catalog.categories);
        setCourses(catalog.courses);
        setContentError(null);
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
  }, []);

  const updateLocal = useCallback((updater) => {
    setLocalState((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
  }, []);

  const resetData = useCallback(() => {
    const fresh = structuredClone(defaultLocalState);
    setLocalState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    refreshCatalog().catch(() => {});
  }, [refreshCatalog]);

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
      prev.map((course) =>
        course.id === courseId ? { ...course, modules: course.modules.filter((m) => m.id !== moduleId) } : course
      )
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

  const markLessonUploaded = useCallback(async (lessonId) => {
    const saved = await markLessonMediaUploaded(lessonId);
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

  // Users (local for now)
  const saveUser = useCallback(
    (payload) => {
      updateLocal((prev) => {
        const exists = prev.users.some((u) => u.id === payload.id);
        const plan = prev.plans.find((p) => p.id === payload.planId);
        const nextUser = {
          ...payload,
          planName: plan?.name || payload.planName || 'Free',
          id: payload.id || uid('user')
        };
        const users = exists ? prev.users.map((u) => (u.id === payload.id ? { ...u, ...nextUser } : u)) : [...prev.users, nextUser];

        let subscriptions = prev.subscriptions;
        if (payload.planId) {
          const subExists = subscriptions.some((s) => s.userId === nextUser.id);
          if (subExists) {
            subscriptions = subscriptions.map((s) =>
              s.userId === nextUser.id
                ? { ...s, planId: payload.planId, status: payload.status === 'suspended' ? s.status : s.status || 'active' }
                : s
            );
          } else {
            subscriptions = [
              ...subscriptions,
              {
                id: uid('sub'),
                userId: nextUser.id,
                planId: payload.planId,
                status: 'active',
                renewDate: payload.planId === 'premium' ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : null,
                startedAt: new Date().toISOString().slice(0, 10)
              }
            ];
          }
        }

        return { ...prev, users, subscriptions };
      });
    },
    [updateLocal]
  );

  const setUserStatus = useCallback(
    (userId, status) => {
      updateLocal((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, status } : u))
      }));
    },
    [updateLocal]
  );

  const assignPlan = useCallback(
    (userId, planId, status = 'active') => {
      updateLocal((prev) => {
        const plan = prev.plans.find((p) => p.id === planId);
        const users = prev.users.map((u) => (u.id === userId ? { ...u, planId, planName: plan?.name || u.planName } : u));
        const exists = prev.subscriptions.some((s) => s.userId === userId);
        const subscriptions = exists
          ? prev.subscriptions.map((s) =>
              s.userId === userId
                ? {
                    ...s,
                    planId,
                    status,
                    renewDate: planId === 'premium' ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : null
                  }
                : s
            )
          : [
              ...prev.subscriptions,
              {
                id: uid('sub'),
                userId,
                planId,
                status,
                renewDate: planId === 'premium' ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : null,
                startedAt: new Date().toISOString().slice(0, 10)
              }
            ];
        return { ...prev, users, subscriptions };
      });
    },
    [updateLocal]
  );

  const updatePremiumPrice = useCallback(
    (priceMonthly) => {
      const amount = Number(priceMonthly);
      if (Number.isNaN(amount) || amount < 0) return false;
      const label = amount === 0 ? '$0/mo' : `$${amount.toFixed(2).replace(/\.00$/, '')}/mo`;
      updateLocal((prev) => ({
        ...prev,
        plans: prev.plans.map((plan) => (plan.id === 'premium' ? { ...plan, priceMonthly: amount, priceLabel: label } : plan))
      }));
      return true;
    },
    [updateLocal]
  );

  const saveNotification = useCallback(
    (payload) => {
      updateLocal((prev) => {
        const exists = prev.notifications.some((n) => n.id === payload.id);
        const next = {
          status: 'draft',
          createdAt: new Date().toISOString(),
          sentAt: null,
          ...payload,
          id: payload.id || uid('notif')
        };
        const notifications = exists
          ? prev.notifications.map((n) => (n.id === payload.id ? { ...n, ...next } : n))
          : [next, ...prev.notifications];
        return { ...prev, notifications };
      });
    },
    [updateLocal]
  );

  const sendNotification = useCallback(
    (id) => {
      updateLocal((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, status: 'sent', sentAt: new Date().toISOString() } : n))
      }));
    },
    [updateLocal]
  );

  const saveSettings = useCallback(
    (partial) => {
      updateLocal((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...partial,
          featureFlags: { ...prev.settings.featureFlags, ...(partial.featureFlags || {}) }
        }
      }));
    },
    [updateLocal]
  );

  const lessons = useMemo(() => flattenLessons(courses), [courses]);

  const stats = useMemo(() => {
    const activeUsers = localState.users.filter((u) => u.status === 'active').length;
    const premiumUsers = localState.users.filter((u) => u.planId === 'premium' && u.status === 'active').length;
    const publishedCourses = courses.filter((c) => c.status === 'published').length;
    const awaitingUpload = lessons.filter((l) => !l.videoUrl).length;
    return { activeUsers, premiumUsers, publishedCourses, awaitingUpload, totalLessons: lessons.length };
  }, [localState.users, courses, lessons]);

  const value = useMemo(
    () => ({
      ...localState,
      categories,
      courses,
      contentLoading,
      contentError,
      refreshCatalog,
      lessons,
      stats,
      analytics: SEED_ANALYTICS,
      levelNames: LEVEL_NAMES,
      saveCategory,
      deleteCategory,
      saveCourse,
      deleteCourse,
      saveModule,
      deleteModule,
      saveLesson,
      deleteLesson,
      markLessonUploaded,
      uploadLessonMedia,
      saveUser,
      setUserStatus,
      assignPlan,
      updatePremiumPrice,
      saveNotification,
      sendNotification,
      saveSettings,
      resetData
    }),
    [
      localState,
      categories,
      courses,
      contentLoading,
      contentError,
      refreshCatalog,
      lessons,
      stats,
      saveCategory,
      deleteCategory,
      saveCourse,
      deleteCourse,
      saveModule,
      deleteModule,
      saveLesson,
      deleteLesson,
      markLessonUploaded,
      uploadLessonMedia,
      saveUser,
      setUserStatus,
      assignPlan,
      updatePremiumPrice,
      saveNotification,
      sendNotification,
      saveSettings,
      resetData
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
