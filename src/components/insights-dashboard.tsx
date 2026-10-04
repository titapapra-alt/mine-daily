"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, CircleAlert, Droplets, Moon, Scale, Utensils } from "lucide-react";
import { MonthYearPicker } from "@/components/month-year-picker";
import { calorieStatus } from "@/lib/calorie-status";
import { today } from "@/lib/utils";
import { type DayData as DailyRecord, getDailyRecords } from "@/lib/daily-data";

type Range = "week" | "month" | "year" | "all";
type Metric = "calories" | "sleep" | "weight";
type DetailTab = "overview" | "routine" | "habits";
type Point = {
  label: string;
  calories: number | null;
  sleep: number | null;
  weight: number | null;
};

type MetricConfig = {
  metric: Metric;
  title: string;
  unit: string;
  threshold: number;
  alertWhen: "above" | "below";
  decimals: number;
};

const metricConfigs: MetricConfig[] = [
  { metric: "calories", title: "Calories trend", unit: "kcal", threshold: 2000, alertWhen: "above", decimals: 0 },
  { metric: "sleep", title: "Sleep trend", unit: "h", threshold: 6, alertWhen: "below", decimals: 1 },
  { metric: "weight", title: "Weight trend", unit: "kg", threshold: 60, alertWhen: "above", decimals: 1 },
];
const detailTabs: { value: DetailTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "routine", label: "Routine" },
  { value: "habits", label: "Habits" },
];

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const numeric = (value?: string) => value && Number.isFinite(Number(value)) ? Number(value) : null;
const caloriesOf = (record: DailyRecord) => record.meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
const averageOf = (records: DailyRecord[], read: (record: DailyRecord) => number | null) => {
  const values = records.map(read).filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};
const monthName = (value: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));
const shortDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
const preview = (value: string, limit = 120) => value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;
const exerciseEmoji: Record<string, string> = {
  running: "🏃🏽‍♀️",
  "weight training": "💪🏽",
  badminton: "🏸",
  yoga: "🧘🏽‍♀️",
  stretching: "🤸🏽‍♀️",
  hiit: "🔥",
};
const emojiForExercise = (type: string) => exerciseEmoji[type.trim().toLowerCase()] ?? "🏋🏽‍♀️";
const mealsTooltip = (record: DailyRecord) => [...record.meals]
  .sort((first, second) => first.time.localeCompare(second.time))
  .map((meal) => `${meal.time || "—"} · ${(Number(meal.calories) || 0).toLocaleString()} kcal · ${meal.detail || "—"}`)
  .join("\n");
const seedCyclingIcon = (phase: DailyRecord["seedCycling"]) => phase === "phase_1" ? "🌻" : phase === "phase_2" ? "🎃" : null;
const seedCyclingDescription = (phase: DailyRecord["seedCycling"]) => phase === "phase_1"
  ? "Phase 1, Pumpkin and Flax seeds"
  : "Phase 2, Sunflower and Black sesame seeds";
const bedTierIcon = (tier: DailyRecord["bedTier"]) => tier === "tier_1" ? "🔥" : tier === "tier_2" ? "🔥🔥" : tier === "tier_3" ? "🔥🔥🔥" : null;
const bedTierDescription = (tier: DailyRecord["bedTier"]) => tier ? `BED Tier ${tier.slice(-1)}` : "BED not selected";

const formatMetricValue = (value: number, config: MetricConfig) => `${value.toLocaleString(undefined, {
  minimumFractionDigits: config.decimals,
  maximumFractionDigits: config.decimals,
})} ${config.unit}`;

const isAlertValue = (value: number, config: MetricConfig) => config.alertWhen === "above"
  ? value > config.threshold
  : value < config.threshold;

const thresholdLabel = (config: MetricConfig) => `${config.alertWhen === "above" ? "Above" : "Below"} ${formatMetricValue(config.threshold, config)}`;

function TrendChart({ points, range, config }: { points: Point[]; range: Range; config: MetricConfig }) {
  const width = 760;
  const height = 260;
  const inset = { top: 20, right: 24, bottom: 46, left: 52 };
  const chartWidth = width - inset.left - inset.right;
  const chartHeight = height - inset.top - inset.bottom;
  const values = points.map((point) => point[config.metric]).filter((value): value is number => value !== null);
  const latest = values.at(-1) ?? null;
  const alertCount = values.filter((value) => isAlertValue(value, config)).length;
  const dataMinimum = Math.min(config.threshold, ...values);
  const dataMaximum = Math.max(config.threshold, ...values);
  const spread = Math.max(dataMaximum - dataMinimum, config.metric === "weight" ? 5 : 1);
  const minimum = config.metric === "weight" ? Math.max(0, Math.floor((dataMinimum - spread * 0.2) / 5) * 5) : 0;
  const baselineMaximum = config.metric === "calories" ? 2500 : config.metric === "sleep" ? 8 : config.threshold + 5;
  const maximum = Math.max(baselineMaximum, Math.ceil((dataMaximum + spread * 0.2) / 5) * 5);
  const position = (index: number, value: number) => ({
    x: inset.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: inset.top + chartHeight - ((value - minimum) / (maximum - minimum)) * chartHeight,
  });
  const segments = points.reduce<number[][]>((result, point, index) => {
    if (point[config.metric] === null) return result;
    const previous = result.at(-1);
    if (index > 0 && points[index - 1][config.metric] !== null && previous) previous.push(index);
    else result.push([index]);
    return result;
  }, []);
  const labelledIndexes = points.length > 12
    ? points.map((_, index) => index).filter((index) => index % Math.ceil(points.length / 8) === 0)
    : points.map((_, index) => index);
  const thresholdY = position(0, config.threshold).y;
  const insight = alertCount
    ? `${alertCount} ${alertCount === 1 ? "value" : "values"} ${config.alertWhen === "above" ? "above" : "below"} the ${formatMetricValue(config.threshold, config)} threshold.`
    : `No values ${config.alertWhen === "above" ? "above" : "below"} the ${formatMetricValue(config.threshold, config)} threshold.`;

  return (
    <details className={`insight-chart-card insight-chart-${config.metric}`}>
      <summary className="insight-chart-summary">
        <div className="insight-chart-title">
          <span className="chart-icon" aria-hidden="true">
            {config.metric === "calories" ? <Utensils size={18} /> : config.metric === "sleep" ? <Moon size={18} /> : <Scale size={18} />}
          </span>
          <div>
            <span className="card-date">{config.title}</span>
            <h2>{range === "all" ? "Across your years" : "See the rhythm"}</h2>
          </div>
        </div>
        <div className="insight-chart-glance">
          {latest !== null && <span className={isAlertValue(latest, config) ? "chart-latest is-alert" : "chart-latest"}>{formatMetricValue(latest, config)}</span>}
          <span className={alertCount ? "chart-alert-count is-alert" : "chart-alert-count"}>{alertCount ? `${alertCount} flagged` : "Within threshold"}</span>
          <ChevronDown className="chart-chevron" size={21} aria-hidden="true" />
        </div>
      </summary>
      <div className="insight-chart-body">
        <div className="insight-chart-meta">
          <span className="chart-legend"><i />{config.title.replace(" trend", "")}</span>
          <span className="chart-threshold-legend"><i />{thresholdLabel(config)} appears in red</span>
        </div>
        {values.length ? (
          <>
            <div className="trend-chart-scroll">
              <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${range} ${config.title.toLowerCase()}. ${insight}`}>
                <title>{`${config.title}. ${insight}`}</title>
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                  const value = minimum + (maximum - minimum) * tick;
                  const y = inset.top + chartHeight - tick * chartHeight;
                  return <g key={tick}><line x1={inset.left} x2={width - inset.right} y1={y} y2={y} /><text x={4} y={y + 4}>{value.toLocaleString(undefined, { maximumFractionDigits: config.decimals })}</text></g>;
                })}
                <line className="chart-threshold-line" x1={inset.left} x2={width - inset.right} y1={thresholdY} y2={thresholdY} />
                {segments.map((segment, segmentIndex) => (
                  <polyline key={segmentIndex} points={segment.map((index) => {
                    const value = points[index][config.metric]!;
                    const { x, y } = position(index, value);
                    return `${x},${y}`;
                  }).join(" ")} />
                ))}
                {points.map((point, index) => {
                  const value = point[config.metric];
                  if (value === null) return null;
                  const { x, y } = position(index, value);
                  const alert = isAlertValue(value, config);
                  return <circle className={alert ? "is-alert" : undefined} key={`${point.label}-${index}`} cx={x} cy={y} r={alert ? 5 : 4}><title>{`${point.label}: ${formatMetricValue(value, config)}${alert ? ` — ${thresholdLabel(config)}` : ""}`}</title></circle>;
                })}
                {labelledIndexes.map((index) => {
                  const { x } = position(index, minimum);
                  return <text className="chart-label" key={`${points[index].label}-${index}`} x={x} y={height - 14}>{points[index].label}</text>;
                })}
              </svg>
            </div>
            <p className={alertCount ? "chart-summary has-alert" : "chart-summary"}>{insight} Scroll horizontally on smaller screens and hover or press a point for details.</p>
          </>
        ) : <div className="insight-empty">No {config.metric} data is available for this trend.</div>}
      </div>
    </details>
  );
}

export function InsightsDashboard() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("month");
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(today());
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  useEffect(() => {
    void getDailyRecords().then(setRecords).catch(() => {
      setRecords([]);
      setError(null);
    });
  }, []);

  const years = useMemo(() => Array.from(new Set([...records.map((record) => record.date.slice(0, 4)), String(new Date().getFullYear())])).sort().reverse(), [records]);
  const monthRecords = useMemo(() => records.filter((record) => record.date.startsWith(selectedMonth)), [records, selectedMonth]);
  const monthStats = useMemo(() => {
    const sleeps = monthRecords.map((record) => numeric(record.sleep)).filter((value): value is number => value !== null);
    const weights = monthRecords.map((record) => numeric(record.weight)).filter((value): value is number => value !== null);
    return {
      calories: monthRecords.reduce((sum, record) => sum + caloriesOf(record), 0),
      sleep: sleeps.length ? sleeps.reduce((sum, value) => sum + value, 0) / sleeps.length : null,
      weight: weights.length > 1 ? weights.at(-1)! - weights[0] : null,
      exercise: monthRecords.reduce((sum, record) => sum + record.exercises.length, 0),
      water: monthRecords.filter((record) => record.water).length,
    };
  }, [monthRecords]);

  const points = useMemo<Point[]>(() => {
    const aggregate = (label: string, values: DailyRecord[]): Point => ({
      label,
      calories: values.length ? values.reduce((sum, record) => sum + caloriesOf(record), 0) : null,
      sleep: averageOf(values, (record) => numeric(record.sleep)),
      weight: averageOf(values, (record) => numeric(record.weight)),
    });

    if (range === "month") return monthRecords.map((record) => ({
      label: shortDate(record.date),
      calories: caloriesOf(record),
      sleep: numeric(record.sleep),
      weight: numeric(record.weight),
    }));

    if (range === "week") {
      const anchor = new Date(`${weekAnchor}T12:00:00`);
      const start = new Date(anchor);
      start.setDate(anchor.getDate() - anchor.getDay());
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const value = records.find((record) => record.date === isoDate(date));
        return {
          label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date),
          calories: value ? caloriesOf(value) : null,
          sleep: value ? numeric(value.sleep) : null,
          weight: value ? numeric(value.weight) : null,
        };
      });
    }

    if (range === "year") return Array.from({ length: 12 }, (_, index) => {
      const prefix = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      return aggregate(
        new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(Number(selectedYear), index, 1)),
        records.filter((record) => record.date.startsWith(prefix)),
      );
    });

    return years.slice().reverse().map((year) => aggregate(year, records.filter((record) => record.date.startsWith(year))));
  }, [monthRecords, range, records, selectedYear, weekAnchor, years]);

  return (
    <section className="insights page-sheet glass">
      <div className="section-head"><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Patterns, softly held</p><h1 className="section-title">Your monthly rhythm.</h1><p className="section-subtitle">A clear view of the daily records stored privately in Supabase.</p></div></div>
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="insight-controls">
        <div className="insight-option-field"><span>Trend range</span><div className="insight-choice-group" role="group" aria-label="Trend range">{([{ value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "year", label: "Year" }, { value: "all", label: "All years" }] as const).map((option) => <button type="button" key={option.value} className={range === option.value ? "is-selected" : undefined} aria-pressed={range === option.value} onClick={() => setRange(option.value)}>{option.label}</button>)}</div></div>
        {range === "week" && <label><span>Week of</span><input type="date" value={weekAnchor} onChange={(event) => setWeekAnchor(event.target.value)} /></label>}
        {range === "month" && <div className="insight-option-field"><span>Month</span><MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} label="Trend month and year" /></div>}
        {range === "year" && <div className="insight-option-field"><span>Year</span><div className="insight-choice-group insight-year-choices" role="group" aria-label="Trend year">{years.map((year) => <button type="button" key={year} className={selectedYear === year ? "is-selected" : undefined} aria-pressed={selectedYear === year} onClick={() => setSelectedYear(year)}>{year}</button>)}</div></div>}
      </div>
      <div className="insight-stats">
        <Stat icon={<Utensils size={19} />} label="Monthly calories" value={monthStats.calories ? `${monthStats.calories.toLocaleString()} kcal` : "—"} />
        <Stat icon={<Moon size={19} />} label="Average sleep" value={monthStats.sleep !== null ? `${monthStats.sleep.toFixed(2)} h` : "—"} />
        <Stat icon={<Scale size={19} />} label="Weight change" value={monthStats.weight !== null ? `${monthStats.weight > 0 ? "+" : ""}${monthStats.weight.toFixed(2)} kg` : "—"} />
        <Stat icon={<Activity size={19} />} label="Exercise sessions" value={String(monthStats.exercise)} />
        <Stat icon={<Droplets size={19} />} label="Water days" value={String(monthStats.water)} />
      </div>
      <section className="insight-trends" aria-label="Health trends">
        {metricConfigs.map((config) => <TrendChart key={config.metric} points={points} range={range} config={config} />)}
      </section>
      <section className="insight-table-card">
        <div className="insight-table-head"><div><span className="card-date">Monthly detail</span><h2>{monthName(selectedMonth)}</h2></div><p>{monthRecords.length} recorded day{monthRecords.length === 1 ? "" : "s"}</p></div>
        <div className="insight-table-thresholds" aria-label="Monthly detail alert thresholds">
          <CircleAlert size={15} aria-hidden="true" />
          <span>Calories: &lt;1,800 Excellent · 1,800+ Be Careful · 2,000+ Over · 2,400+ Dangerous · 2,800+ Extremely Dangerous</span>
          <span>Sleep &lt; 6.0 h</span>
          <span>Weight &gt; 60.0 kg</span>
        </div>
        <div className="insight-detail-tabs" role="group" aria-label="Choose monthly detail category">
          {detailTabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className={detailTab === tab.value ? "is-active" : undefined}
              aria-pressed={detailTab === tab.value}
              onClick={() => setDetailTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {monthRecords.length ? (
          <div className="table-scroll" id="monthly-detail-panel">
            <table className={`insight-detail-table detail-tab-${detailTab}`}>
              <thead><tr><th className="detail-date">Date</th><th className="detail-overview">Calories</th><th className="detail-overview">Sleep</th><th className="detail-overview">Weight</th><th className="detail-routine">IF</th><th className="detail-routine detail-exercise">Exercise</th><th className="detail-routine detail-part">Part</th><th className="detail-routine detail-exercise-note">Note</th><th className="detail-habits">Water</th><th className="detail-habits">Poo</th><th className="detail-habits">Caffeine</th><th className="detail-habits">Period</th><th className="detail-habits detail-seed-cycling">Seed Cycling</th><th className="detail-habits detail-bed">BED</th><th className="insight-note-column detail-overview detail-note">Note</th></tr></thead>
              <tbody>{monthRecords.map((record) => (
                <tr key={record.date}>
                  <td className="detail-date"><Link className="insight-date-link" href={`/?date=${record.date}`} aria-label={`View dashboard for ${record.date}`}>{shortDate(record.date)}</Link></td>
                  <td className="detail-overview"><CaloriesTableValue value={caloriesOf(record)} title={record.meals.length ? mealsTooltip(record) : undefined} className={record.meals.length ? "insight-calories-value" : undefined} /></td>
                  <td className="detail-overview"><TableMetricValue value={numeric(record.sleep)} unit="h" threshold={6} alertWhen="below" /></td>
                  <td className="detail-overview"><TableMetricValue value={numeric(record.weight)} unit="kg" threshold={60} alertWhen="above" /></td>
                  <td className="detail-routine">{record.ifHour || "—"}</td>
                  <td className="detail-routine detail-exercise">{record.exercises.length ? <span className="insight-exercise-emojis">{record.exercises.map((exercise) => <span className="insight-exercise-emoji" key={exercise.id} role="img" aria-label={exercise.type} title={exercise.type}>{emojiForExercise(exercise.type)}</span>)}</span> : "—"}</td>
                  <td className="detail-routine detail-part">{record.exercises.length ? <span className="routine-detail-lines">{record.exercises.map((exercise) => <span key={exercise.id}>{exercise.part || "—"}</span>)}</span> : "—"}</td>
                  <td className="detail-routine detail-exercise-note">{record.exercises.length ? <span className="routine-detail-lines">{record.exercises.map((exercise) => <span key={exercise.id} title={exercise.note || undefined}>{exercise.note || "—"}</span>)}</span> : "—"}</td>
                  <td className="detail-habits">{record.water ? <span className="habit-value-icon" role="img" aria-label="Water recorded">💦</span> : "—"}</td>
                  <td className="detail-habits">{record.poo ? <span className="habit-value-icon" role="img" aria-label="Poo recorded">💩</span> : "—"}</td>
                  <td className="detail-habits">{record.caffeine ? <span className="habit-value-icon" role="img" aria-label="Caffeine recorded">☕</span> : "—"}</td>
                  <td className="detail-habits">{record.period ? <span className="habit-value-icon" role="img" aria-label="Period recorded">🩸</span> : "—"}</td>
                  <td className="detail-habits detail-seed-cycling">{seedCyclingIcon(record.seedCycling) ? <span className="seed-cycling-icon" role="img" aria-label={seedCyclingDescription(record.seedCycling)} title={seedCyclingDescription(record.seedCycling)}>{seedCyclingIcon(record.seedCycling)}</span> : "—"}</td>
                  <td className="detail-habits detail-bed">{bedTierIcon(record.bedTier) ? <span className="bed-tier-icon" role="img" aria-label={bedTierDescription(record.bedTier)} title={bedTierDescription(record.bedTier)}>{bedTierIcon(record.bedTier)}</span> : "—"}</td>
                  <td className="insight-note-column detail-overview detail-note" title={record.note || undefined}>{record.note ? preview(record.note) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="insight-empty">No daily data for this month. Add a daily record from Home to start seeing your patterns.</div>}
      </section>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article><span>{icon}</span><p>{label}</p><strong>{value}</strong></article>;
}

function CaloriesTableValue({ value, title, className }: { value: number; title?: string; className?: string }) {
  const { label, tone } = calorieStatus(value);
  const formattedValue = value.toLocaleString();

  return (
    <span
      className={["insight-metric-value", `calorie-status-${tone}`, className ?? ""].filter(Boolean).join(" ")}
      title={title}
      aria-label={`${formattedValue} kcal, ${label}`}
    >
      <span>{formattedValue} kcal</span>
      {tone !== "excellent" && <span className="metric-alert-icon" aria-hidden="true"><CircleAlert size={14} /></span>}
    </span>
  );
}

function TableMetricValue({
  value,
  unit,
  threshold,
  alertWhen,
  decimals = 2,
  title,
  className,
}: {
  value: number | null;
  unit: string;
  threshold: number;
  alertWhen: "above" | "below";
  decimals?: number;
  title?: string;
  className?: string;
}) {
  if (value === null) return <span className="insight-metric-value" aria-label={`No ${unit} data`}>— {unit}</span>;

  const alert = alertWhen === "above" ? value > threshold : value < threshold;
  const formattedValue = value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const thresholdDescription = `${alertWhen === "above" ? "above" : "below"} the ${threshold.toFixed(decimals)} ${unit} threshold`;

  return (
    <span
      className={["insight-metric-value", alert ? "is-alert" : "", className ?? ""].filter(Boolean).join(" ")}
      title={title}
      aria-label={`${formattedValue} ${unit}${alert ? `, ${thresholdDescription}` : ""}`}
    >
      <span>{formattedValue} {unit}</span>
      {alert && <span className="metric-alert-icon" aria-hidden="true"><CircleAlert size={14} /></span>}
    </span>
  );
}
