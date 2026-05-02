import { useState } from "react";
import { Link, useParams } from "wouter";
import { 
  useGetSubject,
  useListQuestionsBySubject,
  getListQuestionsBySubjectQueryKey
} from "@workspace/api-client-react";
import { ChevronLeft, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function QuestionBank() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: subject, isLoading: isLoadingSubject } = useGetSubject(id, { query: { enabled: !!id, queryKey: [`/api/subjects/${id}`] } });
  const { data: questions, isLoading: isLoadingQuestions } = useListQuestionsBySubject(id, { query: { enabled: !!id, queryKey: getListQuestionsBySubjectQueryKey(id) } });

  const filteredQuestions = questions?.filter(q => 
    q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.answerText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.topic && q.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              Browse all extracted questions for {subject?.name}.
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
                <div key={q.id} className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-muted/30 border-b border-border px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Question {idx + 1}</span>
                    <div className="flex gap-2">
                      {q.topic && <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded font-medium">{q.topic}</span>}
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-bold">{q.marks} Mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Question</h4>
                      <p className="text-foreground whitespace-pre-wrap">{q.questionText}</p>
                    </div>
                    <div className="pl-6 md:border-l border-border mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0">
                      <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Answer</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{q.answerText}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
