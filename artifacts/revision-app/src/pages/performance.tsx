import { Link, useParams } from "wouter";
import {
  useGetSubject,
  useGetSubjectPerformance,
  getGetSubjectPerformanceQueryKey,
} from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChevronLeft, TrendingUp, Target, BookOpen, Award, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function PerformancePage() {
  const { subjectId } = useParams();
  const id = Number(subjectId);

  const { data: subject, isLoading: isLoadingSubject } = useGetSubject(id, {
    query: { enabled: !!id, queryKey: [`/api/subjects/${id}`] },
  });

  const { data: performance, isLoading: isLoadingPerf } = useGetSubjectPerformance(id, {
    query: { enabled: !!id, queryKey: getGetSubjectPerformanceQueryKey(id) },
  });

  if (isLoadingSubject || isLoadingPerf) {
    return (
      <div className="min-h-screen py-12 px-4 flex flex-col items-center">
        <div className="w-full max-w-5xl space-y-6">
          <div className="animate-pulse h-10 w-48 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!subject) return <div className="p-8 text-center">Subject not found</div>;

  const hasData = performance && performance.totalAttempts > 0;

  const trendData = performance?.accuracyTrend.map((point, i) => ({
    session: i + 1,
    accuracy: Math.round(point.accuracy * 100),
    date: format(new Date(point.date), "MMM d"),
  })) ?? [];

  const marksData = performance?.accuracyByMarks.map((m) => ({
    marks: `${m.marks}M`,
    accuracy: Math.round(m.accuracy * 100),
    total: m.totalAttempts,
  })) ?? [];

  const overallPct = Math.round((performance?.overallAccuracy ?? 0) * 100);

  const getAccuracyColor = (pct: number) => {
    if (pct >= 80) return "hsl(142, 60%, 40%)";
    if (pct >= 60) return "hsl(38, 90%, 50%)";
    return "hsl(345, 60%, 40%)";
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/subjects/${id}`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" /> Back to {subject.name}
          </Link>
        </div>

        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground font-serif tracking-tight mb-1">
              Performance
            </h1>
            <p className="text-muted-foreground">
              {subject.name}
              {subject.code ? ` · ${subject.code}` : ""}
            </p>
          </div>
          <Link href={`/subjects/${id}/revision`}>
            <Button className="shadow-sm">
              <BrainCircuit className="mr-2 h-4 w-4" /> Start Revision Session
            </Button>
          </Link>
        </header>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
              <TrendingUp size={36} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-3">
              No data yet
            </h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Complete a revision session to start tracking your accuracy and progress over time.
            </p>
            <Link href={`/subjects/${id}/revision`}>
              <Button size="lg">Start your first session</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Target size={22} />}
                label="Overall Accuracy"
                value={`${overallPct}%`}
                valueColor={getAccuracyColor(overallPct)}
                sub={overallPct >= 80 ? "Excellent" : overallPct >= 60 ? "Good" : "Keep going"}
              />
              <StatCard
                icon={<BookOpen size={22} />}
                label="Total Attempts"
                value={performance.totalAttempts.toString()}
                sub="questions answered"
              />
              <StatCard
                icon={<Award size={22} />}
                label="Sessions Completed"
                value={performance.totalSessions.toString()}
                sub={`avg ${performance.totalSessions > 0 ? Math.round(performance.totalAttempts / performance.totalSessions) : 0} questions each`}
              />
              <StatCard
                icon={<TrendingUp size={22} />}
                label="Latest Session"
                value={
                  performance.recentSessions.length > 0
                    ? `${Math.round(performance.recentSessions[0].accuracy * 100)}%`
                    : "—"
                }
                sub={
                  performance.recentSessions.length > 0
                    ? format(new Date(performance.recentSessions[0].date), "MMM d, yyyy")
                    : "No sessions yet"
                }
              />
            </div>

            {trendData.length > 1 && (
              <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-serif font-bold text-foreground mb-6">Accuracy Trend</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,15%,90%)" />
                    <XAxis
                      dataKey="session"
                      tick={{ fontSize: 12, fill: "hsl(220,25%,50%)" }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Session", position: "insideBottom", offset: -2, fontSize: 12, fill: "hsl(220,25%,50%)" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fill: "hsl(220,25%,50%)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Accuracy"]}
                      labelFormatter={(label) => {
                        const point = trendData[Number(label) - 1];
                        return point ? `Session ${label} · ${point.date}` : `Session ${label}`;
                      }}
                      contentStyle={{
                        background: "white",
                        border: "1px solid hsl(45,15%,90%)",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="hsl(345,60%,40%)"
                      strokeWidth={2.5}
                      dot={{ fill: "hsl(345,60%,40%)", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {marksData.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-serif font-bold text-foreground mb-6">
                  Accuracy by Mark Value
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={marksData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,15%,90%)" vertical={false} />
                    <XAxis
                      dataKey="marks"
                      tick={{ fontSize: 12, fill: "hsl(220,25%,50%)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fill: "hsl(220,25%,50%)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: number, _: string, props: { payload?: { total: number } }) => [
                        `${value}% (${props.payload?.total ?? 0} attempts)`,
                        "Accuracy",
                      ]}
                      contentStyle={{
                        background: "white",
                        border: "1px solid hsl(45,15%,90%)",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                      {marksData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={getAccuracyColor(entry.accuracy)}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Shows where you need the most work — lower bars mean higher-priority revision areas.
                </p>
              </div>
            )}

            {performance.recentSessions.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-serif font-bold text-foreground mb-4">Recent Sessions</h2>
                <div className="divide-y divide-border">
                  {performance.recentSessions.map((session, i) => {
                    const pct = Math.round(session.accuracy * 100);
                    return (
                      <div key={session.sessionId} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                          <div
                            className="text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background: `${getAccuracyColor(pct)}20`,
                              color: getAccuracyColor(pct),
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {format(new Date(session.date), "EEEE, MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {session.correctAnswers} / {session.totalQuestions} correct
                            </p>
                          </div>
                        </div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: getAccuracyColor(pct) }}
                        >
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold font-serif" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
