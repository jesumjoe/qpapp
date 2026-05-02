import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetSubject,
  useGetRevisionQuestions,
  useRecordAttempts,
  getGetRevisionQuestionsQueryKey,
} from "@workspace/api-client-react";
import { ChevronLeft, BrainCircuit, Check, X, SkipForward, HelpCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type AttemptRecord = { questionId: number; correct: boolean };

export default function RevisionMode() {
  const { subjectId } = useParams();
  const id = Number(subjectId);

  const { data: subject, isLoading: isLoadingSubject } = useGetSubject(id, {
    query: { enabled: !!id, queryKey: [`/api/subjects/${id}`] },
  });

  const [marksFilter, setMarksFilter] = useState<string>("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);

  const recordAttempts = useRecordAttempts();

  const { data: questions, isLoading: isLoadingQuestions, refetch } = useGetRevisionQuestions(
    { subjectId: id, count: 20, marksFilter: marksFilter || undefined },
    { query: { enabled: false, queryKey: getGetRevisionQuestionsQueryKey({ subjectId: id, count: 20, marksFilter }) } }
  );

  const handleStart = () => {
    refetch().then(() => {
      setAttempts([]);
      setCurrentIdx(0);
      setShowAnswer(false);
      setCompleted(false);
      setSessionStarted(true);
    });
  };

  const handleAnswer = (correct: boolean) => {
    if (!questions) return;
    const question = questions[currentIdx];
    const newAttempts = [...attempts, { questionId: question.id, correct }];
    setAttempts(newAttempts);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((curr) => curr + 1);
      setShowAnswer(false);
    } else {
      setSubmitting(true);
      recordAttempts.mutate(
        { subjectId: id, data: { sessionId, attempts: newAttempts } },
        {
          onSettled: () => {
            setSubmitting(false);
            setCompleted(true);
          },
        }
      );
    }
  };

  const correctCount = attempts.filter((a) => a.correct).length;
  const sessionAccuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

  if (isLoadingSubject) {
    return (
      <div className="min-h-screen p-8">
        <div className="animate-pulse h-12 w-64 bg-muted rounded"></div>
      </div>
    );
  }

  if (!subject) return <div>Subject not found</div>;

  if (!sessionStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-card-border p-8 rounded-2xl shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <BrainCircuit size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-serif font-bold text-center text-foreground mb-2">
            Revision Session
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {subject.name} • up to 20 questions
          </p>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="marksFilter" className="text-sm font-medium">
                Filter by marks (Optional)
              </Label>
              <Input
                id="marksFilter"
                placeholder="e.g. 1,2,5"
                value={marksFilter}
                onChange={(e) => setMarksFilter(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of marks to focus on.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full text-lg shadow-sm"
                onClick={handleStart}
                disabled={isLoadingQuestions}
              >
                {isLoadingQuestions ? "Loading questions..." : "Start Session"}
              </Button>
              <Link href={`/subjects/${id}`}>
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-card-border p-8 rounded-2xl shadow-lg text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Saving your results...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    const grade =
      sessionAccuracy >= 80
        ? "Excellent"
        : sessionAccuracy >= 60
        ? "Good"
        : sessionAccuracy >= 40
        ? "Keep practising"
        : "Needs work";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-card-border p-8 rounded-2xl shadow-lg text-center">
          <div className="flex justify-center mb-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold ${
                sessionAccuracy >= 60
                  ? "bg-secondary/10 text-secondary"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {sessionAccuracy}%
            </div>
          </div>
          <h2 className="text-3xl font-serif font-bold text-foreground mb-2">Session Complete</h2>
          <p className="text-primary font-semibold mb-1">{grade}</p>
          <p className="text-muted-foreground mb-2">
            {correctCount} correct out of {attempts.length} questions
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Results saved to your performance tracker.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => {
                setSessionStarted(false);
                setCompleted(false);
                setCurrentIdx(0);
                setShowAnswer(false);
                setAttempts([]);
              }}
            >
              Start Another Session
            </Button>
            <Link href={`/subjects/${id}/performance`}>
              <Button variant="outline" size="lg" className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" /> View Performance
              </Button>
            </Link>
            <Link href={`/subjects/${id}`}>
              <Button variant="ghost" size="lg" className="w-full">
                Return to Subject
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-card-border p-8 rounded-2xl shadow-lg text-center">
          <HelpCircle size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">No Questions Found</h2>
          <p className="text-muted-foreground mb-6">
            No questions match your criteria. Try removing the marks filter.
          </p>
          <Button onClick={() => setSessionStarted(false)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 h-16 flex items-center justify-between">
        <Link
          href={`/subjects/${id}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} className="mr-1" /> End Session
        </Link>
        <div className="text-sm font-medium text-foreground">{subject.name}</div>
        <div className="text-sm font-medium text-muted-foreground">
          {currentIdx + 1} / {questions.length}
        </div>
      </header>

      <div className="h-1 bg-muted w-full">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="w-full flex-1 flex flex-col gap-6 max-w-3xl pt-8 pb-40">
          <div className="bg-card border border-card-border rounded-2xl p-6 md:p-10 shadow-sm relative">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4 md:translate-x-1/2">
              <div className="bg-secondary text-secondary-foreground font-bold text-lg px-4 py-2 rounded-xl shadow-md transform rotate-3">
                {question.marks} Mark{question.marks !== 1 ? "s" : ""}
              </div>
            </div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Question
            </h3>
            <p className="text-xl md:text-2xl text-foreground font-medium whitespace-pre-wrap">
              {question.questionText}
            </p>
          </div>

          {showAnswer ? (
            <div className="bg-muted/30 border border-border rounded-2xl p-6 md:p-10 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center">
                <Check size={16} className="mr-2" /> Answer
              </h3>
              <p className="text-lg text-foreground whitespace-pre-wrap">{question.answerText}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <Button
                size="lg"
                variant="outline"
                className="h-16 px-12 text-lg border-2 border-dashed hover:border-solid bg-transparent"
                onClick={() => setShowAnswer(true)}
              >
                Reveal Answer
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {showAnswer ? (
            <>
              <p className="text-center text-sm text-muted-foreground font-medium">
                How did you do?
              </p>
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                  onClick={() => handleAnswer(false)}
                >
                  <X size={18} className="mr-2" /> Got it Wrong
                </Button>
                <Button
                  size="lg"
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={() => handleAnswer(true)}
                >
                  <Check size={18} className="mr-2" /> Got it Right
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={currentIdx === 0}
                onClick={() => {
                  setCurrentIdx((curr) => curr - 1);
                  setShowAnswer(false);
                }}
              >
                <ChevronLeft size={16} className="mr-2" /> Previous
              </Button>
              <Button
                size="lg"
                className="w-1/2 max-w-xs shadow-md"
                onClick={() => setShowAnswer(true)}
              >
                Reveal Answer
              </Button>
              <div className="w-24" />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
