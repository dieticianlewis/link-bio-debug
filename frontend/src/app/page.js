// frontend/src/app/page.js
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800">
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            YourLink
          </span>
          <span className="dark:text-white text-gray-800"> InBio</span>
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-10">
          Create a personalized page to share all your important links and allow your audience to support you directly.
        </p>
        <div className="space-y-4 sm:space-y-0 sm:space-x-4">
          <Link
            href="/signup"
            className="inline-block w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:-translate-y-0.5"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="inline-block w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-semibold py-3 px-8 rounded-lg text-lg shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:-translate-y-0.5"
          >
            Log In
          </Link>
        </div>
      </div>
      <footer className="absolute bottom-8 text-gray-500 dark:text-gray-400 text-sm">
        Powered by You
      </footer>
    </div>
  );
}