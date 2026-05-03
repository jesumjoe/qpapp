import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Question } from "@/lib/db";
import { ChevronLeft, BrainCircuit, Check, X, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateAnswer, getDetailedAnswer, EvaluationResult } from "@/lib/gemini";
import { updateQuestionSrs } from "@/lib/srs";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

export default function DailyReview() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // AI State
  const [userAnswerText, setUserAnswerText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<EvaluationResult | null>(null);
  const [detailedAiAnswer, setDetailedAiAnswer] = useState<string | null>(null);

  const dueQuestions = useLiveQuery(() => 
    db.questions.where("nextReviewDate").below(Date.now()).limit(15).toArray()
  );

  useEffect(() => {
    if (dueQuestions && questions.length === 0) {
      setQuestions(dueQuestions);
    }
  }, [dueQuestions]);

  const resetQuestionState = () => {
    setUserAnswerText("");
    setAiEvaluation(null);
    setDetailedAiAnswer(null);
    setShowAnswer(false);
  };

  const handleAiEvaluate = async () => {
    if (!userAnswerText.trim()) return;
    setIsEvaluating(true);
    try {
      const q = questions[currentIdx];
      const result = await evaluateAnswer(q.questionText, q.marks, userAnswerText);
      setAiEvaluation(result);
      setShowAnswer(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAnswer = async (quality: number) => {
    const question = questions[currentIdx];
    await updateQuestionSrs(question.id!, quality);
    
    setAttempts([...attempts, { questionId: question.id, correct: quality >= 3 }]);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      resetQuestionState();
    } else {
      setCompleted(true);
    }
  };

  if (!dueQuestions) return <div className="p-8 animate-pulse bg-muted h-screen"></div>;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-serif font-bold mb-4">All caught up!</h1>
        <p className="text-muted-foreground mb-8">No questions due for review right now.</p>
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center text-4xl mb-6">
          <Check size={40} />
        </div>
        <h1 className="text-3xl font-serif font-bold mb-2">Review Session Complete</h1>
        <p className="text-muted-foreground mb-8">You've strengthened your memory for {questions.length} questions.</p>
        <Link href="/">
          <Button size="lg">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const question = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-40">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 h-16 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} className="mr-1" /> End Review
        </Link>
        <div className="text-sm font-medium">Daily Review</div>
        <div className="text-sm font-medium text-muted-foreground">
          {currentIdx + 1} / {questions.length}
        </div>
      </header>

      <div className="h-1 bg-muted w-full">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 max-w-4xl mx-auto w-full gap-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, x: 20, filter: "blur(5px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, filter: "blur(5px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full flex flex-col items-center gap-8"
          >
            <div className="w-full max-w-3xl">
              <div className="bg-card border border-card-border rounded-2xl p-6 md:p-10 shadow-sm relative">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4 md:translate-x-1/2">
                  <div className="bg-secondary text-secondary-foreground font-bold text-lg px-4 py-2 rounded-xl shadow-md">
                    {question.marks} Marks
                  </div>
                </div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Question</h3>
                <p className="text-xl md:text-2xl text-foreground font-medium whitespace-pre-wrap">{question.questionText}</p>
              </div>
            </div>

            {!showAnswer ? (
              <div className="w-full max-w-3xl space-y-4">
                <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Practice Answer
                  </h4>
                  <Textarea 
                    placeholder="Type your answer here..."
                    className="min-h-[120px] bg-background"
                    value={userAnswerText}
                    onChange={(e) => setUserAnswerText(e.target.value)}
                  />
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4">
                    <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowAnswer(true)}>Skip to Answer</Button>
                    <Button className="w-full sm:w-auto" onClick={handleAiEvaluate} disabled={isEvaluating || !userAnswerText.trim()}>
                      {isEvaluating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Evaluate with AI
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-6 animate-in fade-in zoom-in-95 duration-500">
                 {aiEvaluation && (
                  <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-secondary-foreground flex items-center">
                        <Sparkles className="mr-2 w-4 h-4" /> AI Evaluation
                      </h3>
                      <div className="text-xl font-bold text-secondary">{aiEvaluation.marksObtained} / {question.marks}</div>
                    </div>
                    <p className="italic">"{aiEvaluation.feedback}"</p>
                  </div>
                )}
                <div className="bg-muted/30 border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Reference Answer</h3>
                  <p className="text-lg">{question.answerText}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 shadow-lg z-50">
        <div className="max-w-4xl mx-auto">
          {showAnswer ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <Button variant="outline" className="w-full text-destructive" onClick={() => handleAnswer(0)}>Again</Button>
              <Button variant="outline" className="w-full text-amber-600" onClick={() => handleAnswer(3)}>Hard</Button>
              <Button variant="outline" className="w-full text-primary" onClick={() => handleAnswer(4)}>Good</Button>
              <Button className="w-full bg-secondary text-secondary-foreground" onClick={() => handleAnswer(5)}>Easy</Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button size="lg" className="w-full max-w-xs" onClick={() => setShowAnswer(true)}>Show Answer</Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function Send({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
  );
}
