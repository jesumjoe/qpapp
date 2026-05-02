import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetSubject,
  useGetRevisionQuestions,
  getGetRevisionQuestionsQueryKey
} from "@workspace/api-client-react";
import { ChevronLeft, BrainCircuit, Check, X, SkipForward, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function RevisionMode() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  
  const { data: subject, isLoading: isLoadingSubject } = useGetSubject(id, { query: { enabled: !!id, queryKey: [`/api/subjects/${id}`] } });
  
  const [marksFilter, setMarksFilter] = useState<string>("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);

  const { data: questions, isLoading: isLoadingQuestions, refetch } = useGetRevisionQuestions(
    { subjectId: id, count: 20, marksFilter: marksFilter || undefined },
    { query: { enabled: false, queryKey: getGetRevisionQuestionsQueryKey({ subjectId: id, count: 20, marksFilter }) } }
  );

  const handleStart = () => {
    refetch().then(() => setSessionStarted(true));
  };

  const handleNext = () => {
    if (questions && currentIdx < questions.length - 1) {
      setCurrentIdx(curr => curr + 1);
      setShowAnswer(false);
    } else {
      setCompleted(true);
    }
  };

  if (isLoadingSubject) {
    return <div className="min-h-screen p-8"><div className="animate-pulse h-12 w-64 bg-muted rounded"></div></div>;
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
            {subject.name} • 20 random questions
          </p>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="marksFilter" className="text-sm font-medium">Filter by marks (Optional)</Label>
              <Input
                id="marksFilter"
                placeholder="e.g. 1,2,5"
                value={marksFilter}
                onChange={(e) => setMarksFilter(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Comma separated list of marks to focus on.</p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button size="lg" className="w-full text-lg shadow-sm" onClick={handleStart} disabled={isLoadingQuestions}>
                {isLoadingQuestions ? "Loading questions..." : "Start Session"}
              </Button>
              <Link href={`/subjects/${id}`}>
                <Button variant="ghost" className="w-full">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-card-border p-8 rounded-2xl shadow-lg text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
              <Check size={40} strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-3xl font-serif font-bold text-foreground mb-3">Session Complete</h2>
          <p className="text-muted-foreground mb-8">
            You've reviewed {questions?.length} questions for {subject.name}. Great job staying consistent!
          </p>
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => { setSessionStarted(false); setCompleted(false); setCurrentIdx(0); setShowAnswer(false); }}>
              Start Another Session
            </Button>
            <Link href={`/subjects/${id}`}>
              <Button variant="outline" size="lg" className="w-full">Return to Subject</Button>
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
          <p className="text-muted-foreground mb-6">We couldn't find any questions matching your criteria.</p>
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
        <Link href={`/subjects/${id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} className="mr-1" /> End Session
        </Link>
        <div className="text-sm font-medium text-foreground">
          {subject.name}
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {currentIdx + 1} / {questions.length}
        </div>
      </header>

      <div className="h-1 bg-muted w-full">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="w-full flex-1 flex flex-col gap-6 max-w-3xl pt-8 pb-32">
          {/* Question Card */}
          <div className="bg-card border border-card-border rounded-2xl p-6 md:p-10 shadow-sm relative">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4 md:translate-x-1/2">
               <div className="bg-secondary text-secondary-foreground font-bold text-lg px-4 py-2 rounded-xl shadow-md transform rotate-3">
                 {question.marks} Mark{question.marks !== 1 ? 's' : ''}
               </div>
            </div>
            
            <div className="prose max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-lg">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Question</h3>
              <p className="text-xl md:text-2xl text-foreground font-medium whitespace-pre-wrap">{question.questionText}</p>
            </div>
          </div>

          {/* Answer Area */}
          {showAnswer ? (
            <div className="bg-muted/30 border border-border rounded-2xl p-6 md:p-10 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="prose max-w-none dark:prose-invert">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center"><Check size={16} className="mr-2" /> Answer</h3>
                <p className="text-lg text-foreground whitespace-pre-wrap">{question.answerText}</p>
              </div>
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

      {/* Footer Controls */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" disabled={currentIdx === 0} onClick={() => { setCurrentIdx(curr => curr - 1); setShowAnswer(false); }}>
            <ChevronLeft size={16} className="mr-2" /> Previous
          </Button>
          
          <Button 
            size="lg" 
            className="w-1/2 max-w-xs shadow-md"
            onClick={showAnswer ? handleNext : () => setShowAnswer(true)}
          >
            {showAnswer ? (
              <>Next Question <SkipForward size={16} className="ml-2" /></>
            ) : (
              "Reveal Answer"
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
