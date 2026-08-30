import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FEATURE_COURSE_IDS = new Set([
  "dn-meal-scanner",
  "dn-ai-meal-planner",
  "dn-saved-meals",
  "dn-grocery-planner",
  "dn-recipes",
]);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveOpenAiKey(adminClient: ReturnType<typeof createClient>) {
  const fromEnv = Deno.env.get("OPENAI_API_KEY");
  if (fromEnv) return fromEnv;
  const { data } = await adminClient.from("app_secrets").select("value").eq("id", "openai_api_key").maybeSingle();
  return data?.value || null;
}

type CatalogCourse = {
  id: string;
  title: string;
  category_id: string;
  level: string;
  lessons: { id: string; title: string; minutes: number }[];
};

async function loadCatalog(adminClient: ReturnType<typeof createClient>): Promise<CatalogCourse[]> {
  const [coursesRes, modulesRes, lessonsRes] = await Promise.all([
    adminClient.from("courses").select("id,title,category_id,level,status").eq("status", "published"),
    adminClient.from("modules").select("id,course_id,sort_order"),
    adminClient.from("lessons").select("id,title,duration_minutes,module_id,sort_order"),
  ]);

  const modules = (modulesRes.data || []) as Array<{ id: string; course_id: string; sort_order: number }>;
  const lessons = (lessonsRes.data || []) as Array<{
    id: string;
    title: string;
    duration_minutes: number | null;
    module_id: string;
    sort_order: number;
  }>;
  const moduleById = new Map(modules.map((row) => [row.id, row]));

  const byCourse = new Map<string, { id: string; title: string; minutes: number; order: number }[]>();
  for (const lesson of lessons) {
    const mod = moduleById.get(lesson.module_id);
    if (!mod) continue;
    const list = byCourse.get(mod.course_id) || [];
    list.push({
      id: lesson.id,
      title: lesson.title,
      minutes: lesson.duration_minutes || 15,
      order: (mod.sort_order || 0) * 1000 + (lesson.sort_order || 0),
    });
    byCourse.set(mod.course_id, list);
  }

  return ((coursesRes.data || []) as Array<{ id: string; title: string; category_id: string; level: string }>)
    .filter((course) => !FEATURE_COURSE_IDS.has(course.id))
    .map((course) => ({
      id: course.id,
      title: course.title,
      category_id: course.category_id,
      level: course.level || "All levels",
      lessons: (byCourse.get(course.id) || [])
        .sort((a, b) => a.order - b.order)
        .slice(0, 6)
        .map(({ id, title, minutes }) => ({ id, title, minutes })),
    }))
    .filter((course) => course.lessons.length > 0)
    .slice(0, 16);
}

function padTasks(tasks: Array<Record<string, unknown>>, day: number) {
  const extras = [
    { title: "Drink 2L of water", category: "nutrition", duration: 2 },
    { title: "5 min breathwork", category: "yoga", duration: 5 },
    { title: "10 min walk", category: "fitness", duration: 10 },
    { title: "Log how you feel", category: "nutrition", duration: 3 },
    { title: "Evening stretch", category: "yoga", duration: 8 },
  ];
  const next = [...tasks];
  let i = 0;
  while (next.length < 5) {
    const extra = extras[i % extras.length];
    next.push({ ...extra, title: extra.title, id: `pad-${day}-${i}` });
    i += 1;
  }
  return next.slice(0, 8);
}

function assignLessons(
  days: Array<{ day: number; week: number; weekday: string; tasks: Array<Record<string, unknown>> }>,
  watchCourses: Array<{ id?: string; start_week?: number }>,
  catalog: CatalogCourse[],
) {
  const byId = new Map(catalog.map((course) => [course.id, course]));
  const queues = new Map<string, { id: string; title: string; minutes: number }[]>();
  const startWeek = new Map<string, number>();

  const enqueue = (courseId: string, week = 1) => {
    if (!courseId || queues.has(courseId)) return;
    const course = byId.get(courseId);
    if (!course) return;
    queues.set(courseId, [...course.lessons]);
    startWeek.set(courseId, Math.max(1, week));
  };

  for (const item of watchCourses) enqueue(String(item.id || ""), Number(item.start_week) || 1);
  for (const day of days) {
    for (const task of day.tasks) enqueue(String(task.course_id || ""));
  }

  for (const day of days) {
    for (const task of day.tasks) {
      const courseId = String(task.course_id || "");
      const queue = queues.get(courseId);
      if (!queue) continue;
      const lessonId = String(task.lesson_id || "");
      if (lessonId) {
        const idx = queue.findIndex((lesson) => lesson.id === lessonId);
        if (idx >= 0) queue.splice(idx, 1);
        continue;
      }
      if (!queue.length) continue;
      const lesson = queue.shift()!;
      task.lesson_id = lesson.id;
      task.duration = Number(task.duration) || lesson.minutes;
      if (!String(task.title || "").trim()) task.title = `Watch: ${lesson.title}`;
    }

    const hasWatch = day.tasks.some((task) => task.lesson_id || task.course_id);
    if (!hasWatch) {
      for (const [courseId, queue] of queues) {
        if (!queue.length) continue;
        if (day.week < (startWeek.get(courseId) || 1)) continue;
        const lesson = queue.shift()!;
        day.tasks.unshift({
          title: `Watch: ${lesson.title}`,
          category: "fitness",
          duration: lesson.minutes,
          course_id: courseId,
          lesson_id: lesson.id,
        });
        break;
      }
    }

    day.tasks = padTasks(day.tasks, day.day);
  }
}

function flattenPlan(parsed: Record<string, unknown>, requestedWeeks: number, catalog: CatalogCourse[]) {
  const weekObj = parsed.week && typeof parsed.week === "object" ? [parsed.week] : [];
  const weeksRaw = Array.isArray(parsed.weeks) && parsed.weeks.length ? parsed.weeks : weekObj;
  const daysRaw = Array.isArray(parsed.days) ? parsed.days : [];
  let durationWeeks = Math.max(requestedWeeks, Number(parsed.duration_weeks) || requestedWeeks);
  durationWeeks = Math.min(16, Math.max(4, durationWeeks));
  const totalDays = durationWeeks * 7;

  type DayOut = { day: number; weekday: string; week: number; tasks: Array<Record<string, unknown>> };
  const days: DayOut[] = [];

  if (weeksRaw.length) {
    for (let w = 0; w < durationWeeks; w += 1) {
      const week = (weeksRaw[w] || weeksRaw[weeksRaw.length - 1] || {}) as { days?: unknown[] };
      const weekDays = Array.isArray(week.days) ? week.days : [];
      for (let d = 0; d < 7; d += 1) {
        const dayNum = w * 7 + d + 1;
        const row = (weekDays[d] || {}) as { weekday?: string; tasks?: unknown[] };
        const tasks = padTasks(Array.isArray(row.tasks) ? (row.tasks as Array<Record<string, unknown>>) : [], dayNum);
        days.push({
          day: dayNum,
          week: w + 1,
          weekday: WEEKDAYS[d],
          tasks,
        });
      }
    }
  } else if (daysRaw.length) {
    for (let i = 0; i < totalDays; i += 1) {
      const src = (daysRaw[i] || daysRaw[i % Math.max(daysRaw.length, 1)] || {}) as {
        weekday?: string;
        tasks?: unknown[];
      };
      const dayNum = i + 1;
      days.push({
        day: dayNum,
        week: Math.ceil(dayNum / 7),
        weekday: WEEKDAYS[i % 7],
        tasks: padTasks(Array.isArray(src.tasks) ? (src.tasks as Array<Record<string, unknown>>) : [], dayNum),
      });
    }
  }

  while (days.length < totalDays) {
    const i = days.length;
    const src = days[i % Math.max(7, 1)] || { tasks: [] };
    days.push({
      day: i + 1,
      week: Math.ceil((i + 1) / 7),
      weekday: WEEKDAYS[i % 7],
      tasks: padTasks((src.tasks as Array<Record<string, unknown>>) || [], i + 1),
    });
  }

  const watchCourses = Array.isArray(parsed.watch_courses)
    ? (parsed.watch_courses as Array<{ id?: string; title?: string; start_week?: number }>)
    : [];
  const chosen = watchCourses.filter((item) => item.id && catalog.some((course) => course.id === item.id));
  const fallback = chosen.length
    ? chosen
    : catalog.slice(0, 4).map((course, index) => ({ id: course.id, title: course.title, start_week: index + 1 }));
  const sliced = days.slice(0, totalDays);
  assignLessons(sliced, fallback, catalog);

  return {
    plan_name: String(parsed.plan_name || "Personalized Plan"),
    duration_weeks: durationWeeks,
    extended: durationWeeks > requestedWeeks,
    extend_reason: String(parsed.extend_reason || ""),
    watch_courses: fallback,
    days: sliced,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase env is not configured" }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const openAiKey = await resolveOpenAiKey(adminClient);
  if (!openAiKey) return json({ error: "OpenAI API key is not configured on the server" }, 500);

  let body: {
    goal?: string;
    durationWeeks?: number;
    fitnessLevel?: string;
    dailyTime?: string;
    foodPreference?: string;
    environment?: string;
    cyclePhase?: string;
    isPregnant?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const requestedWeeks = Math.min(12, Math.max(4, Number(body.durationWeeks) || 8));
  const catalog = await loadCatalog(adminClient);
  if (!catalog.length) return json({ error: "No published courses in the database" }, 400);

  const compactCatalog = catalog.map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category_id,
    level: course.level,
    lessons: course.lessons.map((lesson) => lesson.id),
  }));

  const prompt = `Fema AI coach. Build a compact training plan JSON.
Duration requested: ${requestedWeeks} weeks. You MAY extend if courses need more time. Never shorten.
Goals: ${body.goal || "general fitness"}
Level: ${body.fitnessLevel || "Beginner"}
Daily time: ${body.dailyTime || "20–30 min"}
Food: ${body.foodPreference || "Eat everything"}
Train at: ${body.environment || "Home"}
Cycle: ${body.isPregnant ? "pregnant" : body.cyclePhase || "not tracking"}

Catalog (use only these course ids):
${JSON.stringify(compactCatalog)}

Return ONE week template (Mon-Sun), 5 tasks per day. We expand it across the full duration and assign lessons in order.
Pick 2-5 courses to watch. Set start_week for each.

JSON shape:
{"plan_name":"","duration_weeks":${requestedWeeks},"extend_reason":"","watch_courses":[{"id":"","title":"","start_week":1}],"week":{"days":[{"weekday":"Mon","tasks":[{"title":"","category":"fitness|yoga|safety|nutrition|recipe","duration":20,"course_id":""}]}]}}`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      max_tokens: 2800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return compact JSON only. One week of 7 days. Five tasks per day. Course ids must come from the catalog." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const openaiJson = await openaiRes.json();
  if (!openaiRes.ok) {
    return json({ error: openaiJson?.error?.message || "OpenAI plan failed" }, 502);
  }

  const content = openaiJson.choices?.[0]?.message?.content || "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "Failed to parse OpenAI plan", raw: content }, 502);
  }

  const plan = flattenPlan(parsed, requestedWeeks, catalog);
  return json({ ok: true, plan, model: "gpt-4.1-mini" });
});
