import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import SchoolAdminRouter from "./pages/school-admin";
import { Route, Switch } from "wouter";

createRoot(document.getElementById("root")!).render(
  <Switch>
    <Route path="/school-admin/:rest*" component={SchoolAdminRouter} />
    <Route path="/school-admin" component={SchoolAdminRouter} />
    <Route component={App} />
  </Switch>
);
