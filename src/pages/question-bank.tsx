import { useState } from "react";
import { Link, useParams } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Question } from "@/lib/db";
import { ChevronLeft, FileText, Search, BrainCircuit, Eye, EyeOff, Sparkles, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnswerEvaluator } from "@/components/answer-evaluator";
import { generateStudyGuide } from "@/lib/gemini";

export default function QuestionBank() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  const [searchTerm, setSearchTerm] = useState("");
  
  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const questions = useLiveQuery(() => db.questions.where("subjectId").equals(id).toArray(), [id]);

  const filteredQuestions = questions?.filter(q => 
    q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.answerText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.topic && q.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isLoadingSubject = subject === undefined;
  const isLoadingQuestions = questions === undefined;

  if (isLoadingSubject) {
    return <div className="min-h-screen p-8"><div className="animate-pulse h-12 w-64 bg-muted rounded"></div></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/10">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Link href={`/subjects/${id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} className="mr-1" /> Back to {subject?.name}
          </Link>
        </div>

        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-serif tracking-tight flex items-center gap-3">
              <FileText className="text-primary" /> Question Bank
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse and practice all extracted questions for {subject?.name}.
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-muted-foreground" />
            </div>
            <Input 
              type="text" 
              placeholder="Search questions..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <main className="space-y-6">
          {isLoadingQuestions ? (
             <div className="space-y-4">
               {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card rounded-xl animate-pulse border border-card-border"></div>)}
             </div>
          ) : filteredQuestions?.length === 0 ? (
            <div className="p-12 text-center bg-card border border-dashed border-card-border rounded-xl text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground mb-1">No questions found</h3>
              <p className="text-sm">Upload papers to extract questions or try a different search term.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredQuestions?.map((q, idx) => (
                <QuestionCard key={q.id} question={q} index={idx} subjectName={subject?.name || ""} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function QuestionCard({ question, index, subjectName }: { question: Question; index: number; subjectName: string }) {
  const [showPractice, setShowPractice] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [studyGuide, setStudyGuide] = useState<string | null>(null);

  const handleTeachMe = async () => {
    if (!question.topic) return;
    setIsGeneratingGuide(true);
    try {
      const guide = await generateStudyGuide(question.topic, subjectName);
      setStudyGuide(guide);
    } catch (error) {
      console.error(error);
      alert("Failed to generate study guide.");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-muted/30 border-b border-border px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
        <div className="flex gap-2">
          {question.topic && <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded font-medium">{question.topic}</span>}
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-bold">{question.marks} Mark{question.marks !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Question</h4>
          <p className="text-lg text-foreground font-medium whitespace-pre-wrap">{question.questionText}</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button 
            variant={showPractice ? "secondary" : "outline"} 
            size="sm" 
            onClick={() => {
              setShowPractice(!showPractice);
              if (!showPractice) setShowAnswer(false);
            }}
          >
            <BrainCircuit size={16} className="mr-2" />
            {showPractice ? "Close Practice" : "Practice & Evaluate"}
          </Button>
          {!showPractice && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAnswer(!showAnswer)}
            >
              {showAnswer ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </Button>
          )}
          {question.topic && (
            <Button 
              variant="outline" 
              size="sm" 
              className="border-primary/30 text-primary hover:bg-primary/5"
              onClick={handleTeachMe}
              disabled={isGeneratingGuide}
            >
              {isGeneratingGuide ? <Loader2 size={16} className="mr-2 animate-spin" /> : <BookOpen size={16} className="mr-2" />}
              Teach Me Topic
            </Button>
          )}
        </div>

        {studyGuide && (
          <div className="mt-4 p-6 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-serif font-bold text-primary flex items-center gap-2">
                <Sparkles size={20} /> Study Guide: {question.topic}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setStudyGuide(null)}>Close</Button>
            </div>
            <div className="prose prose-sm prose-primary max-w-none text-foreground whitespace-pre-wrap text-sm">
              {studyGuide}
            </div>
          </div>
        )}

        {showPractice && (
          <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2">
            <AnswerEvaluator 
              questionText={question.questionText} 
              maxMarks={question.marks} 
              referenceAnswer={question.answerText}
            />
          </div>
        )}

        {showAnswer && !showPractice && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border animate-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Reference Answer</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{question.answerText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

