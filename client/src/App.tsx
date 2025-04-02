import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import { Suspense } from "react";

function Router() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
