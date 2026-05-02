import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "./pages/dashboard";
import GradeDetail from "./pages/grade-detail";
import SubjectDetail from "./pages/subject-detail";
import RevisionMode from "./pages/revision-mode";
import QuestionBank from "./pages/question-bank";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/grades/:gradeId" component={GradeDetail} />
      <Route path="/subjects/:subjectId" component={SubjectDetail} />
      <Route path="/subjects/:subjectId/revision" component={RevisionMode} />
      <Route path="/subjects/:subjectId/questions" component={QuestionBank} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
