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

type PageState = {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
};

type CreateFormState = {
  isOpen: boolean;
  name: string;
  description: string;
  isSubmitting: boolean;
  error: string | null;
};

export default function ProjectsPage() {
  const [state, setState] = useState<PageState>({
    projects: [],
    isLoading: true,
    error: null,
  });

  const [form, setForm] = useState<CreateFormState>({
    isOpen: false,
    name: '',
    description: '',
    isSubmitting: false,
    error: null,
  });

  const getAuthHeaders = () => {
    const userId = localStorage.getItem('userId');
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId || '',
    };
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch projects');

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

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setForm((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      setForm({
        isOpen: false,
        name: '',
        description: '',
        isSubmitting: false,
        error: null,
      });

      fetchProjects();
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }));
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete project');

      fetchProjects();
    } catch (error) {
      alert('Failed to delete project');
    }
  };

  if (state.isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <button
          onClick={() => setForm((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Create Form */}
      {form.isOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h2>
          
          {form.error && (
            <p className="text-red-600 text-sm mb-4">{form.error}</p>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="My Project"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Project description..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {form.isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <p className="text-red-600 mb-4">{state.error}</p>
      )}

      {/* Projects Grid */}
      {state.projects.length === 0 ? (
        <p className="text-gray-500">No projects yet. Create your first project!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.projects.map((project) => (
            <div
              key={project.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {project.name}
                </Link>
                <button
                  onClick={() => handleDelete(project)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  🗑️
                </button>
              </div>
              {project.description && (
                <p className="text-gray-500 text-sm mb-3">{project.description}</p>
              )}
              <p className="text-gray-400 text-xs">
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

