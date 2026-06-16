/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Members } from "./pages/Members";
import { Events } from "./pages/Events";
import { Accounting } from "./pages/Accounting";
import { Settings } from "./pages/Settings";
import { BibleStudy } from "./pages/BibleStudy";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "members", element: <Members /> },
      { path: "events", element: <Events /> },
      { path: "accounting", element: <Accounting /> },
      { path: "settings", element: <Settings /> },
      { path: "bible-study", element: <BibleStudy /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
