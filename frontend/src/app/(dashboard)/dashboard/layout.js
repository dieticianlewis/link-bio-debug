// frontend/src/app/(dashboard)/dashboard/layout.js
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  UserCircleIcon, 
  LinkIcon as LinkIconOutline,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'; 

async function handleLogoutAction() {
  'use server';
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }); } catch (error) {} },
        remove(name, options) { try { cookieStore.set({ name, value: '', ...options }); } catch (error) {} },
      },
    }
  );
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function DashboardLayout({ children }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }); } catch (error) {} },
        remove(name, options) { try { cookieStore.set({ name, value: '', ...options }); } catch (error) {} },
      },
    }
  );

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("DashboardLayout: Supabase session error:", sessionError.message);
    redirect('/login'); 
  }
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 text-gray-800">
      <aside className="w-full md:w-64 bg-white shadow-lg md:min-h-screen p-4 flex flex-col">
        <div>
          <Link href="/dashboard" className="text-3xl font-bold text-blue-600 p-2 block hover:text-blue-700 transition-colors mb-6">
            My Dashboard
          </Link>
          <nav className="space-y-1 flex-grow">
            <Link href="/dashboard" className="group flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <UserCircleIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" /> 
              <span className="font-medium">Overview</span>
            </Link>
            <Link href="/dashboard/profile" className="group flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Cog6ToothIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" /> 
              <span className="font-medium">Profile Settings</span>
            </Link>
            <Link href="/dashboard/links" className="group flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <LinkIconOutline className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" /> 
              <span className="font-medium">Manage Links</span>
            </Link>
            <Link href="/connect-stripe" className="group flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <CreditCardIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
              <span className="font-medium">Payments Setup</span>
            </Link>
          </nav>
        </div>
        <div className="mt-auto pt-6 border-t border-gray-200">
          <form action={handleLogoutAction}>
            <button type="submit" className="group flex items-center space-x-3 w-full px-3 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors">
              <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-500 group-hover:text-red-600 transition-colors" /> 
              <span className="font-medium">Log Out</span>
            </button>
          </form>
           {session?.user?.email && (
            <p className="text-xs text-gray-500 mt-3 p-2 text-center break-all">
              {session.user.email}
            </p>
           )}
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}