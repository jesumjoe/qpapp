import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Link } from "wouter";
import { BookOpen, Plus, Folder, ChevronRight, GraduationCap, BarChart3, Clock, Sparkles, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.9 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 12,
      mass: 0.8
    }
  }
};

export default function Dashboard() {
  const grades = useLiveQuery(() => db.grades.toArray());
  const dueCount = useLiveQuery(() => 
    db.questions.where("nextReviewDate").below(Date.now()).count()
  );
  const isLoading = grades === undefined;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div 
          initial={{ x: -30, opacity: 0, filter: "blur(10px)" }}
          animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Sparkles size={14} />
            <span>Academic Intelligence</span>
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-serif tracking-tighter leading-none kinetic-text">
              Workspace
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg mt-4 max-w-md leading-relaxed font-medium">
              Your personalized academic command center. Organized, insightful, and powered by AI.
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <CreateGradeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        </motion.div>
      </header>

      <main className="space-y-16">
        {/* Stats / Quick Info Bento Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Review Card */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "md:col-span-2 bento-card relative overflow-hidden group",
              dueCount !== undefined && dueCount > 0 ? "border-primary/20 bg-primary/5" : "opacity-80"
            )}
          >
            <div className="absolute -right-8 -bottom-8 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none -rotate-12 translate-x-1/4 scale-150 duration-700">
              <Clock size={160} />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
              <div className="space-y-3 text-center md:text-left">
                <div className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
                  <Clock size={14} />
                  <span>Scheduled Tasks</span>
                </div>
                <h3 className="text-3xl font-bold font-serif">Daily Review</h3>
                <p className="text-muted-foreground max-w-xs">
                  {dueCount !== undefined && dueCount > 0 
                    ? `You have ${dueCount} items waiting for review. Keep your streak alive!`
                    : "You're all caught up! No items due for review right now."}
                </p>
              </div>
              
              <Link href="/daily-review">
                <Button size="lg" className="rounded-full px-10 shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300">
                  {dueCount !== undefined && dueCount > 0 ? "Start Review" : "View Schedule"} <ChevronRight className="ml-2" size={20} />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Quick Stats Card */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="bento-card bg-secondary/5 border-secondary/20 flex flex-col justify-between group"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-secondary/10 rounded-2xl text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-all duration-500">
                <BarChart3 size={24} />
              </div>
              <span className="text-xs font-bold text-secondary/60 uppercase tracking-widest">Efficiency</span>
            </div>
            <div className="mt-8">
              <div className="text-4xl font-bold font-serif">84%</div>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Retention Rate</p>
            </div>
            <div className="mt-6 h-1 w-full bg-secondary/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "84%" }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                className="h-full bg-secondary"
              />
            </div>
          </motion.div>
        </section>

        {/* Binders Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold font-serif flex items-center gap-3">
              <LayoutGrid className="text-primary/60" size={28} />
              Academic Binders
            </h2>
          </div>
          
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted/30 rounded-3xl animate-pulse border border-border/50"></div>
              ))}
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {grades?.map((grade, index) => (
                <motion.div 
                  key={grade.id} 
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link href={`/grades/${grade.id}`} className="group block h-full">
                    <div className={cn(
                      "bento-card h-full relative overflow-hidden",
                      index === 0 && "md:col-span-1 lg:col-span-2 bg-gradient-to-br from-card to-primary/5"
                    )}>
                      {/* Decorative background element */}
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-125">
                        <BookOpen size={120} />
                      </div>

                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-8">
                          <div className="p-4 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-primary/30">
                            <BookOpen size={28} />
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0">
                            <div className="flex items-center gap-1 text-primary font-bold text-sm">
                              Open <ChevronRight size={18} />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-auto space-y-4">
                          <div>
                            <p className="text-primary/60 text-xs font-bold uppercase tracking-[0.2em] mb-2">{grade.level}</p>
                            <h2 className="text-4xl font-bold font-serif leading-none group-hover:text-primary transition-colors tracking-tight">
                              {grade.name}
                            </h2>
                          </div>
                          
                          <div className="flex items-center gap-6 text-muted-foreground text-xs font-bold border-t border-border/50 pt-6">
                            <div className="flex items-center gap-2">
                              <Sparkles size={14} className="text-primary/40" />
                              <span>AI Enhanced</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-primary/40" />
                              <span>Active</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
              
              <AnimatePresence>
                {(!grades || grades.length === 0) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-full"
                  >
                    <div className="p-24 text-center glass rounded-[3rem] border-dashed border-primary/20 group hover:border-primary/40 transition-colors">
                      <div className="w-24 h-24 bg-primary/5 text-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                        <Plus size={48} />
                      </div>
                      <h3 className="text-4xl font-bold font-serif mb-4">Empty Workspace</h3>
                      <p className="text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed text-lg font-medium">
                        Begin your organized academic journey by creating your first binder.
                      </p>
                      <Button onClick={() => setIsDialogOpen(true)} size="lg" className="rounded-full px-12 h-14 text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
                        <Plus className="mr-2" size={24} /> Create Binder
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
}

function CreateGradeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !level) return;
    
    setIsSubmitting(true);
    try {
      await db.grades.add({
        name,
        level,
        createdAt: Date.now()
      });
      onOpenChange(false);
      setName("");
      setLevel("");
    } catch (error) {
      console.error("Failed to add grade:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-full px-10 h-14 font-bold shadow-2xl shadow-primary/20 group bg-primary hover:bg-primary/90 hover:scale-105 transition-all">
          <Plus className="mr-2 group-hover:rotate-90 transition-transform duration-500" size={24} /> New Semester
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="p-10 space-y-10 glass"
        >
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <GraduationCap size={24} />
            </div>
            <DialogTitle className="font-serif text-4xl tracking-tighter">New Binder</DialogTitle>
            <p className="text-muted-foreground text-lg font-medium">Define your academic scope.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">Semester Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Fall 2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="rounded-2xl bg-background/50 border-none h-14 px-6 focus-visible:ring-primary/20 transition-all text-lg font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="level" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70 ml-1">Academic Level</Label>
                <Input
                  id="level"
                  placeholder="e.g. Year 2, Junior"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="rounded-2xl bg-background/50 border-none h-14 px-6 focus-visible:ring-primary/20 transition-all text-lg font-medium"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl h-14 px-8 font-bold text-lg">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name || !level} className="rounded-2xl h-14 px-10 font-bold text-lg shadow-xl shadow-primary/20">
                {isSubmitting ? "Creating..." : "Establish Binder"}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

