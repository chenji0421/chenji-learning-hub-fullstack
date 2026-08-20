import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// 计划状态 → CSS 类（与 Admin 后台一致）：未开始灰 / 进行中蓝 / 部分完成紫 / 已完成绿 / 暂停橙
const STATUS_ORDER = ["未开始", "进行中", "部分完成", "已完成", "暂停"];
const STATUS_CLASS = {
  未开始: "todo",
  进行中: "pending",
  部分完成: "partial",
  已完成: "done",
  暂停: "paused",
};
// 后端状态值可能是中文也可能是英文，统一映射成中文显示（todo/doing/partial/done/paused 兼容）
const STATUS_LABEL = {
  未开始: "未开始",
  进行中: "进行中",
  部分完成: "部分完成",
  已完成: "已完成",
  暂停: "暂停",
  todo: "未开始",
  doing: "进行中",
  partially_completed: "部分完成",
  partial: "部分完成",
  done: "已完成",
  paused: "暂停",
};
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 状态兼容映射：显示用中文标签，样式用固定 class
const toStatusLabel = (s) => STATUS_LABEL[s] || s || "未开始";
const toStatusClass = (s) => STATUS_CLASS[toStatusLabel(s)] || "pending";

// 空字段统一显示「未填写」，避免布局塌陷
const slot = (v) => (v && v.trim() ? v : <span className="field-empty">未填写</span>);

// 计划详情统一展示（日期 / 标题 / 今日目标 / 上午 / 下午 / 晚上 / 今日复盘 / 状态）
function PlanDetail({ plan, showDate = true }) {
  return (
    <>
      <div className="plan-card-head">
        {showDate && <span className="plan-date">{plan.date}</span>}
        <span className={`status ${toStatusClass(plan.status)}`}>
          {toStatusLabel(plan.status)}
        </span>
      </div>
      <h3 className="plan-title">
        {plan.title ? plan.title : <span className="field-empty">未填写</span>}
      </h3>
      <p className="plan-goal">
        <b>今日目标：</b>
        {slot(plan.goal)}
      </p>
      <ul className="plan-slots">
        <li>
          <b>上午：</b>
          {slot(plan.morning)}
        </li>
        <li>
          <b>下午：</b>
          {slot(plan.afternoon)}
        </li>
        <li>
          <b>晚上：</b>
          {slot(plan.evening)}
        </li>
      </ul>
      <p className="plan-review">
        <b>今日复盘：</b>
        {slot(plan.review)}
      </p>
    </>
  );
}

const EMPTY_FORM = {
  date: "",
  title: "",
  goal: "",
  morning: "",
  afternoon: "",
  evening: "",
  review: "",
  status: "未开始",
};

const pad = (n) => String(n).padStart(2, "0");

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};
const nowMonth = () => todayStr().slice(0, 7);

// 阶段冲刺计划标签页：概览（公开计划三视图）+ 每日安排（按日期看）+ 完成度（真实 status 统计）+ 生活记录 + 暂未接入
// ⚠️ 只依赖后端已有的 /api/plans 数据；不调用 sprint 时间块 / 完成记录 / 睡眠记录接口
const SPRINT_TABS = [
  { key: "overview", label: "概览", sub: "月 / 列表 / 今日" },
  { key: "daily", label: "每日安排", sub: "按日期查看" },
  { key: "completion", label: "完成度", sub: "真实状态统计" },
  { key: "life", label: "生活记录", sub: "体重 / 运动 / 睡眠 / 饮食" },
  { key: "more", label: "暂未接入", sub: "课程 / 应用 / 记账" },
];

// 暂未接入的模块占位（不生成假数据、不放假表格、不放假记录）
const MORE_MODULES = [
  { key: "courses", icon: "📖", title: "课程" },
  { key: "apps", icon: "📱", title: "应用" },
  { key: "expenses", icon: "💰", title: "记账" },
];

// 体重记录表单默认值（不写死假体重，默认填今天的日期）
const WEIGHT_EMPTY_FORM = { date: todayStr(), weight: "", note: "", is_public: true };

// 运动记录表单选项与默认值（不写死假距离、假时长，默认填今天的日期）
const EXERCISE_TYPES = ["长跑", "力量", "拉伸", "其他"];
const EXERCISE_INTENSITIES = ["轻松", "中等", "较强", "其他"];
const EXERCISE_EMPTY_FORM = {
  date: todayStr(),
  exercise_type: "",
  distance_km: "",
  duration_min: "",
  intensity: "",
  note: "",
  is_public: true,
};

// 睡眠记录选项与默认值（不写死假睡眠时长，默认填今天的日期）
const SLEEP_QUALITIES = ["很好", "还行", "一般", "较差", "其他"];
const SLEEP_EMPTY_FORM = {
  date: todayStr(),
  sleep_time: "",
  wake_time: "",
  duration_hours: "",
  quality: "",
  note: "",
  is_public: true,
};

// 饮食记录选项与默认值（不写死假食物，默认填今天的日期）
const MEAL_TYPES = ["早餐", "午餐", "晚餐", "加餐", "其他"];
const DIET_EMPTY_FORM = {
  date: todayStr(),
  meal_type: "",
  content: "",
  note: "",
  is_public: true,
};

// 更新时间格式化：ISO 字符串 → "YYYY-MM-DD HH:mm"（本地时区），失败时原样返回
const formatTime = (t) => {
  if (!t) return "—";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 体重趋势折线图：只用真实记录画 SVG，不引入图表库、不写死假体重。
// 记录少于 2 条时显示空状态（少于 2 个点画不出趋势）。
function WeightTrendChart({ records }) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) {
    return (
      <div className="weight-chart-empty">
        记录数量不足，添加更多记录后会显示趋势。
      </div>
    );
  }
  const W = 600;
  const H = 200;
  const PAD = 26;
  const weights = sorted.map((r) => r.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const x = (i) => PAD + (i * (W - PAD * 2)) / (sorted.length - 1);
  const y = (w) => H - PAD - ((w - minW) / range) * (H - PAD * 2);
  const points = sorted.map((r, i) => `${x(i).toFixed(1)},${y(r.weight).toFixed(1)}`).join(" ");
  // 三条水平参考线：最高 / 中间 / 最低
  const gridLines = [maxW, minW + range / 2, minW].map((w) => ({
    w,
    yy: y(w),
    label: w.toFixed(1),
  }));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="weight-chart-svg"
      role="img"
      aria-label="体重变化趋势折线图"
    >
      {gridLines.map((g) => (
        <g key={g.label}>
          <line
            x1={PAD}
            y1={g.yy}
            x2={W - PAD}
            y2={g.yy}
            className="weight-chart-grid"
          />
          <text x={2} y={g.yy + 4} className="weight-chart-axis">
            {g.label}
          </text>
        </g>
      ))}
      <polyline points={points} className="weight-chart-line" fill="none" />
      {sorted.map((r, i) => (
        <circle key={r.id || i} cx={x(i)} cy={y(r.weight)} r="4" className="weight-chart-dot">
          <title>{`${r.date} · ${r.weight} kg`}</title>
        </circle>
      ))}
    </svg>
  );
}

// 运动距离柱状图：只用真实记录画，不引入图表库、不写死假距离。
// 取最近有距离的记录（最多 7 条），按日期从左到右排列；没有距离数据时显示空状态。
function ExerciseDistanceChart({ records }) {
  const sortedDesc = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const withDistance = sortedDesc.filter((r) => r.distance_km != null && r.distance_km > 0);
  if (withDistance.length === 0) {
    return (
      <div className="weight-chart-empty">
        还没有带距离的运动记录，添加更多运动记录后会显示柱状图。
      </div>
    );
  }
  const recent = withDistance.slice(0, 7).reverse(); // 最近 7 条，按日期升序展示
  const maxKm = Math.max(...recent.map((r) => r.distance_km)) || 1;
  return (
    <div className="exercise-chart">
      {recent.map((r) => {
        const h = Math.max(4, Math.round((r.distance_km / maxKm) * 100));
        return (
          <div key={r.id} className="exercise-chart-col" title={`${r.date} · ${r.distance_km} km`}>
            <span className="exercise-chart-val">{r.distance_km}</span>
            <div className="exercise-chart-track">
              <div className="exercise-chart-bar" style={{ height: `${h}%` }} />
            </div>
            <span className="exercise-chart-date">{r.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

// 睡眠时长柱状图：只用真实记录画，不引入图表库、不写死假睡眠时长。
// 取最近有睡眠时长的记录（最多 7 条），按日期从左到右排列；少于 2 条时长数据时显示空状态。
function SleepDurationChart({ records }) {
  const sortedDesc = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const withDuration = sortedDesc.filter(
    (r) => r.duration_hours != null && r.duration_hours > 0
  );
  if (withDuration.length < 2) {
    return (
      <div className="weight-chart-empty">
        记录数量不足，添加更多睡眠记录后会显示趋势。
      </div>
    );
  }
  const recent = withDuration.slice(0, 7).reverse(); // 最近 7 条，按日期升序展示
  const maxDur = Math.max(...recent.map((r) => r.duration_hours)) || 1;
  return (
    <div className="exercise-chart">
      {recent.map((r) => {
        const h = Math.max(4, Math.round((r.duration_hours / maxDur) * 100));
        return (
          <div key={r.id} className="exercise-chart-col" title={`${r.date} · ${r.duration_hours} 小时`}>
            <span className="exercise-chart-val">{r.duration_hours}</span>
            <div className="exercise-chart-track">
              <div className="exercise-chart-bar" style={{ height: `${h}%` }} />
            </div>
            <span className="exercise-chart-date">{r.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

// 说明：计划模型没有 category 字段，不做「假分类统计」——分类筛选已移除，
// 只保留真实的状态筛选与关键词搜索（数据全部来自后端数据库）。

// hash 子路径：#/plans 月视图（默认） · #/plans/list 列表 · #/plans/today 今日
// 深链：#/plans/day/YYYY-MM-DD · #/plans/month/YYYY-MM（兼容旧的 #/plans/YYYY-MM 与 #/plans/YYYY-MM-DD）
function parseHashPath(hashPath) {
  const seg = (hashPath || "plans").split("/").filter(Boolean);
  if (seg[0] !== "plans") return { view: "month" };
  const sub = seg[1];
  if (sub === "list") return { view: "list" };
  if (sub === "today") return { view: "today" };
  if (sub === "day" && /^\d{4}-\d{2}-\d{2}$/.test(seg[2] || "")) {
    return { view: "day", date: seg[2] };
  }
  if (sub === "month" && /^\d{4}-\d{2}$/.test(seg[2] || "")) {
    return { view: "month", monthKey: seg[2] };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(sub || "")) {
    return { view: "day", date: sub };
  }
  if (/^\d{4}-\d{2}$/.test(sub || "")) {
    return { view: "month", monthKey: sub };
  }
  return { view: "month" };
}

export default function Plans({ user, hashPath }) {
  const location = useMemo(() => parseHashPath(hashPath), [hashPath]);
  const [sprintTab, setSprintTab] = useState("overview"); // 阶段冲刺计划标签页
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  const [monthKey, setMonthKey] = useState(nowMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [editing, setEditing] = useState(false);
  const [editingDate, setEditingDate] = useState(null); // 正在编辑的原始日期，避免改日期时误覆盖别的计划
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);
  // 列表视图筛选
  const [statusFilter, setStatusFilter] = useState("全部");
  const [keyword, setKeyword] = useState("");
  // 体重记录（真实数据：来自后端 /api/body-weight）
  const [weights, setWeights] = useState(null); // null = 加载中
  const [weightError, setWeightError] = useState("");
  const [weightForm, setWeightForm] = useState(WEIGHT_EMPTY_FORM);
  const [editingWeightId, setEditingWeightId] = useState(null);
  const [weightMessage, setWeightMessage] = useState(null);
  // 运动记录（真实数据：来自后端 /api/exercises）
  const [exercises, setExercises] = useState(null); // null = 加载中
  const [exerciseError, setExerciseError] = useState("");
  const [exerciseForm, setExerciseForm] = useState(EXERCISE_EMPTY_FORM);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseMessage, setExerciseMessage] = useState(null);
  // 睡眠记录（真实数据：来自后端 /api/sleep-records）
  const [sleeps, setSleeps] = useState(null); // null = 加载中
  const [sleepError, setSleepError] = useState("");
  const [sleepForm, setSleepForm] = useState(SLEEP_EMPTY_FORM);
  const [editingSleepId, setEditingSleepId] = useState(null);
  const [sleepMessage, setSleepMessage] = useState(null);
  // 饮食记录（真实数据：来自后端 /api/diet-records）
  const [diets, setDiets] = useState(null); // null = 加载中
  const [dietError, setDietError] = useState("");
  const [dietForm, setDietForm] = useState(DIET_EMPTY_FORM);
  const [editingDietId, setEditingDietId] = useState(null);
  const [dietMessage, setDietMessage] = useState(null);
  const isAdmin = !!user && user.is_admin;

  const refresh = () => {
    api.listPlans().then(setPlans).catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
  }, []);

  // 体重记录：进入计划页就拉一次公开记录（最近 90 条足够看趋势）
  const refreshWeights = () => {
    api
      .listBodyWeights(90)
      .then(setWeights)
      .catch((e) => {
        setWeightError(e.message);
        setWeights([]); // 接口失败不阻塞页面，显示空状态
      });
  };
  useEffect(() => {
    refreshWeights();
  }, []);

  // 运动记录：进入计划页就拉一次公开记录（最近 90 条足够看统计和图表）
  const refreshExercises = () => {
    api
      .listExercises(90)
      .then(setExercises)
      .catch((e) => {
        setExerciseError(e.message);
        setExercises([]); // 接口失败不阻塞页面，显示空状态
      });
  };
  useEffect(() => {
    refreshExercises();
  }, []);

  // 睡眠记录：进入计划页就拉一次公开记录（最近 90 条足够看统计和图表）
  const refreshSleeps = () => {
    api
      .listSleepRecords(90)
      .then(setSleeps)
      .catch((e) => {
        setSleepError(e.message);
        setSleeps([]); // 接口失败不阻塞页面，显示空状态
      });
  };
  useEffect(() => {
    refreshSleeps();
  }, []);

  // 饮食记录：进入计划页就拉一次公开记录（最近 90 条足够看统计）
  const refreshDiets = () => {
    api
      .listDietRecords(90)
      .then(setDiets)
      .catch((e) => {
        setDietError(e.message);
        setDiets([]); // 接口失败不阻塞页面，显示空状态
      });
  };
  useEffect(() => {
    refreshDiets();
  }, []);

  // 跟随 hash 切换视图 / 月份 / 日期
  useEffect(() => {
    if (location.view === "month") {
      if (location.monthKey) setMonthKey(location.monthKey);
    } else if (location.view === "day" && location.date) {
      setSelectedDate(location.date);
    } else if (location.view === "today") {
      setSelectedDate(todayStr());
    }
  }, [location]);

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    // 错误提示多停留一会，方便用户看清失败原因
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  const byDate = useMemo(() => {
    const m = {};
    for (const p of plans || []) m[p.date] = p;
    return m;
  }, [plans]);

  // 完成度统计（真实数据：全部来自后端 plans 的 status）
  // ⚠️ 必须放在下方 early return（error / plans===null）之前——否则首渲染提前 return 会少执行一次 hook，
  //    下次渲染多出 planStats 这个 useMemo，React 报「Rendered more hooks」#310 直接白屏。
  const planStats = useMemo(() => {
    const counts = { 未开始: 0, 进行中: 0, 部分完成: 0, 已完成: 0, 暂停: 0 };
    for (const p of plans || []) {
      const label = toStatusLabel(p.status);
      if (label in counts) counts[label] += 1;
    }
    const total = (plans || []).length;
    const rate = total > 0 ? Math.round((counts["已完成"] / total) * 100) : 0;
    return { counts, total, rate };
  }, [plans]);

  // 体重统计（真实数据：全部来自后端 body_weight_records）
  // 接口按 date 倒序返回，第一条即最新记录；hasTrend 需至少 2 条才能画趋势
  const weightStats = useMemo(() => {
    const list = weights || [];
    return {
      latest: list.length > 0 ? list[0] : null,
      count: list.length,
      hasTrend: list.length >= 2,
    };
  }, [weights]);

  // 运动统计（真实数据：全部来自后端 exercise_records）
  const exerciseStats = useMemo(() => {
    const list = exercises || [];
    const withDist = list.filter((r) => r.distance_km != null && r.distance_km > 0);
    const totalDistance = withDist.reduce((s, r) => s + r.distance_km, 0);
    const totalDuration = list.reduce((s, r) => s + (r.duration_min || 0), 0);
    return {
      count: list.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration,
      latestDate: list.length > 0 ? list[0].date : null,
    };
  }, [exercises]);

  // 睡眠统计（真实数据：全部来自后端 sleep_records）
  // 接口按 date 倒序返回，第一条即最新记录；平均时长只统计有有效时长的记录
  const sleepStats = useMemo(() => {
    const list = sleeps || [];
    const withDur = list.filter((r) => r.duration_hours != null && r.duration_hours > 0);
    const avgDuration =
      withDur.length > 0
        ? Math.round((withDur.reduce((s, r) => s + r.duration_hours, 0) / withDur.length) * 10) / 10
        : null;
    return {
      count: list.length,
      latestDate: list.length > 0 ? list[0].date : null,
      avgDuration,
      latestDuration: withDur.length > 0 ? withDur[0].duration_hours : null,
    };
  }, [sleeps]);

  // 饮食统计（真实数据：全部来自后端 diet_records）
  const dietStats = useMemo(() => {
    const list = diets || [];
    const mealCounts = { 早餐: 0, 午餐: 0, 晚餐: 0, 加餐: 0, 其他: 0 };
    for (const r of list) {
      if (r.meal_type in mealCounts) mealCounts[r.meal_type] += 1;
      else mealCounts["其他"] += 1;
    }
    return { count: list.length, latestDate: list.length > 0 ? list[0].date : null, mealCounts };
  }, [diets]);

  const startEdit = (plan, fallbackDate) => {
    setEditing(true);
    setEditingDate(plan ? plan.date : null);
    setMessage(null);
    setForm(
      plan
        ? {
            date: plan.date,
            title: plan.title,
            goal: plan.goal,
            morning: plan.morning,
            afternoon: plan.afternoon,
            evening: plan.evening,
            review: plan.review,
            status: toStatusLabel(plan.status),
          }
        : { ...EMPTY_FORM, date: fallbackDate || todayStr() }
    );
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingDate(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    if (!form.date || !form.title.trim()) {
      showMsg("日期和标题不能为空", "error");
      return;
    }
    try {
      if (editingDate) {
        await api.updatePlan(editingDate, form);
        showMsg("计划已保存");
      } else {
        await api.createPlan(form);
        showMsg("计划已创建");
      }
      setEditing(false);
      setEditingDate(null);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const deletePlan = async (date) => {
    if (!window.confirm("确定删除这条计划？此操作不可撤销。")) return;
    try {
      await api.deletePlan(date);
      showMsg("计划已删除");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // ---------- 体重记录：管理员增删改 ----------
  const showWeightMsg = (msg, type = "success") => {
    setWeightMessage({ text: msg, type });
    setTimeout(() => setWeightMessage(null), type === "error" ? 5000 : 2500);
  };

  const startWeightEdit = (record) => {
    setEditingWeightId(record.id);
    setWeightMessage(null);
    setWeightForm({
      date: record.date,
      weight: String(record.weight),
      note: record.note || "",
      is_public: !!record.is_public,
    });
  };

  const cancelWeightEdit = () => {
    setEditingWeightId(null);
    setWeightMessage(null);
    setWeightForm(WEIGHT_EMPTY_FORM);
  };

  const saveWeight = async (e) => {
    e.preventDefault();
    if (!weightForm.date) {
      showWeightMsg("请选择记录日期", "error");
      return;
    }
    const w = Number(weightForm.weight);
    if (!weightForm.weight || Number.isNaN(w) || w <= 0 || w > 300) {
      showWeightMsg("体重必须是大于 0 且不超过 300 的数字", "error");
      return;
    }
    const payload = {
      date: weightForm.date,
      weight: w,
      note: (weightForm.note || "").trim(),
      is_public: weightForm.is_public,
    };
    try {
      if (editingWeightId) {
        await api.updateBodyWeight(editingWeightId, payload);
        showWeightMsg("体重记录已保存");
      } else {
        await api.createBodyWeight(payload);
        showWeightMsg("体重记录已新增");
      }
      setEditingWeightId(null);
      setWeightForm(WEIGHT_EMPTY_FORM);
      refreshWeights();
    } catch (err) {
      showWeightMsg(err.message, "error");
    }
  };

  const deleteWeight = async (id) => {
    if (!window.confirm("确定删除这条体重记录？此操作不可撤销。")) return;
    try {
      await api.deleteBodyWeight(id);
      showWeightMsg("体重记录已删除");
      if (editingWeightId === id) cancelWeightEdit();
      refreshWeights();
    } catch (err) {
      showWeightMsg(err.message, "error");
    }
  };

  // ---------- 运动记录：管理员增删改 ----------
  const showExerciseMsg = (msg, type = "success") => {
    setExerciseMessage({ text: msg, type });
    setTimeout(() => setExerciseMessage(null), type === "error" ? 5000 : 2500);
  };

  const startExerciseEdit = (record) => {
    setEditingExerciseId(record.id);
    setExerciseMessage(null);
    setExerciseForm({
      date: record.date,
      exercise_type: record.exercise_type || "",
      distance_km: record.distance_km != null ? String(record.distance_km) : "",
      duration_min: record.duration_min != null ? String(record.duration_min) : "",
      intensity: record.intensity || "",
      note: record.note || "",
      is_public: !!record.is_public,
    });
  };

  const cancelExerciseEdit = () => {
    setEditingExerciseId(null);
    setExerciseMessage(null);
    setExerciseForm(EXERCISE_EMPTY_FORM);
  };

  const saveExercise = async (e) => {
    e.preventDefault();
    if (!exerciseForm.date) {
      showExerciseMsg("请选择运动日期", "error");
      return;
    }
    const type = (exerciseForm.exercise_type || "").trim();
    if (!type) {
      showExerciseMsg("请选择运动类型", "error");
      return;
    }
    let dist = null;
    if (exerciseForm.distance_km !== "" && exerciseForm.distance_km != null) {
      dist = Number(exerciseForm.distance_km);
      if (Number.isNaN(dist) || dist < 0 || dist > 300) {
        showExerciseMsg("距离必须是 0~300 之间的数字", "error");
        return;
      }
    }
    let dur = null;
    if (exerciseForm.duration_min !== "" && exerciseForm.duration_min != null) {
      dur = Number(exerciseForm.duration_min);
      if (Number.isNaN(dur) || !Number.isInteger(dur) || dur < 0 || dur > 1440) {
        showExerciseMsg("时长必须是 0~1440 的整数分钟", "error");
        return;
      }
    }
    const payload = {
      date: exerciseForm.date,
      exercise_type: type,
      distance_km: dist,
      duration_min: dur,
      intensity: exerciseForm.intensity || "",
      note: (exerciseForm.note || "").trim(),
      is_public: exerciseForm.is_public,
    };
    try {
      if (editingExerciseId) {
        await api.updateExercise(editingExerciseId, payload);
        showExerciseMsg("运动记录已保存");
      } else {
        await api.createExercise(payload);
        showExerciseMsg("运动记录已新增");
      }
      setEditingExerciseId(null);
      setExerciseForm(EXERCISE_EMPTY_FORM);
      refreshExercises();
    } catch (err) {
      showExerciseMsg(err.message, "error");
    }
  };

  const deleteExercise = async (id) => {
    if (!window.confirm("确定删除这条运动记录？此操作不可撤销。")) return;
    try {
      await api.deleteExercise(id);
      showExerciseMsg("运动记录已删除");
      if (editingExerciseId === id) cancelExerciseEdit();
      refreshExercises();
    } catch (err) {
      showExerciseMsg(err.message, "error");
    }
  };

  // ---------- 睡眠记录：管理员增删改 ----------
  const showSleepMsg = (msg, type = "success") => {
    setSleepMessage({ text: msg, type });
    setTimeout(() => setSleepMessage(null), type === "error" ? 5000 : 2500);
  };

  const startSleepEdit = (record) => {
    setEditingSleepId(record.id);
    setSleepMessage(null);
    setSleepForm({
      date: record.date,
      sleep_time: record.sleep_time || "",
      wake_time: record.wake_time || "",
      duration_hours: record.duration_hours != null ? String(record.duration_hours) : "",
      quality: record.quality || "",
      note: record.note || "",
      is_public: !!record.is_public,
    });
  };

  const cancelSleepEdit = () => {
    setEditingSleepId(null);
    setSleepMessage(null);
    setSleepForm(SLEEP_EMPTY_FORM);
  };

  const saveSleep = async (e) => {
    e.preventDefault();
    if (!sleepForm.date) {
      showSleepMsg("请选择睡眠日期", "error");
      return;
    }
    let dur = null;
    if (sleepForm.duration_hours !== "" && sleepForm.duration_hours != null) {
      dur = Number(sleepForm.duration_hours);
      if (Number.isNaN(dur) || dur <= 0 || dur > 24) {
        showSleepMsg("睡眠时长必须是大于 0 且不超过 24 的数字", "error");
        return;
      }
    }
    const payload = {
      date: sleepForm.date,
      sleep_time: (sleepForm.sleep_time || "").trim(),
      wake_time: (sleepForm.wake_time || "").trim(),
      duration_hours: dur,
      quality: sleepForm.quality || "",
      note: (sleepForm.note || "").trim(),
      is_public: sleepForm.is_public,
    };
    try {
      if (editingSleepId) {
        await api.updateSleepRecord(editingSleepId, payload);
        showSleepMsg("睡眠记录已保存");
      } else {
        await api.createSleepRecord(payload);
        showSleepMsg("睡眠记录已新增");
      }
      setEditingSleepId(null);
      setSleepForm(SLEEP_EMPTY_FORM);
      refreshSleeps();
    } catch (err) {
      showSleepMsg(err.message, "error");
    }
  };

  const deleteSleep = async (id) => {
    if (!window.confirm("确定删除这条睡眠记录？此操作不可撤销。")) return;
    try {
      await api.deleteSleepRecord(id);
      showSleepMsg("睡眠记录已删除");
      if (editingSleepId === id) cancelSleepEdit();
      refreshSleeps();
    } catch (err) {
      showSleepMsg(err.message, "error");
    }
  };

  // ---------- 饮食记录：管理员增删改 ----------
  const showDietMsg = (msg, type = "success") => {
    setDietMessage({ text: msg, type });
    setTimeout(() => setDietMessage(null), type === "error" ? 5000 : 2500);
  };

  const startDietEdit = (record) => {
    setEditingDietId(record.id);
    setDietMessage(null);
    setDietForm({
      date: record.date,
      meal_type: record.meal_type || "",
      content: record.content || "",
      note: record.note || "",
      is_public: !!record.is_public,
    });
  };

  const cancelDietEdit = () => {
    setEditingDietId(null);
    setDietMessage(null);
    setDietForm(DIET_EMPTY_FORM);
  };

  const saveDiet = async (e) => {
    e.preventDefault();
    if (!dietForm.date) {
      showDietMsg("请选择饮食日期", "error");
      return;
    }
    const mealType = (dietForm.meal_type || "").trim();
    if (!mealType) {
      showDietMsg("请选择餐次", "error");
      return;
    }
    const content = (dietForm.content || "").trim();
    if (!content) {
      showDietMsg("请填写吃了什么", "error");
      return;
    }
    const payload = {
      date: dietForm.date,
      meal_type: mealType,
      content,
      note: (dietForm.note || "").trim(),
      is_public: dietForm.is_public,
    };
    try {
      if (editingDietId) {
        await api.updateDietRecord(editingDietId, payload);
        showDietMsg("饮食记录已保存");
      } else {
        await api.createDietRecord(payload);
        showDietMsg("饮食记录已新增");
      }
      setEditingDietId(null);
      setDietForm(DIET_EMPTY_FORM);
      refreshDiets();
    } catch (err) {
      showDietMsg(err.message, "error");
    }
  };

  const deleteDiet = async (id) => {
    if (!window.confirm("确定删除这条饮食记录？此操作不可撤销。")) return;
    try {
      await api.deleteDietRecord(id);
      showDietMsg("饮食记录已删除");
      if (editingDietId === id) cancelDietEdit();
      refreshDiets();
    } catch (err) {
      showDietMsg(err.message, "error");
    }
  };

  if (error) return <div className="error-box">加载失败：{error}</div>;
  if (plans === null && sprintTab === "overview") {
    return <div className="loading">加载中…</div>;
  }

  // ---------- 顶部 Hero（阶段冲刺计划） ----------
  const header = (
    <section className="sprint-hero">
      <span className="sprint-kicker">Learning Sprint</span>
      <h1 className="sprint-hero-title">沉积的阶段冲刺计划</h1>
      <p className="sprint-hero-subtitle">浙江大学 25 级本科生 · 准大二 · 学习计划与每日复盘</p>
      <p className="sprint-hero-desc">
        这里用现有计划数据记录每天的目标、上午、下午、晚上安排和复盘。访客可以查看，管理员登录后可以编辑保存。
      </p>
      <div className="sprint-hero-actions">
        {isAdmin ? (
          <span className="sprint-mode-chip edit">✍️ 当前是编辑模式</span>
        ) : (
          <a href="#/login" className="btn btn-primary">
            登录管理员后可编辑保存
          </a>
        )}
      </div>
    </section>
  );

  // ---------- 模式提示条（独立成行，不压标题） ----------
  const modeBanner = (
    <div className={`plan-mode-banner ${isAdmin ? "edit" : "view"}`}>
      {isAdmin
        ? "✍️ 当前是编辑模式，修改会保存到服务器数据库。"
        : "👀 当前是查看模式，只有管理员可以编辑计划。"}
    </div>
  );

  // ---------- 标签页导航 ----------
  const sprintTabs = (
    <div className="sprint-tabs" role="tablist" aria-label="阶段冲刺计划">
      {SPRINT_TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={sprintTab === t.key}
          className={`sprint-tab${sprintTab === t.key ? " active" : ""}`}
          onClick={() => setSprintTab(t.key)}
        >
          <span className="sprint-tab-label">{t.label}</span>
          <span className="sprint-tab-sub">{t.sub}</span>
        </button>
      ))}
    </div>
  );

  const renderStats = () => {
    const { counts, total, rate } = planStats;
    // 柱高 = 当前数量 / 最大数量 * 100%，全 0 时无柱
    const bars = STATUS_ORDER.map((label) => ({
      label,
      value: counts[label],
      cls: STATUS_CLASS[label],
    }));
    const maxCount = Math.max(...bars.map((b) => b.value));
    // 扇形图：conic-gradient 按各状态占比切分（从 12 点顺时针累加），颜色与状态色统一；
    // total 为 0 时走下面的空状态分支，不会进入这里，避免 0/0 与 NaN%
    const DONUT_COLORS = {
      未开始: "var(--text-secondary)",
      进行中: "var(--primary)",
      部分完成: "var(--partial)",
      已完成: "var(--success)",
      暂停: "var(--warning)",
    };
    let donutAcc = 0;
    const donutStops = STATUS_ORDER.filter((l) => counts[l] > 0).map((l) => {
      const from = donutAcc;
      donutAcc += (counts[l] / total) * 360;
      return `${DONUT_COLORS[l]} ${from.toFixed(2)}deg ${donutAcc.toFixed(2)}deg`;
    });
    const donutBackground = `conic-gradient(${donutStops.join(", ")})`;
    return (
      <section className="plan-stats">
        <div className="plan-stats-head">
          <h2>📊 计划完成度</h2>
          <p>根据已保存的公开计划状态自动统计，不使用假数据。</p>
        </div>
        {total === 0 ? (
          <div className="plan-stats-empty">
            暂无计划数据，创建计划后会自动生成完成度统计。
          </div>
        ) : (
          <>
            {/* 扇形图：五状态占比（conic-gradient 零依赖实现），图例含数量与百分比 */}
            <div className="plan-donut">
              <div
                className="plan-donut-chart"
                style={{ background: donutBackground }}
                role="img"
                aria-label="各计划状态占比扇形图"
              >
                <div className="plan-donut-hole">
                  <span className="plan-donut-total">{total}</span>
                  <span className="plan-donut-label">总计划</span>
                </div>
              </div>
              <div className="plan-donut-legend">
                {STATUS_ORDER.map((label) => (
                  <div key={label} className="plan-donut-legend-item">
                    <span className={`plan-donut-dot ${STATUS_CLASS[label]}`} />
                    <span className="plan-donut-legend-name">{label}</span>
                    <span className="plan-donut-legend-num">{counts[label]}</span>
                    <span className="plan-donut-legend-pct">
                      {total > 0 ? Math.round((counts[label] / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="plan-stats-body">
              <div className="plan-stats-nums">
                <div className="ps-item">
                  <span className="ps-num">{total}</span>
                  <span className="ps-label">总计划</span>
                </div>
                <div className="ps-item done">
                  <span className="ps-num">{counts["已完成"]}</span>
                  <span className="ps-label">已完成</span>
                </div>
                <div className="ps-item partial">
                  <span className="ps-num">{counts["部分完成"]}</span>
                  <span className="ps-label">部分完成</span>
                </div>
                <div className="ps-item pending">
                  <span className="ps-num">{counts["进行中"]}</span>
                  <span className="ps-label">进行中</span>
                </div>
                <div className="ps-item todo">
                  <span className="ps-num">{counts["未开始"]}</span>
                  <span className="ps-label">未开始</span>
                </div>
                <div className="ps-item paused">
                  <span className="ps-num">{counts["暂停"]}</span>
                  <span className="ps-label">暂停</span>
                </div>
                <div className="ps-item rate">
                  <span className="ps-num">{rate}%</span>
                  <span className="ps-label">完成率</span>
                </div>
              </div>
              <div className="plan-chart">
                {bars.map((b) => (
                  <div key={b.label} className="plan-chart-col">
                    <div className="plan-chart-track">
                      <div
                        className={`plan-chart-bar ${b.cls}`}
                        style={{
                          height: `${
                            maxCount > 0 ? Math.round((b.value / maxCount) * 100) : 0
                          }%`,
                        }}
                        title={`${b.label}：${b.value}`}
                      />
                    </div>
                    <span className="plan-chart-label">{b.label}</span>
                    <span className="plan-chart-value">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="plan-stats-note">
              达标程度说明：当前完成率仅根据「已完成」计划占全部计划的比例计算，「部分完成」暂不计入完成率。后续如果接入更细的每日任务完成记录，可以升级为更精确的进度统计。
            </p>
          </>
        )}
      </section>
    );
  };

  // ---------- 视图切换（概览内部） ----------
  const viewSwitch = (
    <div className="plan-view-switch" role="tablist" aria-label="计划视图">
      {[
        { key: "month", label: "月视图", href: "#/plans" },
        { key: "list", label: "列表视图", href: "#/plans/list" },
        { key: "today", label: "今日计划", href: "#/plans/today" },
      ].map((v) => (
        <a
          key={v.key}
          href={v.href}
          className={`plan-view-btn${location.view === v.key ? " active" : ""}`}
          role="tab"
          aria-selected={location.view === v.key}
        >
          {v.label}
        </a>
      ))}
    </div>
  );

  // ---------- 编辑表单（管理员） ----------
  const currentEditPlan = editingDate ? byDate[editingDate] : byDate[form.date];
  const editForm = editing && (
    <section className="plan-edit-card">
      <div className="plan-edit-card-head">
        <h3>{currentEditPlan ? "编辑计划" : "新建计划"}</h3>
        {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      </div>
      <form className="admin-form" onSubmit={savePlan}>
        <div className="form-row">
          <label>
            日期
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label>
            标题
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            今日目标
            <input
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            上午
            <input
              value={form.morning}
              onChange={(e) => setForm({ ...form, morning: e.target.value })}
            />
          </label>
          <label>
            下午
            <input
              value={form.afternoon}
              onChange={(e) => setForm({ ...form, afternoon: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            晚上
            <input
              value={form.evening}
              onChange={(e) => setForm({ ...form, evening: e.target.value })}
            />
          </label>
          <label>
            状态
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            今日复盘
            <textarea
              rows="3"
              value={form.review}
              onChange={(e) => setForm({ ...form, review: e.target.value })}
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {currentEditPlan ? "保存修改" : "创建计划"}
          </button>
          <button type="button" className="btn" onClick={cancelEdit}>
            取消
          </button>
        </div>
      </form>
    </section>
  );

  // ---------- 月视图 ----------
  const renderMonth = () => {
    const [year, month] = monthKey.split("-").map(Number);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month)}-${pad(d)}`;
      cells.push({ key, day: d, plan: byDate[key] || null });
    }
    const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
    const dayPlan = byDate[selectedDate] || null;

    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>
            {year} 年 {month} 月
          </h1>
          <div className="nav-bar">
            <button type="button" className="btn" onClick={() => setMonthKey(prevMonth)}>
              ◀ 上月
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMonthKey(nowMonth());
                setSelectedDate(todayStr());
              }}
            >
              回到今天
            </button>
            <button type="button" className="btn" onClick={() => setMonthKey(nextMonth)}>
              下月 ▶
            </button>
          </div>
        </div>

        <div className="cal-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-head">
              {w}
            </div>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <div key={`e${i}`} className="cal-cell empty" />
            ) : (
              <button
                key={c.key}
                type="button"
                className={`cal-cell ${c.plan ? "has-plan" : ""} ${
                  selectedDate === c.key ? "selected" : ""
                }`}
                onClick={() => setSelectedDate(c.key)}
              >
                <span className="cal-day">{c.day}</span>
                {c.plan && (
                  <>
                    <span className="cal-title">{c.plan.title}</span>
                    <span className={`status ${toStatusClass(c.plan.status)}`}>
                      {toStatusLabel(c.plan.status)}
                    </span>
                  </>
                )}
              </button>
            )
          )}
        </div>

        {dayPlan ? (
          <div className="plan-card day-plan">
            <PlanDetail plan={dayPlan} />
            {isAdmin && (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => startEdit(dayPlan)}>
                  编辑当天计划
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deletePlan(selectedDate)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="day-panel-empty">
            <p className="muted">
              {selectedDate}{" "}
              {isAdmin ? "这一天暂无计划，可以创建。" : "这一天暂无公开计划。"}
            </p>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => startEdit(null, selectedDate)}
              >
                ✍️ 创建当天的计划
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  // ---------- 列表视图 ----------
  const renderList = () => {
    const statusCounts = { 全部: plans.length };
    for (const s of STATUS_ORDER) {
      statusCounts[s] = plans.filter((p) => toStatusLabel(p.status) === s).length;
    }

    const kw = keyword.trim().toLowerCase();
    const filtered = plans.filter((p) => {
      if (statusFilter !== "全部" && toStatusLabel(p.status) !== statusFilter) return false;
      if (kw) {
        const hay = `${p.title || ""} ${p.goal || ""} ${p.review || ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });

    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>列表视图</h1>
          <p className="muted">共 {plans.length} 条公开计划 · 数据来自后端数据库</p>
        </div>

        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-label">状态</span>
            <div className="filter-bar">
              {["全部", ...STATUS_ORDER].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`filter-chip${statusFilter === s ? " active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}（{statusCounts[s] || 0}）
                </button>
              ))}
            </div>
          </div>

          <div className="filter-search">
            <span className="filter-label">搜索</span>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题、目标或复盘"
              />
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="empty-state">
            <h2>暂无公开计划</h2>
            <p>管理员登录后可以创建第一条计划。</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h2>没有符合条件的计划</h2>
            <p>换个筛选条件或关键词试试。</p>
          </div>
        ) : (
          <div className="plan-list">
            {filtered.map((p) => (
              <article key={p.id} className="plan-card">
                <PlanDetail plan={p} />
                {isAdmin && (
                  <div className="form-actions">
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(p)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => deletePlan(p.date)}
                    >
                      删除
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    );
  };

  // ---------- 今日计划 ----------
  const renderToday = () => {
    const date = todayStr();
    const plan = byDate[date];
    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>今日计划</h1>
          <p className="muted">{date}</p>
        </div>
        {!plan ? (
          <div className="empty-state">
            <h2>今天还没有公开计划。</h2>
            <p>访客只能查看；管理员登录后可以为今天创建计划。</p>
            {isAdmin && (
              <div className="form-actions" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-primary" onClick={() => startEdit(null)}>
                  ✍️ 创建今天的计划
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="plan-card day-plan">
            <PlanDetail plan={plan} showDate={false} />
            {isAdmin && (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => startEdit(plan)}>
                  编辑今天的计划
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deletePlan(date)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  // ---------- 日计划深链（#/plans/day/YYYY-MM-DD） ----------
  const renderDay = () => {
    const date = location.date || selectedDate;
    const plan = byDate[date];
    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>{date} 的计划</h1>
          <a href="#/plans" className="back-link">
            ← 回到月视图
          </a>
        </div>
        {!plan ? (
          <div className="empty-state">
            <h2>这一天暂无公开计划。</h2>
            <p>
              {isAdmin
                ? "管理员可以点击下面的按钮，为这一天创建一条计划。"
                : "访客只能查看，计划由管理员维护。"}
            </p>
            {isAdmin && (
              <div className="form-actions" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-primary" onClick={() => startEdit(null, date)}>
                  添加当天计划
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="plan-card day-plan">
            <PlanDetail plan={plan} />
            {isAdmin && (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => startEdit(plan)}>
                  编辑这条计划
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deletePlan(date)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  // ---------- 每日安排（按日期查看当天的计划详情，只读 /api/plans 数据） ----------
  const renderDaily = () => {
    const plan = byDate[selectedDate] || null;
    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>每日安排</h1>
          <p className="muted">选择日期，查看这一天的目标、上午 / 下午 / 晚上安排和复盘</p>
        </div>

        <div className="daily-picker">
          <label htmlFor="daily-date" className="daily-picker-label">
            📅 选择日期
          </label>
          <input
            id="daily-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {plan ? (
          <div className="plan-card day-plan">
            <PlanDetail plan={plan} />
            {isAdmin && (
              <div className="form-actions">
                <a href="#/admin" className="btn btn-sm">
                  ✍️ 去后台编辑这条计划
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h2>这一天暂无公开计划。</h2>
            <p>
              {isAdmin
                ? "这一天还没有计划，管理员可以到后台创建。"
                : "访客只能查看公开计划，计划由管理员维护。"}
            </p>
            {isAdmin && (
              <div className="form-actions" style={{ justifyContent: "center" }}>
                <a href="#/admin" className="btn btn-primary">
                  ✍️ 去后台创建计划
                </a>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  // ---------- 生活记录 tab：体重 / 运动 / 睡眠 / 饮食（全部真实功能） ----------
  const renderLife = () => {
    const { latest, count, hasTrend } = weightStats;
    const exStats = exerciseStats;
    return (
      <section className="sprint-section">
        <div className="sprint-section-head">
          <div>
            <h2>🏃 生活记录</h2>
            <p className="muted">体重、运动、睡眠、饮食</p>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: "var(--sp-4)" }}>
          体重、运动、睡眠、饮食记录已接入真实后端数据；所有统计和图表只使用真实记录，不显示假数据。
        </p>

        {weightMessage && (
          <div className={`toast toast-${weightMessage.type}`}>{weightMessage.text}</div>
        )}
        {exerciseMessage && (
          <div className={`toast toast-${exerciseMessage.type}`}>{exerciseMessage.text}</div>
        )}
        {sleepMessage && (
          <div className={`toast toast-${sleepMessage.type}`}>{sleepMessage.text}</div>
        )}
        {dietMessage && (
          <div className={`toast toast-${dietMessage.type}`}>{dietMessage.text}</div>
        )}

        {/* ⚖️ 体重记录：真实功能模块（数据全部来自后端 /api/body-weight） */}
        <div className="weight-module">
          <div className="weight-module-head">
            <h3>⚖️ 体重记录</h3>
            <span className="weight-badge live">已接入真实数据</span>
          </div>

          {weightError && <div className="error-box">体重加载失败：{weightError}</div>}

          {weights === null ? (
            <div className="loading">体重记录加载中…</div>
          ) : (
            <>
              {/* 顶部统计卡：最新体重 / 记录数量 / 最近记录日期 / 趋势状态 */}
              <div className="weight-stats">
                <div className="ws-item">
                  <span className="ws-num">{latest ? `${latest.weight} kg` : "—"}</span>
                  <span className="ws-label">最新体重</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{count}</span>
                  <span className="ws-label">记录数量</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{latest ? latest.date : "—"}</span>
                  <span className="ws-label">最近记录日期</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{hasTrend ? "有记录" : "数据不足"}</span>
                  <span className="ws-label">趋势状态</span>
                </div>
              </div>

              {/* 趋势图卡：只画真实记录，少于 2 条显示空状态 */}
              <div className="weight-card">
                <h4>📈 体重变化趋势</h4>
                <WeightTrendChart records={weights} />
              </div>

              {/* 管理员表单：新增 / 编辑（真实保存到后端，不是假表单） */}
              {isAdmin && (
                <div className="weight-card">
                  <h4>{editingWeightId ? "✏️ 编辑体重记录" : "➕ 新增体重记录"}</h4>
                  <form className="admin-form" onSubmit={saveWeight}>
                    <div className="form-row">
                      <label>
                        日期
                        <input
                          type="date"
                          value={weightForm.date}
                          onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        体重（kg）
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="300"
                          placeholder="输入体重数值"
                          value={weightForm.weight}
                          onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                          required
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label className="weight-note-label">
                        备注
                        <input
                          value={weightForm.note}
                          onChange={(e) => setWeightForm({ ...weightForm, note: e.target.value })}
                          placeholder="可留空"
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label className="weight-public-label">
                        <input
                          type="checkbox"
                          checked={weightForm.is_public}
                          onChange={(e) =>
                            setWeightForm({ ...weightForm, is_public: e.target.checked })
                          }
                        />
                        公开给访客查看
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingWeightId ? "保存修改" : "新增记录"}
                      </button>
                      {editingWeightId && (
                        <button type="button" className="btn" onClick={cancelWeightEdit}>
                          清空表单
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* 记录列表：最近记录（日期 / 体重 / 备注 / 是否公开 / 更新时间） */}
              <div className="weight-card">
                <h4>📋 最近记录</h4>
                {count === 0 ? (
                  <div className="weight-empty">
                    <p>暂无体重记录，图表和统计会在有记录后自动生成。</p>
                    {!isAdmin && (
                      <p className="muted">访客只能查看公开记录，记录由管理员维护。</p>
                    )}
                  </div>
                ) : (
                  <div className="weight-list">
                    {weights.map((r) => (
                      <div key={r.id} className="weight-row">
                        <span className="weight-row-date">{r.date}</span>
                        <span className="weight-row-value">{r.weight} kg</span>
                        <span className="weight-row-note">
                          {r.note ? r.note : <span className="field-empty">未填写</span>}
                        </span>
                        <span className={`weight-public ${r.is_public ? "pub" : "priv"}`}>
                          {r.is_public ? "公开" : "私密"}
                        </span>
                        <span className="weight-time">更新于 {formatTime(r.updated_at)}</span>
                        {isAdmin && (
                          <div className="weight-row-actions">
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => startWeightEdit(r)}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteWeight(r.id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🏃 运动记录：真实功能模块（数据全部来自后端 /api/exercises） */}
        <div className="weight-module">
          <div className="weight-module-head">
            <h3>🏃 运动记录</h3>
            <span className="weight-badge live">已接入真实数据</span>
          </div>

          {exerciseError && <div className="error-box">运动加载失败：{exerciseError}</div>}

          {exercises === null ? (
            <div className="loading">运动记录加载中…</div>
          ) : (
            <>
              {/* 顶部统计卡：记录数量 / 总距离 / 总时长 / 最近运动日期 */}
              <div className="weight-stats">
                <div className="ws-item">
                  <span className="ws-num">{exStats.count}</span>
                  <span className="ws-label">记录数量</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">
                    {exStats.totalDistance > 0 ? `${exStats.totalDistance} km` : "—"}
                  </span>
                  <span className="ws-label">总距离</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">
                    {exStats.totalDuration > 0 ? `${exStats.totalDuration} 分钟` : "—"}
                  </span>
                  <span className="ws-label">总时长</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{exStats.latestDate || "—"}</span>
                  <span className="ws-label">最近运动日期</span>
                </div>
              </div>

              {/* 距离柱状图卡：只画真实记录，没有距离数据时显示空状态 */}
              <div className="weight-card">
                <h4>📊 最近运动距离</h4>
                <ExerciseDistanceChart records={exercises} />
              </div>

              {/* 管理员表单：新增 / 编辑（真实保存到后端，不是假表单） */}
              {isAdmin && (
                <div className="weight-card">
                  <h4>{editingExerciseId ? "✏️ 编辑运动记录" : "➕ 新增运动记录"}</h4>
                  <form className="admin-form" onSubmit={saveExercise}>
                    <div className="form-row">
                      <label>
                        日期
                        <input
                          type="date"
                          value={exerciseForm.date}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, date: e.target.value })
                          }
                          required
                        />
                      </label>
                      <label>
                        运动类型
                        <select
                          value={exerciseForm.exercise_type}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, exercise_type: e.target.value })
                          }
                          required
                        >
                          <option value="" disabled>
                            请选择类型
                          </option>
                          {EXERCISE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        距离（km，可选）
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="300"
                          placeholder="可留空"
                          value={exerciseForm.distance_km}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, distance_km: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        时长（分钟，可选）
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="1440"
                          placeholder="可留空"
                          value={exerciseForm.duration_min}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, duration_min: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        强度
                        <select
                          value={exerciseForm.intensity}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, intensity: e.target.value })
                          }
                        >
                          <option value="" disabled>
                            请选择强度
                          </option>
                          {EXERCISE_INTENSITIES.map((i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="weight-public-label">
                        <input
                          type="checkbox"
                          checked={exerciseForm.is_public}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, is_public: e.target.checked })
                          }
                        />
                        公开给访客查看
                      </label>
                    </div>
                    <div className="form-row">
                      <label className="weight-note-label">
                        备注
                        <input
                          value={exerciseForm.note}
                          onChange={(e) =>
                            setExerciseForm({ ...exerciseForm, note: e.target.value })
                          }
                          placeholder="可留空"
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingExerciseId ? "保存修改" : "新增记录"}
                      </button>
                      {editingExerciseId && (
                        <button type="button" className="btn" onClick={cancelExerciseEdit}>
                          清空表单
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* 记录列表：最近记录（日期 / 类型 / 距离 / 时长 / 强度 / 备注 / 是否公开 / 更新时间） */}
              <div className="weight-card">
                <h4>📋 最近记录</h4>
                {exStats.count === 0 ? (
                  <div className="weight-empty">
                    <p>暂无运动记录，统计和图表会在有记录后自动生成。</p>
                    {!isAdmin && (
                      <p className="muted">访客只能查看公开记录，记录由管理员维护。</p>
                    )}
                  </div>
                ) : (
                  <div className="weight-list">
                    {exercises.map((r) => (
                      <div key={r.id} className="weight-row">
                        <span className="weight-row-date">{r.date}</span>
                        <span className="exercise-chip">{r.exercise_type}</span>
                        <span className="weight-row-value">
                          {r.distance_km != null ? `${r.distance_km} km` : "—"}
                        </span>
                        <span className="weight-row-value">
                          {r.duration_min != null ? `${r.duration_min} 分钟` : "—"}
                        </span>
                        <span className="exercise-intensity">
                          {r.intensity ? r.intensity : <span className="field-empty">未填写</span>}
                        </span>
                        <span className="weight-row-note">
                          {r.note ? r.note : <span className="field-empty">未填写</span>}
                        </span>
                        <span className={`weight-public ${r.is_public ? "pub" : "priv"}`}>
                          {r.is_public ? "公开" : "私密"}
                        </span>
                        <span className="weight-time">更新于 {formatTime(r.updated_at)}</span>
                        {isAdmin && (
                          <div className="weight-row-actions">
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => startExerciseEdit(r)}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteExercise(r.id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🌙 睡眠记录：真实功能模块（数据全部来自后端 /api/sleep-records） */}
        <div className="weight-module">
          <div className="weight-module-head">
            <h3>🌙 睡眠记录</h3>
            <span className="weight-badge live">已接入真实数据</span>
          </div>

          {sleepError && <div className="error-box">睡眠加载失败：{sleepError}</div>}

          {sleeps === null ? (
            <div className="loading">睡眠记录加载中…</div>
          ) : (
            <>
              {/* 顶部统计卡：记录数量 / 最近睡眠日期 / 平均睡眠时长 / 最近一次睡眠时长 */}
              <div className="weight-stats">
                <div className="ws-item">
                  <span className="ws-num">{sleepStats.count}</span>
                  <span className="ws-label">记录数量</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{sleepStats.latestDate || "—"}</span>
                  <span className="ws-label">最近睡眠日期</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">
                    {sleepStats.avgDuration != null ? `${sleepStats.avgDuration} 小时` : "—"}
                  </span>
                  <span className="ws-label">平均睡眠时长</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">
                    {sleepStats.latestDuration != null
                      ? `${sleepStats.latestDuration} 小时`
                      : "—"}
                  </span>
                  <span className="ws-label">最近一次睡眠时长</span>
                </div>
              </div>

              {/* 睡眠时长柱状图卡：只画真实记录，时长数据不足时显示空状态 */}
              <div className="weight-card">
                <h4>📊 最近睡眠时长</h4>
                <SleepDurationChart records={sleeps} />
              </div>

              {/* 管理员表单：新增 / 编辑（真实保存到后端，不是假表单） */}
              {isAdmin && (
                <div className="weight-card">
                  <h4>{editingSleepId ? "✏️ 编辑睡眠记录" : "➕ 新增睡眠记录"}</h4>
                  <form className="admin-form" onSubmit={saveSleep}>
                    <div className="form-row">
                      <label>
                        日期
                        <input
                          type="date"
                          value={sleepForm.date}
                          onChange={(e) => setSleepForm({ ...sleepForm, date: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        睡眠质量
                        <select
                          value={sleepForm.quality}
                          onChange={(e) => setSleepForm({ ...sleepForm, quality: e.target.value })}
                        >
                          <option value="" disabled>
                            请选择质量
                          </option>
                          {SLEEP_QUALITIES.map((q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        入睡时间
                        <input
                          type="time"
                          value={sleepForm.sleep_time}
                          onChange={(e) =>
                            setSleepForm({ ...sleepForm, sleep_time: e.target.value })
                          }
                          placeholder="如 23:30"
                        />
                      </label>
                      <label>
                        起床时间
                        <input
                          type="time"
                          value={sleepForm.wake_time}
                          onChange={(e) =>
                            setSleepForm({ ...sleepForm, wake_time: e.target.value })
                          }
                          placeholder="如 07:10"
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        睡眠时长（小时，可选）
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="24"
                          placeholder="可留空"
                          value={sleepForm.duration_hours}
                          onChange={(e) =>
                            setSleepForm({ ...sleepForm, duration_hours: e.target.value })
                          }
                        />
                      </label>
                      <label className="weight-public-label">
                        <input
                          type="checkbox"
                          checked={sleepForm.is_public}
                          onChange={(e) =>
                            setSleepForm({ ...sleepForm, is_public: e.target.checked })
                          }
                        />
                        公开给访客查看
                      </label>
                    </div>
                    <div className="form-row">
                      <label className="weight-note-label">
                        备注
                        <input
                          value={sleepForm.note}
                          onChange={(e) => setSleepForm({ ...sleepForm, note: e.target.value })}
                          placeholder="可留空"
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingSleepId ? "保存修改" : "新增记录"}
                      </button>
                      {editingSleepId && (
                        <button type="button" className="btn" onClick={cancelSleepEdit}>
                          清空表单
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* 记录列表：最近记录（日期 / 质量 / 入睡 / 起床 / 时长 / 备注 / 是否公开 / 更新时间） */}
              <div className="weight-card">
                <h4>📋 最近记录</h4>
                {sleepStats.count === 0 ? (
                  <div className="weight-empty">
                    <p>暂无睡眠记录，统计和图表会在有记录后自动生成。</p>
                    {!isAdmin && (
                      <p className="muted">访客只能查看公开记录，记录由管理员维护。</p>
                    )}
                  </div>
                ) : (
                  <div className="weight-list">
                    {sleeps.map((r) => (
                      <div key={r.id} className="weight-row">
                        <span className="weight-row-date">{r.date}</span>
                        <span className="exercise-intensity">
                          {r.quality ? r.quality : <span className="field-empty">未填写</span>}
                        </span>
                        <span className="weight-row-value">
                          {r.sleep_time ? r.sleep_time : "—"}
                        </span>
                        <span className="weight-row-value">
                          {r.wake_time ? r.wake_time : "—"}
                        </span>
                        <span className="weight-row-value">
                          {r.duration_hours != null && r.duration_hours > 0
                            ? `${r.duration_hours} 小时`
                            : "—"}
                        </span>
                        <span className="weight-row-note">
                          {r.note ? r.note : <span className="field-empty">未填写</span>}
                        </span>
                        <span className={`weight-public ${r.is_public ? "pub" : "priv"}`}>
                          {r.is_public ? "公开" : "私密"}
                        </span>
                        <span className="weight-time">更新于 {formatTime(r.updated_at)}</span>
                        {isAdmin && (
                          <div className="weight-row-actions">
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => startSleepEdit(r)}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteSleep(r.id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🍱 饮食记录：真实功能模块（数据全部来自后端 /api/diet-records） */}
        <div className="weight-module">
          <div className="weight-module-head">
            <h3>🍱 饮食记录</h3>
            <span className="weight-badge live">已接入真实数据</span>
          </div>

          {dietError && <div className="error-box">饮食加载失败：{dietError}</div>}

          {diets === null ? (
            <div className="loading">饮食记录加载中…</div>
          ) : (
            <>
              {/* 顶部统计卡：记录数量 / 最近记录日期 / 各餐次数量（只统计真实记录） */}
              <div className="weight-stats">
                <div className="ws-item">
                  <span className="ws-num">{dietStats.count}</span>
                  <span className="ws-label">记录数量</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{dietStats.latestDate || "—"}</span>
                  <span className="ws-label">最近记录日期</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{dietStats.mealCounts["早餐"]}</span>
                  <span className="ws-label">早餐</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{dietStats.mealCounts["午餐"]}</span>
                  <span className="ws-label">午餐</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{dietStats.mealCounts["晚餐"]}</span>
                  <span className="ws-label">晚餐</span>
                </div>
                <div className="ws-item">
                  <span className="ws-num">{dietStats.mealCounts["加餐"]}</span>
                  <span className="ws-label">加餐</span>
                </div>
              </div>

              {/* 餐次分布卡：只统计真实记录，无记录显示空状态 */}
              <div className="weight-card">
                <h4>🍽️ 餐次分布</h4>
                {dietStats.count === 0 ? (
                  <div className="weight-chart-empty">
                    暂无饮食记录，添加更多饮食记录后会显示餐次统计。
                  </div>
                ) : (
                  <div className="diet-meal-grid">
                    {MEAL_TYPES.map((m) => (
                      <div key={m} className="diet-meal-item">
                        <span className="diet-meal-count">{dietStats.mealCounts[m]}</span>
                        <span className="diet-meal-label">{m}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 管理员表单：新增 / 编辑（真实保存到后端，不是假表单） */}
              {isAdmin && (
                <div className="weight-card">
                  <h4>{editingDietId ? "✏️ 编辑饮食记录" : "➕ 新增饮食记录"}</h4>
                  <form className="admin-form" onSubmit={saveDiet}>
                    <div className="form-row">
                      <label>
                        日期
                        <input
                          type="date"
                          value={dietForm.date}
                          onChange={(e) => setDietForm({ ...dietForm, date: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        餐次
                        <select
                          value={dietForm.meal_type}
                          onChange={(e) => setDietForm({ ...dietForm, meal_type: e.target.value })}
                          required
                        >
                          <option value="" disabled>
                            请选择餐次
                          </option>
                          {MEAL_TYPES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        吃了什么
                        <input
                          value={dietForm.content}
                          onChange={(e) => setDietForm({ ...dietForm, content: e.target.value })}
                          placeholder="如：米饭、清炒时蔬"
                          required
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label className="weight-note-label">
                        备注
                        <input
                          value={dietForm.note}
                          onChange={(e) => setDietForm({ ...dietForm, note: e.target.value })}
                          placeholder="可留空"
                        />
                      </label>
                      <label className="weight-public-label">
                        <input
                          type="checkbox"
                          checked={dietForm.is_public}
                          onChange={(e) =>
                            setDietForm({ ...dietForm, is_public: e.target.checked })
                          }
                        />
                        公开给访客查看
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingDietId ? "保存修改" : "新增记录"}
                      </button>
                      {editingDietId && (
                        <button type="button" className="btn" onClick={cancelDietEdit}>
                          清空表单
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* 记录列表：最近记录（日期 / 餐次 / 内容 / 备注 / 是否公开 / 更新时间） */}
              <div className="weight-card">
                <h4>📋 最近记录</h4>
                {dietStats.count === 0 ? (
                  <div className="weight-empty">
                    <p>暂无饮食记录，统计会在有记录后自动生成。</p>
                    {!isAdmin && (
                      <p className="muted">访客只能查看公开记录，记录由管理员维护。</p>
                    )}
                  </div>
                ) : (
                  <div className="weight-list">
                    {diets.map((r) => (
                      <div key={r.id} className="weight-row">
                        <span className="weight-row-date">{r.date}</span>
                        <span className="exercise-chip">{r.meal_type}</span>
                        <span className="weight-row-note">{r.content}</span>
                        <span className="weight-row-note">
                          {r.note ? r.note : <span className="field-empty">未填写</span>}
                        </span>
                        <span className={`weight-public ${r.is_public ? "pub" : "priv"}`}>
                          {r.is_public ? "公开" : "私密"}
                        </span>
                        <span className="weight-time">更新于 {formatTime(r.updated_at)}</span>
                        {isAdmin && (
                          <div className="weight-row-actions">
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => startDietEdit(r)}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteDiet(r.id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="plans">
      {header}
      {modeBanner}
      {sprintTabs}
      {message && !editing && sprintTab === "overview" && (
        <div className={`toast toast-${message.type}`}>{message.text}</div>
      )}

      {sprintTab === "overview" && (
        <>
          {renderStats()}
          {viewSwitch}
          {editForm}
          {location.view === "month" && renderMonth()}
          {location.view === "list" && renderList()}
          {location.view === "today" && renderToday()}
          {location.view === "day" && renderDay()}
        </>
      )}

      {sprintTab === "daily" && renderDaily()}

      {sprintTab === "completion" && renderStats()}

      {sprintTab === "life" && renderLife()}

      {sprintTab === "more" && (
        <section className="sprint-section">
          <div className="sprint-section-head">
            <div>
              <h2>🧩 暂未接入</h2>
              <p className="muted">课程 / 应用 / 记账</p>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: "var(--sp-4)" }}>
            以下细分模块还没有接入真实后端，暂不展示假数据。接入后才会出现在正式页面。
          </p>
          <div className="sprint-more-grid">
            {MORE_MODULES.map((m) => (
              <div key={m.key} className="sprint-more-card">
                <h3>
                  {m.icon} {m.title}
                </h3>
                <p className="muted">
                  该模块尚未接入真实后端，当前显示空状态，不会出现假数据。
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
