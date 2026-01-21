'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardState = {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
};

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    projects: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userId = localStorage.getItem('userId');
        
        const response = await fetch('/api/projects', {
          headers: {
            'x-user-id': userId || '',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const projects = await response.json();
        setState({ projects, isLoading: false, error: null });
      } catch (error) {
        setState({
          projects: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load projects',
        });
      }
    };

    fetchProjects();
  }, []);

  const recentProjects = state.projects.slice(0, 3);

  if (state.isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Solar Sprint</h1>
      <p className="text-gray-600 mb-8">Manage your projects and track progress</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-blue-600">{state.projects.length}</div>
          <div className="text-gray-500">Total Projects</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-600">{state.projects.length}</div>
          <div className="text-gray-500">Active Projects</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-purple-600">0</div>
          <div className="text-gray-500">Completed Tasks</div>
        </div>
      </div>

      {/* New Project Button */}
      <Link
        href="/dashboard/projects"
        className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-8"
      >
        New Project
      </Link>

      {/* Recent Projects */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Projects</h2>

      {state.error && (
        <p className="text-red-600 mb-4">{state.error}</p>
      )}

      {recentProjects.length === 0 ? (
        <p className="text-gray-500">No projects yet. Create your first project!</p>
      ) : (
        <div className="space-y-4">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-900">{project.name}</h3>
              {project.description && (
                <p className="text-gray-500 text-sm mt-1">{project.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

