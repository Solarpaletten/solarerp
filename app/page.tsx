import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="text-center px-4">
        {/* Logo/Title */}
        <h1 className="text-5xl font-bold text-white mb-4">
          Solar Sprint
        </h1>
        
        {/* Tagline */}
        <p className="text-xl text-blue-100 mb-2">
          Task management for modern teams
        </p>
        
        {/* Description */}
        <p className="text-blue-200 mb-8 max-w-md mx-auto">
          Organize your projects, track progress, and collaborate 
          with your team in one powerful platform.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

