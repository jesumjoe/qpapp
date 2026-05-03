import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "./pages/dashboard";
import GradeDetail from "./pages/grade-detail";
import SubjectDetail from "./pages/subject-detail";
import RevisionMode from "./pages/revision-mode";
import QuestionBank from "./pages/question-bank";
import PerformancePage from "./pages/performance";
import DailyReview from "./pages/daily-review";
import { ApiKeyGuard } from "./components/api-key-guard";
import Layout from "./components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/daily-review" component={DailyReview} />
      <Route path="/grades/:gradeId" component={GradeDetail} />
      <Route path="/subjects/:subjectId" component={SubjectDetail} />
      <Route path="/subjects/:subjectId/revision" component={RevisionMode} />
      <Route path="/subjects/:subjectId/questions" component={QuestionBank} />
      <Route path="/subjects/:subjectId/performance" component={PerformancePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <ApiKeyGuard>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Layout>
                <Router />
              </Layout>
            </WouterRouter>
          </ApiKeyGuard>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

