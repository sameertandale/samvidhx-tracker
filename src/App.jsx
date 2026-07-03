import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useAppData } from './hooks/useAppData'
import { LoadingScreen } from './components/ui/Spinner'
import { Dashboard } from './views/Dashboard'
import { Projects } from './views/Projects'
import { ProjectDetail } from './views/ProjectDetail'
import { MilestoneDetail } from './views/MilestoneDetail'
import { EpicDetail } from './views/EpicDetail'
import { Partners } from './views/Partners'
import { PartnerDetail } from './views/PartnerDetail'
import { Settings } from './views/Settings'
import { Review } from './views/Review'

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard', exact: true },
  { to: '/projects', label: 'Projects'              },
  { to: '/partners', label: 'Partners'              },
  { to: '/review',   label: 'Review'                },
  { to: '/settings', label: 'Settings'              },
]

function NavBar() {
  const location = useLocation()
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}
    >
      <span className="font-bold text-base tracking-tight" style={{ color: 'var(--accent-orng)' }}>
        SamvidhX Tracker
      </span>
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(item => {
          const active = item.exact
            ? location.hash === '#/' || location.hash === '#'
            : location.hash.startsWith('#' + item.to) && item.to !== '/'
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={({ isActive }) => ({
                backgroundColor: active || isActive ? 'rgba(21,100,249,0.15)' : 'transparent',
                color: active || isActive ? 'var(--sky-blue)' : 'var(--text-sec)',
              })}
            >
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function AppShell({ appData }) {
  if (appData.loading) return <LoadingScreen />

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', minHeight: '100vh' }}>
      <NavBar />
      <main className="pt-14">
        <Routes>
          <Route path="/"                   element={<Dashboard    appData={appData} />} />
          <Route path="/projects"           element={<Projects     appData={appData} />} />
          <Route path="/projects/:projectId" element={<ProjectDetail  appData={appData} />} />
          <Route path="/milestones/:milestoneId" element={<MilestoneDetail appData={appData} />} />
          <Route path="/epics/:epicId"      element={<EpicDetail   appData={appData} />} />
          <Route path="/partners"           element={<Partners     appData={appData} />} />
          <Route path="/partners/:partnerId" element={<PartnerDetail appData={appData} />} />
          <Route path="/review"             element={<Review       appData={appData} />} />
          <Route path="/settings"           element={<Settings     appData={appData} />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const appData = useAppData()
  return (
    <HashRouter>
      <AppShell appData={appData} />
    </HashRouter>
  )
}
