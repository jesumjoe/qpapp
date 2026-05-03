import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Question } from "@/lib/db";
import { ChevronLeft, BrainCircuit, Check, X, HelpCircle, TrendingUp, Sparkles, Image as ImageIcon, Send, Loader2, Target, ArrowRight, RotateCcw, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { evaluateAnswer, getDetailedAnswer, EvaluationResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import { updateQuestionSrs } from "@/lib/srs";
import { motion, AnimatePresence } from "framer-motion";

type AttemptRecord = { questionId: number; correct: boolean; marksObtained?: number; feedback?: string };

export default function RevisionMode() {
  const { subjectId } = useParams();
  const id = Number(subjectId);

  const subject = useLiveQuery(() => db.subjects.get(id), [id]);

  const [marksFilter, setMarksFilter] = useState<string>("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // AI Evaluation State
  const [userAnswerText, setUserAnswerText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<EvaluationResult | null>(null);
  const [detailedAiAnswer, setDetailedAiAnswer] = useState<string | null>(null);
  const [isLoadingDetailedAnswer, setIsLoadingDetailedAnswer] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoadingSubject = subject === undefined;

  const handleStart = async () => {
    let query = db.questions.where("subjectId").equals(id);
    
    if (marksFilter.trim()) {
      const marks = marksFilter.split(",").map(m => parseInt(m.trim())).filter(m => !isNaN(m));
      if (marks.length > 0) {
        const allQuestions = await query.toArray();
        const filtered = allQuestions.filter(q => marks.includes(q.marks));
        setQuestions(filtered.slice(0, 20));
      } else {
        setQuestions((await query.limit(20).toArray()));
      }
    } else {
      setQuestions((await query.limit(20).toArray()));
    }
    
    setAttempts([]);
    setCurrentIdx(0);
    setShowAnswer(false);
    setCompleted(false);
    setSessionStarted(true);
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setUserAnswerText("");
    setSelectedImage(null);
    setAiEvaluation(null);
    setDetailedAiAnswer(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAiEvaluate = async () => {
    if (!userAnswerText.trim() && !selectedImage) return;
    
    setIsEvaluating(true);
    try {
      const question = questions[currentIdx];
      const result = await evaluateAnswer(question.questionText, question.marks, userAnswerText, selectedImage || undefined);
      setAiEvaluation(result);
      setShowAnswer(true);
    } catch (error) {
      console.error("AI Evaluation failed:", error);
      alert("Failed to evaluate answer with AI.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGetDetailedAnswer = async () => {
    setIsLoadingDetailedAnswer(true);
    try {
      const answer = await getDetailedAnswer(questions[currentIdx].questionText);
      setDetailedAiAnswer(answer);
    } catch (error) {
      console.error("Failed to get detailed answer:", error);
    } finally {
      setIsLoadingDetailedAnswer(false);
    }
  };

  const handleAnswer = async (quality: number) => {
    if (!questions.length) return;
    const question = questions[currentIdx];
    const correct = quality >= 3;
    
    const newAttempt: AttemptRecord = { 
      questionId: question.id!, 
      correct,
      marksObtained: aiEvaluation?.marksObtained,
      feedback: aiEvaluation?.feedback
    };
    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);

    // Update SRS data
    await updateQuestionSrs(question.id!, quality);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((curr) => curr + 1);
      setShowAnswer(false);
      resetQuestionState();
    } else {
      setSubmitting(true);
      try {
        await db.attempts.bulkAdd(newAttempts.map(a => ({
          ...a,
          subjectId: id,
          sessionId,
          timestamp: Date.now()
        })));
        setCompleted(true);
      } catch (error) {
        console.error("Failed to save attempts:", error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const correctCount = attempts.filter((a) => a.correct).length;
  const sessionAccuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

  if (isLoadingSubject) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-12 w-64 bg-muted/30 rounded-2xl"></div>
      </div>
    );
  }

  if (!subject) return <div className="text-center py-20">Subject not found</div>;

  if (!sessionStarted) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass p-12 rounded-[3rem] text-center space-y-10"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-xl shadow-primary/5">
              <BrainCircuit size={40} />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold tracking-tight mb-2">
              Revision Session
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              {subject.name} • Deep Learning Mode
            </p>
          </div>

          <div className="space-y-8 text-left">
            <div className="space-y-3">
              <Label htmlFor="marksFilter" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">
                Focus Filter (Optional)
              </Label>
              <Input
                id="marksFilter"
                placeholder="e.g. 1, 2, 5 marks"
                value={marksFilter}
                onChange={(e) => setMarksFilter(e.target.value)}
                className="h-14 rounded-2xl bg-background/50 border-none px-6 text-lg font-medium focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground ml-1">
                Comma-separated marks. Leave empty for balanced selection.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                size="lg"
                className="h-16 rounded-2xl text-xl font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
                onClick={handleStart}
              >
                Initiate Session
              </Button>
              <Link href={`/subjects/${id}`}>
                <Button variant="ghost" className="h-14 rounded-2xl text-lg font-bold">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-6">
        <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto opacity-50" />
        <p className="text-2xl font-serif font-bold">Archiving Results...</p>
      </div>
    );
  }

  if (completed) {
    const grade =
      sessionAccuracy >= 80
        ? "Exemplary"
        : sessionAccuracy >= 60
        ? "Proficient"
        : sessionAccuracy >= 40
        ? "Developing"
        : "Initial Steps";

    return (
      <div className="max-w-2xl mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass p-12 rounded-[3rem] text-center space-y-12"
        >
          <div className="flex justify-center">
            <div
              className={cn(
                "w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-5xl font-bold shadow-2xl transition-all",
                sessionAccuracy >= 60
                  ? "bg-primary/10 text-primary shadow-primary/10"
                  : "bg-amber-500/10 text-amber-600 shadow-amber-500/10"
              )}
            >
              {sessionAccuracy}%
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl font-serif font-bold tracking-tighter">Session Complete</h2>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm uppercase tracking-widest">
              <Award size={18} />
              <span>{grade} Performance</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
            <div className="p-6 bg-background/50 rounded-3xl">
              <div className="text-3xl font-bold font-serif">{correctCount}</div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Correct</p>
            </div>
            <div className="p-6 bg-background/50 rounded-3xl">
              <div className="text-3xl font-bold font-serif">{attempts.length}</div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Total</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              className="h-16 rounded-2xl text-xl font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
              onClick={() => {
                setSessionStarted(false);
                setCompleted(false);
                setCurrentIdx(0);
                setShowAnswer(false);
                setAttempts([]);
              }}
            >
              Start New Session
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <Link href={`/subjects/${id}/performance`}>
                <Button variant="outline" size="lg" className="w-full h-14 rounded-2xl font-bold">
                  <TrendingUp className="mr-2 h-5 w-5" /> Analytics
                </Button>
              </Link>
              <Link href={`/subjects/${id}`}>
                <Button variant="ghost" size="lg" className="w-full h-14 rounded-2xl font-bold">
                  Return
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32">
      <header className="flex items-center justify-between">
        <Link
          href={`/subjects/${id}`}
          className="group inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Exit Session
        </Link>
        
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold text-primary uppercase tracking-[0.3em] mb-2">Progress</div>
          <div className="flex items-center gap-4">
            <div className="h-2 w-48 bg-primary/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] transition-all duration-500"
              />
            </div>
            <span className="text-sm font-bold font-serif">{currentIdx + 1} / {questions.length}</span>
          </div>
        </div>

        <div className="w-24" />
      </header>

      <main className="space-y-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-12"
          >
            {/* Question Section */}
            <div className="relative">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4">
                <div className="bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-xl shadow-2xl shadow-primary/20 transform rotate-3 flex items-center gap-2">
                  <Target size={16} />
                  {question.marks} Marks
                </div>
              </div>
              <div className="bento-card p-10 md:p-16 relative overflow-hidden">
                <div className="absolute -left-4 -top-4 opacity-[0.02] pointer-events-none">
                  <BrainCircuit size={160} />
                </div>
                <h3 className="text-xs font-bold text-primary/60 uppercase tracking-[0.3em] mb-6">
                  Inquiry
                </h3>
                <p className="text-3xl md:text-4xl text-foreground font-serif font-bold leading-tight">
                  {question.questionText}
                </p>
              </div>
            </div>

            {/* Interaction Area */}
            <div className="space-y-8">
              {!showAnswer ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="glass p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Sparkles className="w-5 h-5 text-primary" /> Active Recall
                      </h4>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                        AI will evaluate your response
                      </div>
                    </div>
                    <Textarea 
                      placeholder="Synthesize your answer here..."
                      className="min-h-[200px] bg-background/50 border-none rounded-2xl p-6 text-lg font-medium focus-visible:ring-primary/20 transition-all resize-none"
                      value={userAnswerText}
                      onChange={(e) => setUserAnswerText(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center gap-3">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                        />
                        <Button 
                          variant="outline" 
                          className={cn(
                            "h-12 rounded-xl px-6 font-bold transition-all",
                            selectedImage ? "border-primary bg-primary/5 text-primary" : "border-primary/10 hover:bg-primary/5"
                          )}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="w-5 h-5 mr-2" />
                          {selectedImage ? "Visual Proof Attached" : "Add Hand-drawn Solution"}
                        </Button>
                        {selectedImage && (
                          <Button variant="ghost" size="icon" onClick={() => setSelectedImage(null)} className="rounded-full">
                            <X size={18} />
                          </Button>
                        )}
                      </div>
                      <Button 
                        size="lg"
                        onClick={handleAiEvaluate} 
                        disabled={isEvaluating || (!userAnswerText.trim() && !selectedImage)}
                        className="h-14 px-10 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary"
                      >
                        {isEvaluating ? (
                          <>
                            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-3" />
                            Evaluate Recall
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button variant="ghost" onClick={() => setShowAnswer(true)} className="text-muted-foreground font-bold hover:text-primary hover:bg-primary/5 transition-all">
                      Skip to Solution <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* AI Evaluation Result */}
                  {aiEvaluation && (
                    <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-10 md:p-12 shadow-inner relative overflow-hidden group">
                      <div className="absolute right-0 top-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Award size={120} />
                      </div>
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold font-serif text-primary flex items-center">
                          <Sparkles className="mr-3 w-6 h-6" /> AI Feedback
                        </h3>
                        <div className="px-6 py-2 bg-primary/10 rounded-2xl text-primary font-bold text-2xl font-serif">
                          {aiEvaluation.marksObtained} <span className="text-sm opacity-50 uppercase tracking-widest font-sans ml-1">/ {question.marks}</span>
                        </div>
                      </div>
                      <p className="text-xl font-medium leading-relaxed italic text-foreground/80">"{aiEvaluation.feedback}"</p>
                    </div>
                  )}

                  {/* Standard Answer */}
                  <div className="bento-card bg-background/50 border-primary/5 p-10 md:p-12">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-[0.4em] mb-8 flex items-center">
                      <div className="w-2 h-2 mr-3 bg-primary rounded-full animate-ping" />
                      Canonical Solution
                    </h3>
                    <p className="text-2xl text-foreground font-medium leading-relaxed whitespace-pre-wrap">{question.answerText}</p>
                  </div>

                  {/* Detailed AI Answer Toggle */}
                  <div className="space-y-6">
                    {!detailedAiAnswer ? (
                      <Button 
                        variant="outline" 
                        className="w-full glass py-12 h-auto flex flex-col gap-4 group transition-all hover:border-primary/40 hover:scale-[1.01] rounded-[2.5rem]"
                        onClick={handleGetDetailedAnswer}
                        disabled={isLoadingDetailedAnswer}
                      >
                        {isLoadingDetailedAnswer ? (
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        ) : (
                          <>
                            <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                              <Sparkles size={32} />
                            </div>
                            <div className="space-y-2">
                              <span className="text-2xl font-serif font-bold text-foreground">Explain the Depth?</span>
                              <p className="text-sm text-muted-foreground font-medium">AI will generate a comprehensive pedagogical breakdown of the concept.</p>
                            </div>
                          </>
                        )}
                      </Button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass bg-primary/5 p-10 md:p-12 rounded-[2.5rem] border-primary/10"
                      >
                        <h3 className="text-xs font-bold text-primary uppercase tracking-[0.4em] mb-8">Pedagogical Insight</h3>
                        <div className="prose prose-lg prose-primary max-w-none text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                          {detailedAiAnswer}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Control Bar */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-20">
        <div className="glass p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-primary/10">
          <AnimatePresence mode="wait">
            {showAnswer ? (
              <motion.div 
                key="controls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">
                  Assess your cognitive recall
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Again", quality: 0, color: "hover:bg-destructive/10 hover:text-destructive", icon: RotateCcw },
                    { label: "Hard", quality: 3, color: "hover:bg-amber-500/10 hover:text-amber-600", icon: HelpCircle },
                    { label: "Good", quality: 4, color: "hover:bg-primary/10 hover:text-primary", icon: Check },
                    { label: "Mastered", quality: 5, color: "hover:bg-secondary/10 hover:text-secondary", icon: Sparkles },
                  ].map((btn) => (
                    <Button
                      key={btn.label}
                      variant="ghost"
                      className={cn(
                        "h-16 flex flex-col gap-1 rounded-2xl font-bold text-xs transition-all",
                        btn.color
                      )}
                      onClick={() => handleAnswer(btn.quality)}
                    >
                      <btn.icon size={20} />
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="navigation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between gap-4"
              >
                <Button
                  variant="ghost"
                  disabled={currentIdx === 0}
                  className="h-14 px-8 rounded-2xl font-bold"
                  onClick={() => {
                    setCurrentIdx((curr) => curr - 1);
                    setShowAnswer(false);
                    resetQuestionState();
                  }}
                >
                  <ChevronLeft size={20} className="mr-2" /> Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-14 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 bg-primary"
                  onClick={() => setShowAnswer(true)}
                >
                  Reveal Solution
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}

