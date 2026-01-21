'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type PageState = {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
};

type EditFormState = {
  isEditing: boolean;
  name: string;
  description: string;
  isSubmitting: boolean;
  error: string | null;
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [state, setState] = useState<PageState>({
    project: null,
    isLoading: true,
    error: null,
  });

  const [form, setForm] = useState<EditFormState>({
    isEditing: false,
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

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: getAuthHeaders(),
        });

        if (response.status === 404) {
          setState({ project: null, isLoading: false, error: 'Project not found' });
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch project');

        const project = await response.json();
        setState({ project, isLoading: false, error: null });
      } catch (error) {
        setState({
          project: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load project',
        });
      }
    };

    fetchProject();
  }, [projectId]);

  const handleEdit = () => {
    if (!state.project) return;
    setForm({
      isEditing: true,
      name: state.project.name,
      description: state.project.description || '',
      isSubmitting: false,
      error: null,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setForm((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update project');
      }

      const updatedProject = await response.json();
      setState((prev) => ({ ...prev, project: updatedProject }));
      setForm({
        isEditing: false,
        name: '',
        description: '',
        isSubmitting: false,
        error: null,
      });
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      }));
    }
  };

  const handleDelete = async () => {
    if (!state.project) return;
    if (!window.confirm(`Delete "${state.project.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete project');
      router.push('/dashboard/projects');
    } catch (error) {
      alert('Failed to delete project');
    }
  };

  if (state.isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (state.error || !state.project) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">{state.error || 'Project not found'}</div>
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline">
          Projects
        </Link>
        <span className="mx-2">›</span>
        <span>{state.project.name}</span>
      </div>

      {/* Project Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {form.isEditing ? (
          /* Edit Mode */
          <form onSubmit={handleSave}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Project</h2>

            {form.error && (
              <p className="text-red-600 text-sm mb-4">{form.error}</p>
            )}

            <div className="space-y-4">
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
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={form.isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {form.isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, isEditing: false }))}
                  className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* View Mode */
          <>
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{state.project.name}</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="text-gray-600 mt-4">
              {state.project.description || (
                <span className="text-gray-400 italic">No description</span>
              )}
            </div>

            <div className="text-sm text-gray-400 mt-6 pt-4 border-t border-gray-100">
              <div>Created: {new Date(state.project.createdAt).toLocaleString()}</div>
              <div>Updated: {new Date(state.project.updatedAt).toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

