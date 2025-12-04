import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreateStory from "@/pages/create";
import EditStory from "@/pages/edit";
import PlayStory from "@/pages/play";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth";
import AccountPage from "@/pages/account";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/create" component={CreateStory} />
      <Route path="/edit/:id" component={EditStory} />
      <Route path="/play/:sessionId" component={PlayStory} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
