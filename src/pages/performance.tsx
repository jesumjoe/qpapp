import { Link, useParams } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
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
import { ChevronLeft, TrendingUp, Target, BookOpen, Award, BrainCircuit, Sparkles, Loader2, Calendar, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { analyzePerformance } from "@/lib/gemini";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

export default function PerformancePage() {
  const { subjectId } = useParams();
  const id = Number(subjectId);

  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  
  // AI State
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const performance = useLiveQuery(async () => {
    const attempts = await db.attempts.where("subjectId").equals(id).toArray();
    const questions = await db.questions.where("subjectId").equals(id).toArray();
    if (attempts.length === 0) return null;

    const sessions = new Map<string, { date: number; correct: number; total: number }>();
    const questionsMap = new Map(questions.map(q => [q.id, q]));

    attempts.forEach(a => {
      const s = sessions.get(a.sessionId) || { date: a.timestamp, correct: 0, total: 0 };
      s.total++;
      if (a.correct) s.correct++;
      sessions.set(a.sessionId, s);
    });

    const sessionList = Array.from(sessions.entries()).map(([sessionId, s]) => ({
      sessionId,
      date: s.date,
      accuracy: s.correct / s.total,
      correctAnswers: s.correct,
      totalQuestions: s.total
    })).sort((a, b) => b.date - a.date);

    const accuracyByMarks = new Map<number, { correct: number; total: number }>();
    attempts.forEach(a => {
      const q = questionsMap.get(a.questionId);
      if (q) {
        const stats = accuracyByMarks.get(q.marks) || { correct: 0, total: 0 };
        stats.total++;
        if (a.correct) stats.correct++;
        accuracyByMarks.set(q.marks, stats);
      }
    });

    const totalCorrect = attempts.filter(a => a.correct).length;

    return {
      totalAttempts: attempts.length,
      totalSessions: sessions.size,
      overallAccuracy: totalCorrect / attempts.length,
      recentSessions: sessionList.slice(0, 5),
      accuracyTrend: [...sessionList].reverse().map(s => ({ accuracy: s.accuracy, date: s.date })),
      accuracyByMarks: Array.from(accuracyByMarks.entries()).map(([marks, stats]) => ({
        marks,
        accuracy: stats.correct / stats.total,
        totalAttempts: stats.total
      })).sort((a, b) => a.marks - b.marks),
      rawAttempts: attempts,
      rawQuestions: questions
    };
  }, [id]);

  const handleAnalyze = async () => {
    if (!performance || !subject) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePerformance(
        subject.name,
        performance.rawAttempts,
        performance.rawQuestions
      );
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze performance.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isLoadingSubject = subject === undefined;
  const isLoadingPerf = performance === undefined && subject !== undefined;

  if (isLoadingSubject || isLoadingPerf) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-12 w-64 bg-muted/30 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!subject) return <div className="text-center py-20">Subject not found</div>;

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

  return (
    <div className="space-y-10">
      <header className="space-y-6">
        <Link href={`/subjects/${id}`} className="group inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back to {subject.name}
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <TrendingUp size={28} />
              </div>
              <h1 className="text-5xl font-bold font-serif tracking-tight">Analytics</h1>
            </div>
            <p className="text-muted-foreground text-lg font-medium ml-1">
              Deep insights into your academic retention.
            </p>
          </motion.div>
          
          <Link href={`/subjects/${id}/revision`}>
            <Button size="lg" className="h-14 px-8 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20">
              <BrainCircuit className="mr-2 h-6 w-6" /> Start Session
            </Button>
          </Link>
        </div>
      </header>

      {!hasData ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="p-20 text-center glass rounded-[3rem] border-dashed border-primary/20"
        >
          <div className="w-24 h-24 bg-primary/5 text-primary/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <TrendingUp size={48} />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4">Initial Insight Pending</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-10 font-medium text-lg">
            Complete a revision session to start tracking your cognitive accuracy and progress.
          </p>
          <Link href={`/subjects/${id}/revision`}>
            <Button size="lg" className="h-14 rounded-2xl px-10 font-bold">Start First Session</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* AI Analysis Bento */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bento-card border-primary/10 bg-gradient-to-br from-card to-primary/5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-lg shadow-primary/5">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold">AI Weakness Synthesis</h2>
                  <p className="text-muted-foreground font-medium">Personalized retention strategy by Gemini.</p>
                </div>
              </div>
              {!analysis && (
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="h-12 px-6 rounded-xl font-bold">
                  {isAnalyzing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Synthesizing...</>
                  ) : (
                    <><TrendingUp className="mr-2 h-5 w-5" /> Analyze Retention</>
                  )}
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-6"
                >
                  <div className="glass bg-background/50 border-primary/10 p-8 rounded-[2rem]">
                    <div className="prose prose-lg prose-primary max-w-none text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                      {analysis}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)} className="font-bold text-primary">
                      Recalculate Insight
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<Target size={22} />}
              label="Accuracy"
              value={`${overallPct}%`}
              valueColor={overallPct >= 80 ? "oklch(65% 0.15 150)" : overallPct >= 60 ? "oklch(65% 0.15 80)" : "oklch(60% 0.2 25)"}
              sub={overallPct >= 80 ? "Exemplary" : overallPct >= 60 ? "Proficient" : "Developing"}
            />
            <StatCard
              icon={<BookOpen size={22} />}
              label="Attempts"
              value={performance!.totalAttempts.toString()}
              sub="Questions Mastered"
            />
            <StatCard
              icon={<Award size={22} />}
              label="Sessions"
              value={performance!.totalSessions.toString()}
              sub={`Avg ${performance!.totalSessions > 0 ? Math.round(performance!.totalAttempts / performance!.totalSessions) : 0} items`}
            />
            <StatCard
              icon={<Calendar size={22} />}
              label="Latest"
              value={
                performance!.recentSessions.length > 0
                  ? `${Math.round(performance!.recentSessions[0].accuracy * 100)}%`
                  : "—"
              }
              sub={
                performance!.recentSessions.length > 0
                  ? format(new Date(performance!.recentSessions[0].date), "MMM d")
                  : "No data"
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {trendData.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 bento-card p-10"
              >
                <h2 className="text-2xl font-serif font-bold mb-10 flex items-center gap-2">
                  <TrendingUp className="text-primary" size={24} />
                  Retention Curve
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="session"
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "1rem",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="var(--primary)"
                      strokeWidth={4}
                      dot={{ fill: "var(--primary)", r: 6, strokeWidth: 0 }}
                      activeDot={{ r: 8, strokeWidth: 4, stroke: "var(--background)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {marksData.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bento-card p-10"
              >
                <h2 className="text-2xl font-serif font-bold mb-10 flex items-center gap-2">
                  <LayoutGrid className="text-primary" size={24} />
                  By Value
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marksData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="marks"
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "1rem",
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                      {marksData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill="var(--primary)"
                          fillOpacity={0.4 + (entry.accuracy / 100) * 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        </div>
      )}
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
    <motion.div 
      variants={itemVariants}
      className="bento-card p-8 group"
    >
      <div className="flex items-center gap-3 text-primary/60 mb-6 font-bold uppercase tracking-widest text-[10px]">
        <div className="p-2 bg-primary/5 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
        {label}
      </div>
      <p className="text-4xl font-bold font-serif leading-none" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-4 font-bold">{sub}</p>}
    </motion.div>
  );
}
