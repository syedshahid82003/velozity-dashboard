import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-red-400">403</h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-800">Access Denied</h2>
        <p className="mt-2 text-sm text-gray-500">You don't have permission to view this page.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
