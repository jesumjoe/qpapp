import { useState } from "react";
import { Link, useParams } from "wouter";
import { 
  useGetGrade, 
  useListSubjectsByGrade, 
  useCreateSubject,
  getListSubjectsByGradeQueryKey,
  useDeleteGrade,
  useDeleteSubject
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Book, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function GradeDetail() {
  const { gradeId } = useParams();
  const id = Number(gradeId);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: grade, isLoading: isLoadingGrade } = useGetGrade(id, { query: { enabled: !!id, queryKey: [`/api/grades/${id}`] } });
  const { data: subjects, isLoading: isLoadingSubjects } = useListSubjectsByGrade(id, { query: { enabled: !!id, queryKey: getListSubjectsByGradeQueryKey(id) } });
  
  const deleteGrade = useDeleteGrade();
  const deleteSubject = useDeleteSubject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDeleteGrade = () => {
    if (confirm("Are you sure you want to delete this semester and all its subjects?")) {
      deleteGrade.mutate({ gradeId: id }, {
        onSuccess: () => {
          setLocation("/");
        }
      });
    }
  };

  const handleDeleteSubject = (subjectId: number) => {
    if (confirm("Are you sure you want to delete this subject?")) {
      deleteSubject.mutate({ subjectId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsByGradeQueryKey(id) });
        }
      });
    }
  };

  if (isLoadingGrade) {
    return <div className="min-h-screen p-8"><div className="animate-pulse h-12 w-64 bg-muted rounded"></div></div>;
  }

  if (!grade) {
    return <div className="min-h-screen p-8 text-center">Semester not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} className="mr-1" /> Back to Dashboard
          </Link>
        </div>

        <header className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground font-serif tracking-tight mb-2">{grade.name}</h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary font-medium text-sm">
              {grade.level}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreateSubjectDialog gradeId={id} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <MoreVertical size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDeleteGrade}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Semester
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground font-serif">Subjects</h2>
          </div>

          {isLoadingSubjects ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjects?.map((subject) => (
                <div key={subject.id} className="relative group">
                  <Link href={`/subjects/${subject.id}`} className="block h-full">
                    <div className="p-6 bg-card border border-card-border rounded-xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-primary/30 h-full">
                      <div className="p-2 w-10 h-10 bg-primary/10 rounded-lg text-primary mb-4 flex items-center justify-center">
                        <Book size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{subject.name}</h3>
                      {subject.code && (
                        <p className="text-muted-foreground text-sm mt-1">{subject.code}</p>
                      )}
                    </div>
                  </Link>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground bg-card/80 backdrop-blur">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Subject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {!subjects?.length && (
                <div className="col-span-full p-12 text-center bg-card border border-dashed border-card-border rounded-xl text-muted-foreground">
                  <Book size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No subjects found</h3>
                  <p className="text-sm mb-6 max-w-sm mx-auto">Add a subject to start organizing past papers and questions.</p>
                  <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-dashed">
                    <Plus className="mr-2" size={16} /> Add Subject
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function CreateSubjectDialog({ gradeId, open, onOpenChange }: { gradeId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const createSubject = useCreateSubject();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    createSubject.mutate(
      { gradeId, data: { name, code: code || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsByGradeQueryKey(gradeId) });
          onOpenChange(false);
          setName("");
          setCode("");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-medium shadow-sm">
          <Plus className="mr-2" size={18} /> Add Subject
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add New Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name</Label>
              <Input
                id="name"
                placeholder="e.g. Biology"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code (Optional)</Label>
              <Input
                id="code"
                placeholder="e.g. BIO-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSubject.isPending || !name}>
              {createSubject.isPending ? "Adding..." : "Add Subject"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
