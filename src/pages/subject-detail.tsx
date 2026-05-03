import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Paper } from "@/lib/db";
import { ChevronLeft, Plus, FileText, UploadCloud, BrainCircuit, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowRight, TrendingUp, Sparkles, Loader2, Calendar, FileCheck, BarChart3, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getGeminiModel, extractQuestionsFromFile, generateMockExam } from "@/lib/gemini";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

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

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  
  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const papers = useLiveQuery(() => db.papers.where("subjectId").equals(id).toArray(), [id]);
  const stats = useLiveQuery(async () => {
    const questions = await db.questions.where("subjectId").equals(id).toArray();
    const paperCount = await db.papers.where("subjectId").equals(id).count();
    
    const marksMap = new Map<number, number>();
    questions.forEach(q => {
      marksMap.set(q.marks, (marksMap.get(q.marks) || 0) + 1);
    });
    
    return {
      totalPapers: paperCount,
      totalQuestions: questions.length,
      questionsByMarks: Array.from(marksMap.entries()).map(([marks, count]) => ({ marks, count })).sort((a, b) => a.marks - b.marks)
    };
  }, [id]);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMockDialogOpen, setIsMockDialogOpen] = useState(false);

  const isLoadingSubject = subject === undefined;
  const isLoadingPapers = papers === undefined;

  if (isLoadingSubject) {
    return <div className="space-y-6"><div className="animate-pulse h-12 w-64 bg-muted/30 rounded-2xl"></div></div>;
  }

  if (!subject) {
    return <div className="text-center py-20">Subject not found</div>;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-6">
        <Link href={`/grades/${subject.gradeId}`} className="group inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Semester
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <BookOpen size={28} />
              </div>
              <h1 className="text-5xl font-bold font-serif tracking-tight">{subject.name}</h1>
            </div>
            <p className="text-muted-foreground text-lg font-medium ml-1">
              {stats?.totalPapers || 0} Research Papers • {stats?.totalQuestions || 0} Extracted Concepts
            </p>
          </motion.div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setIsMockDialogOpen(true)} className="h-12 px-6 rounded-2xl border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
              <Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Mock Exam
            </Button>
            <Link href={`/subjects/${id}/questions`}>
              <Button variant="outline" className="h-12 px-6 rounded-2xl">
                <FileText className="mr-2 h-5 w-5" /> Question Bank
              </Button>
            </Link>
            <Link href={`/subjects/${id}/performance`}>
              <Button variant="outline" className="h-12 px-6 rounded-2xl">
                <TrendingUp className="mr-2 h-5 w-5" /> Performance
              </Button>
            </Link>
            <Link href={`/subjects/${id}/revision`}>
              <Button className="h-12 px-8 rounded-2xl shadow-xl shadow-primary/20">
                <BrainCircuit className="mr-2 h-5 w-5" /> Start Revision
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-serif font-bold">Past Papers</h2>
            <UploadPaperDialog subjectId={id} open={isUploadOpen} onOpenChange={setIsUploadOpen} />
          </div>

          {isLoadingPapers ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-muted/20 rounded-3xl animate-pulse"></div>)}
            </div>
          ) : papers?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-16 text-center glass rounded-[2.5rem] border-dashed border-primary/20"
            >
              <FileText size={64} className="mx-auto mb-6 text-primary/20" />
              <h3 className="text-2xl font-bold font-serif mb-2">No Papers Found</h3>
              <p className="text-muted-foreground mb-10 max-w-sm mx-auto font-medium">Upload past exam papers. AI will extract and categorize questions automatically.</p>
              <Button onClick={() => setIsUploadOpen(true)} variant="outline" className="rounded-2xl h-12 px-8 border-dashed">
                <UploadCloud className="mr-2" size={20} /> Upload First Paper
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {papers?.map(paper => (
                <motion.div key={paper.id} variants={itemVariants}>
                  <PaperCard paper={paper} subjectId={id} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <aside className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bento-card"
          >
            <h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="text-primary" size={20} />
              Distribution
            </h3>
            {stats && stats.questionsByMarks.length > 0 ? (
              <div className="space-y-5">
                {stats.questionsByMarks.map(({marks, count}) => {
                  const percentage = (count / stats.totalQuestions) * 100;
                  return (
                    <div key={marks} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span>{marks} Mark{marks !== 1 ? 's' : ''}</span>
                        <span className="text-primary">{count} items</span>
                      </div>
                      <div className="h-2 w-full bg-primary/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-10 font-medium">
                No data available yet.
              </div>
            )}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bento-card bg-primary/5 border-primary/20 flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-primary/5">
              <BrainCircuit size={40} />
            </div>
            <h3 className="text-xl font-bold font-serif mb-2">Practice Ready</h3>
            <p className="text-muted-foreground mb-8 font-medium">
              Start a focused revision session with AI-extracted questions.
            </p>
            <Link href={`/subjects/${id}/revision`} className="w-full">
              <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20">
                Start Session <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </aside>
      </div>

      <MockExamDialog 
        subjectId={id} 
        subjectName={subject.name} 
        open={isMockDialogOpen} 
        onOpenChange={setIsMockDialogOpen} 
      />
    </div>
  );
}

function PaperCard({ paper, subjectId }: { paper: Paper, subjectId: number }) {
  const handleDelete = async () => {
    if(confirm("Delete this paper?")) {
      try {
        await db.transaction('rw', [db.papers, db.questions], async () => {
          await db.questions.where("paperId").equals(paper.id!).delete();
          await db.papers.delete(paper.id!);
        });
      } catch (error) {
        console.error("Failed to delete paper:", error);
      }
    }
  };

  return (
    <div className="bento-card p-6 flex items-center justify-between group">
      <div className="flex items-center gap-6">
        <div className="p-4 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
          <FileCheck size={28} />
        </div>
        <div>
          <h4 className="text-xl font-bold font-serif">{paper.title}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
              <Calendar size={12} className="mr-1" /> {paper.year}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl text-destructive hover:bg-destructive/10" onClick={handleDelete}>
          <Trash2 size={20} />
        </Button>
      </div>
    </div>
  );
}

function UploadPaperDialog({ subjectId, open, onOpenChange }: { subjectId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !year || !selectedFile) return;
    
    setIsUploading(true);
    try {
      const paperId = await db.papers.add({
        subjectId,
        title,
        year: Number(year),
        createdAt: Date.now()
      });

      const questions = await extractQuestionsFromFile(selectedFile, title, Number(year));
      
      if (questions && questions.length > 0) {
        await db.questions.bulkAdd(questions.map((q: any) => ({
          ...q,
          paperId,
          subjectId,
          createdAt: Date.now()
        })));
      }
      
      onOpenChange(false);
      setTitle("");
      setYear(new Date().getFullYear().toString());
      setSelectedFile(null);
      
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to process paper. Check your API key or connection.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isUploading && onOpenChange(val)}>
      <DialogTrigger asChild>
        <Button className="h-12 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20 bg-primary group">
          <Plus className="mr-2 group-hover:rotate-90 transition-transform duration-300" size={20} /> Upload Paper
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="p-10 space-y-10 glass"
        >
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <UploadCloud size={24} />
            </div>
            <DialogTitle className="font-serif text-4xl tracking-tighter">Upload Paper</DialogTitle>
            <p className="text-muted-foreground text-lg font-medium">AI will analyze and extract questions.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">Paper Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Midterm Examination"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  className="rounded-2xl bg-background/50 border-none h-14 px-6 focus-visible:ring-primary/20 transition-all text-lg font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="year" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">Academic Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={isUploading}
                  className="rounded-2xl bg-background/50 border-none h-14 px-6 focus-visible:ring-primary/20 transition-all text-lg font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">Source File (PDF/IMG)</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                    className="rounded-2xl bg-background/50 border-none h-20 px-6 py-6 focus-visible:ring-primary/20 transition-all text-sm font-medium cursor-pointer file:hidden"
                  />
                  {!selectedFile && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground gap-2">
                      <UploadCloud size={20} />
                      <span>Drop file here or click to browse</span>
                    </div>
                  )}
                  {selectedFile && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-primary font-bold gap-2">
                      <FileCheck size={20} />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading} className="rounded-2xl h-14 px-8 font-bold text-lg">
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || !title || !year || !selectedFile} className="rounded-2xl h-14 px-10 font-bold text-lg shadow-xl shadow-primary/20">
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Analyzing...
                  </>
                ) : "Process with AI"}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function MockExamDialog({ subjectId, subjectName, open, onOpenChange }: { subjectId: number; subjectName: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [totalMarks, setTotalMarks] = useState("50");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<any[] | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const allQuestions = await db.questions.where("subjectId").equals(subjectId).toArray();
      if (allQuestions.length < 5) {
        alert("Not enough questions in the bank to generate a mock exam. Upload more papers first!");
        return;
      }
      
      const selectedIds = await generateMockExam(subjectName, Number(totalMarks), allQuestions);
      const selectedQuestions = allQuestions.filter(q => selectedIds.includes(q.id));
      setGeneratedExam(selectedQuestions);
    } catch (error) {
      console.error(error);
      alert("Failed to generate mock exam.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-[3rem] border-none shadow-2xl overflow-hidden p-0 bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-10 max-h-[85vh] overflow-y-auto"
        >
          <DialogHeader>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                <Sparkles size={32} />
              </div>
              <div>
                <DialogTitle className="font-serif text-4xl tracking-tighter">AI Mock Generator</DialogTitle>
                <p className="text-muted-foreground text-lg font-medium">Curating a balanced examination for you.</p>
              </div>
            </div>
          </DialogHeader>
          
          {!generatedExam ? (
            <div className="space-y-10 py-6">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">Target Assessment Score</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={totalMarks} 
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="rounded-2xl bg-background/50 border-none h-20 px-8 text-4xl font-serif font-bold focus-visible:ring-primary/20 transition-all"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Marks</div>
                </div>
                <p className="text-muted-foreground font-medium ml-1">AI will intelligently select questions to match this total while ensuring topic coverage.</p>
              </div>
              <Button className="w-full h-16 rounded-2xl text-xl font-bold shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02]" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Selecting Questions...</> : "Generate Examination"}
              </Button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10 py-6"
            >
              <div className="glass bg-background/40 p-8 rounded-[2rem] border-primary/10">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-primary/10">
                  <h3 className="font-serif text-2xl font-bold">Generated Paper</h3>
                  <div className="px-4 py-2 bg-primary/10 rounded-xl text-primary font-bold text-sm uppercase tracking-widest">
                    {generatedExam.reduce((acc, q) => acc + q.marks, 0)} Total Marks
                  </div>
                </div>
                <div className="space-y-6">
                  {generatedExam.map((q, i) => (
                    <motion.div 
                      key={q.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4 group"
                    >
                      <span className="font-serif font-bold text-xl text-primary/40 shrink-0">{i+1}.</span> 
                      <div className="space-y-2">
                        <p className="font-medium text-lg leading-relaxed">{q.questionText}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-primary font-bold text-xs uppercase tracking-widest">[{q.marks} Marks]</span>
                          <span className="text-muted-foreground/40 text-[10px]">•</span>
                          <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{q.topic || "General"}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-lg font-bold" onClick={() => setGeneratedExam(null)}>Regenerate</Button>
                <Button className="flex-1 h-16 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20" onClick={() => window.print()}>Print Assessment</Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
