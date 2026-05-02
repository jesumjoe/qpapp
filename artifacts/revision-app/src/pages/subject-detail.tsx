import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { 
  useGetSubject, 
  useGetSubjectStats, 
  useListPapersBySubject,
  useCreatePaper,
  useRequestUploadUrl,
  useExtractQuestionsFromPaper,
  getListPapersBySubjectQueryKey,
  getGetSubjectStatsQueryKey,
  useDeletePaper,
  Paper
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, FileText, UploadCloud, BrainCircuit, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  
  const { data: subject, isLoading: isLoadingSubject } = useGetSubject(id, { query: { enabled: !!id, queryKey: [`/api/subjects/${id}`] } });
  const { data: stats } = useGetSubjectStats(id, { query: { enabled: !!id, queryKey: getGetSubjectStatsQueryKey(id) } });
  const { data: papers, isLoading: isLoadingPapers } = useListPapersBySubject(id, { query: { enabled: !!id, queryKey: getListPapersBySubjectQueryKey(id) } });
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (isLoadingSubject) {
    return <div className="min-h-screen p-8"><div className="animate-pulse h-12 w-64 bg-muted rounded"></div></div>;
  }

  if (!subject) {
    return <div className="min-h-screen p-8 text-center">Subject not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <Link href={`/grades/${subject.gradeId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} className="mr-1" /> Back to Semester
          </Link>
        </div>

        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-foreground font-serif tracking-tight">{subject.name}</h1>
                {subject.code && (
                  <span className="px-3 py-1 rounded bg-muted text-muted-foreground text-sm font-mono font-medium">
                    {subject.code}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {stats?.totalPapers || 0} Papers • {stats?.totalQuestions || 0} Questions Extracted
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/subjects/${id}/questions`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                <FileText className="mr-2 h-4 w-4" /> Question Bank
              </Link>
              <Link href={`/subjects/${id}/revision`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm">
                <BrainCircuit className="mr-2 h-4 w-4" /> Start Revision Session
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold text-foreground">Past Papers</h2>
              <UploadPaperDialog subjectId={id} open={isUploadOpen} onOpenChange={setIsUploadOpen} />
            </div>

            {isLoadingPapers ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse"></div>)}
              </div>
            ) : papers?.length === 0 ? (
              <div className="p-12 text-center bg-card border border-dashed border-card-border rounded-xl text-muted-foreground">
                <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-foreground mb-1">No papers uploaded</h3>
                <p className="text-sm mb-6 max-w-sm mx-auto">Upload past exam papers as PDFs. AI will extract the questions automatically.</p>
                <Button onClick={() => setIsUploadOpen(true)} variant="outline" className="border-dashed">
                  <UploadCloud className="mr-2" size={16} /> Upload Paper
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {papers?.map(paper => (
                  <PaperCard key={paper.id} paper={paper} subjectId={id} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-serif font-bold text-foreground mb-4">Questions by Marks</h3>
              {stats && stats.questionsByMarks.length > 0 ? (
                <div className="space-y-3">
                  {stats.questionsByMarks.map(({marks, count}) => {
                    const percentage = (count / stats.totalQuestions) * 100;
                    return (
                      <div key={marks} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{marks} Mark{marks !== 1 ? 's' : ''}</span>
                          <span className="text-muted-foreground">{count} questions</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No extracted questions yet.
                </div>
              )}
            </div>
            
            <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <BrainCircuit size={32} />
              </div>
              <h3 className="font-bold text-foreground mb-2">Ready to test yourself?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Take a focused revision session using questions from your uploaded papers.
              </p>
              <Link href={`/subjects/${id}/revision`} className="w-full">
                <Button className="w-full">
                  Start Session <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperCard({ paper, subjectId }: { paper: Paper, subjectId: number }) {
  const queryClient = useQueryClient();
  const deletePaper = useDeletePaper();
  const extractQuestions = useExtractQuestionsFromPaper();
  
  const handleDelete = () => {
    if(confirm("Delete this paper?")) {
      deletePaper.mutate({ paperId: paper.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPapersBySubjectQueryKey(subjectId) });
          queryClient.invalidateQueries({ queryKey: getGetSubjectStatsQueryKey(subjectId) });
        }
      });
    }
  };

  const handleRetryExtraction = () => {
    extractQuestions.mutate({ paperId: paper.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPapersBySubjectQueryKey(subjectId) });
      }
    });
  };

  return (
    <div className="p-4 bg-card border border-card-border rounded-xl shadow-sm flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-muted rounded-lg text-muted-foreground">
          <FileText size={24} />
        </div>
        <div>
          <h4 className="font-bold text-foreground">{paper.title} <span className="font-normal text-muted-foreground ml-2">{paper.year}</span></h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{paper.questionCount} questions</span>
            <ExtractionBadge status={paper.extractionStatus} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {paper.extractionStatus === "failed" && (
          <Button variant="outline" size="sm" onClick={handleRetryExtraction} disabled={extractQuestions.isPending}>
            Retry
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}

function ExtractionBadge({ status }: { status: string }) {
  if (status === 'done') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-secondary/10 text-secondary"><CheckCircle2 size={12} /> Extracted</span>;
  }
  if (status === 'processing' || status === 'pending') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400"><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Processing</span>;
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive"><XCircle size={12} /> Failed</span>;
  }
  return null;
}

function UploadPaperDialog({ subjectId, open, onOpenChange }: { subjectId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [title, setTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  
  const requestUploadUrl = useRequestUploadUrl();
  const createPaper = useCreatePaper();
  const extractQuestions = useExtractQuestionsFromPaper();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !year) return;
    
    setIsUploading(true);
    try {
      let fileObjectPath: string | undefined = undefined;
      const file = fileInputRef.current?.files?.[0];
      
      if (file) {
        // 1. Get upload URL
        const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type }
        });
        
        // 2. Upload file directly to S3
        await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });
        
        fileObjectPath = objectPath;
      }
      
      // 3. Create paper record
      const paper = await createPaper.mutateAsync({
        subjectId,
        data: { year: Number(year), title, fileObjectPath }
      });
      
      // 4. Trigger extraction if there's a file
      if (fileObjectPath) {
        await extractQuestions.mutateAsync({ paperId: paper.id });
      }
      
      queryClient.invalidateQueries({ queryKey: getListPapersBySubjectQueryKey(subjectId) });
      onOpenChange(false);
      setTitle("");
      setYear(new Date().getFullYear().toString());
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload paper. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isUploading && onOpenChange(val)}>
      <DialogTrigger asChild>
        <Button className="font-medium shadow-sm">
          <Plus className="mr-2" size={18} /> Upload Paper
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Upload Past Paper</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Paper Title</Label>
              <Input
                id="title"
                placeholder="e.g. Paper 1 Multiple Choice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">PDF File (Optional)</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                <AlertCircle size={14} className="shrink-0" />
                Upload a PDF to automatically extract questions using AI.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !title || !year}>
              {isUploading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Uploading & Processing...
                </>
              ) : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
