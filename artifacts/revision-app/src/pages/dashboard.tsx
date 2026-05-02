import { useState } from "react";
import { useListGrades, useCreateGrade, getListGradesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, Plus, Folder, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { data: grades, isLoading } = useListGrades();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary text-primary-foreground rounded-xl shadow-sm">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground font-serif tracking-tight">Binder</h1>
              <p className="text-muted-foreground text-sm mt-1">Your purposeful study companion.</p>
            </div>
          </div>
          <CreateGradeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        </header>

        <main>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground font-serif">My Semesters</h2>
          </div>
          
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-32 bg-muted rounded-xl animate-pulse"></div>
              <div className="h-32 bg-muted rounded-xl animate-pulse"></div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {grades?.map((grade) => (
                <Link key={grade.id} href={`/grades/${grade.id}`} className="block group">
                  <div className="p-6 bg-card border border-card-border rounded-xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-primary/30 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground group-hover:text-primary transition-colors">
                          <Folder size={20} />
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground/30 group-hover:text-primary/70 transition-colors" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors font-serif">
                        {grade.name}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm font-medium">{grade.level}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {!grades?.length && (
                <div className="col-span-full p-16 text-center bg-card border border-dashed border-card-border rounded-xl text-muted-foreground">
                  <Folder size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No binders found</h3>
                  <p className="text-sm mb-6 max-w-sm mx-auto">Create a semester or grade level to start organizing your study materials.</p>
                  <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-dashed">
                    <Plus className="mr-2" size={16} /> Create Binder
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

function CreateGradeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const createGrade = useCreateGrade();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !level) return;
    
    createGrade.mutate(
      { data: { name, level } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGradesQueryKey() });
          onOpenChange(false);
          setName("");
          setLevel("");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-medium shadow-sm">
          <Plus className="mr-2" size={18} /> New Semester
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Create New Semester</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Fall 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                placeholder="e.g. Year 2, Junior"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGrade.isPending || !name || !level}>
              {createGrade.isPending ? "Creating..." : "Create Binder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
