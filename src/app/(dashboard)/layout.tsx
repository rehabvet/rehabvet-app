'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Calendar, Users, PawPrint, ClipboardList,
  FileText, DollarSign, BarChart3, Settings, LogOut, Menu, X, Package, Megaphone,
  Stethoscope, UserCog, Layers
} from 'lucide-react'

interface User {
  id: string; email: string; name: string; role: string
}

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'vet', 'therapist', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist', 'marketing'] },
  { href: '/calendar', label: 'Calendar', icon: Calendar, roles: ['admin', 'vet', 'therapist', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist', 'marketing'] },
  { href: '/appointments', label: 'Appointments', icon: ClipboardList, roles: ['admin', 'vet', 'therapist', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist', 'marketing'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['admin', 'vet', 'therapist', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist', 'marketing'] },
  { href: '/patients', label: 'Patients', icon: PawPrint, roles: ['admin', 'vet', 'therapist', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist', 'marketing'] },
  { href: '/treatment-plans', label: 'Treatment Plans', icon: Stethoscope, roles: ['admin', 'vet', 'therapist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'] },
  { href: '/sessions', label: 'Sessions', icon: FileText, roles: ['admin', 'vet', 'therapist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'] },
  { href: '/billing', label: 'Billing', icon: DollarSign, roles: ['admin', 'receptionist', 'administrator', 'office_manager', 'marketing'] },
  { href: '/packages', label: 'Packages', icon: Layers, roles: ['admin', 'vet', 'therapist', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'vet', 'receptionist', 'administrator', 'office_manager', 'veterinarian', 'senior_therapist'] },
  { href: '/leads', label: 'Leads', icon: Megaphone, roles: ['admin', 'receptionist', 'administrator', 'office_manager', 'marketing'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'vet', 'administrator', 'office_manager', 'veterinarian'] },
  { href: '/staff', label: 'Staff', icon: UserCog, roles: ['admin', 'administrator', 'office_manager'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'administrator', 'office_manager'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setUser(d.user); setLoading(false) })
      .catch(() => router.push('/login'))
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" />
    </div>
  )

  const filteredNav = nav.filter(n => user && n.roles.includes(user.role))

  const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    vet: 'Veterinarian',
    therapist: 'Senior Therapist',
    receptionist: 'Office Manager',
    veterinarian: 'Veterinarian',
    senior_therapist: 'Senior Therapist',
    assistant_therapist: 'Assistant Therapist',
    hydrotherapist: 'Hydrotherapist',
    marketing: 'Marketing',
    office_manager: 'Office Manager',
    administrator: 'Administrator',
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.webp" alt="RehabVet" className="h-8" />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={active ? 'sidebar-link-active' : 'sidebar-link-inactive'}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user ? roleLabel[user.role] || user.role : ''}</p>
          </div>
          <button onClick={logout} className="sidebar-link-inactive w-full">
            <LogOut className="w-5 h-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/logo.webp" alt="RehabVet" className="h-7" />
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
