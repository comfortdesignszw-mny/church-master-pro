/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Members } from "./pages/Members";
import { Events } from "./pages/Events";
import { Accounting } from "./pages/Accounting";
import { Settings } from "./pages/Settings";
import { BibleStudy } from "./pages/BibleStudy";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/events" element={<Events />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bible-study" element={<BibleStudy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
