// frontend/src/app/(dashboard)/dashboard/layout.js (CORRECTED)

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserCircleIcon, LinkIcon, CogIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { handleLogout } from '@/app/actions';

export default async function DashboardLayout({ children }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Use the more secure getUser() method to protect the route
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // --- The rest of your layout's JSX is fine ---
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      <aside className="w-full md:w-64 bg-white shadow-md md:min-h-screen p-4 space-y-2">
        <div className="text-2xl font-bold text-blue-600 mb-6 p-2">My Dashboard</div>
        <nav>
            <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"><UserCircleIcon className="h-6 w-6" /><span>Overview</span></Link>
            <Link href="/dashboard/profile" className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"><CogIcon className="h-6 w-6" /><span>Profile</span></Link>
            <Link href="/dashboard/links" className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"><LinkIcon className="h-6 w-6" /><span>Links</span></Link>
            <Link href="/connect-stripe" className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg><span>Payments Setup</span></Link>
        </nav>
        <div className="pt-4 mt-auto">
          <form action={handleLogout}>
            <button type="submit" className="flex items-center space-x-3 w-full px-3 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"><ArrowRightOnRectangleIcon className="h-6 w-6" /><span>Log Out</span></button>
          </form>
          {user.email && <p className="text-xs text-gray-500 mt-2 p-2 break-all">Logged in as: {user.email}</p>}
        </div>
      </aside>

      <div className="flex-1 p-6 md:p-10">
        {children}
      </div>
    </div>
  );
}