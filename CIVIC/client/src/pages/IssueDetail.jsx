import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const STATUSES = ['pending', 'in-progress', 'resolved'];
const DEPARTMENTS = [
  'Roads & Infrastructure', 'Electricity Department',
  'Solid Waste Management', 'Water & Sanitation', 'General Administration',
];

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [govForm, setGovForm] = useState({ status: '', remark: '', assignedDepartment: '' });
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const fetchIssue = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/issues/${id}`);
      setIssue(res.data);
      setGovForm({
        status: res.data.status,
        remark: res.data.governmentRemarks || '',
        assignedDepartment: res.data.assignedDepartment || '',
      });
    } catch {
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      const res = await api.post(`/issues/${id}/upvote`);
      setIssue((prev) => ({ ...prev, upvotes: res.data.upvotes, upvotedBy: res.data.upvotedBy }));
    } catch {/* ignore */}
  };

  const handleGovUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}/status`, govForm);
      setIssue(res.data);
      setToast('Issue updated successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(err.response?.data?.message || 'Update failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue? This action cannot be undone.')) return;
    try {
      await api.delete(`/issues/${id}`);
      navigate('/gov-dashboard');
    } catch {/* ignore */}
  };

  const hasUpvoted = issue?.upvotedBy?.includes(user?._id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin text-5xl">⚙️</div>
      </div>
    );
  }

  if (!issue) return null;

  const date = new Date(issue.createdAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="text-blue-700 text-sm hover:underline mb-5 block">
          ← Back
        </button>

        {toast && (
          <div className="mb-4 px-5 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Image */}
            {issue.imageUrl ? (
              <img
                src={`http://localhost:5000${issue.imageUrl}`}
                alt={issue.title}
                className="w-full h-64 object-cover rounded-2xl shadow"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center text-6xl">
                📍
              </div>
            )}

            {/* Title & status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-xl font-bold text-gray-900">{issue.title}</h1>
                <StatusBadge status={issue.status} />
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{issue.description}</p>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">Category</span>
                  <span className="font-medium text-gray-700">{issue.category}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Department</span>
                  <span className="font-medium text-gray-700">{issue.assignedDepartment || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Reported by</span>
                  <span className="font-medium text-gray-700">{issue.citizen?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Date</span>
                  <span className="font-medium text-gray-700">{date}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Location</span>
                  <span className="font-medium text-gray-700">
                    {issue.location?.address ||
                      `${issue.location?.coordinates?.[1]?.toFixed(5)}, ${issue.location?.coordinates?.[0]?.toFixed(5)}`}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Upvotes</span>
                  <span className="font-medium text-gray-700">{issue.upvotes}</span>
                </div>
              </div>

              {/* Upvote */}
              {user?.role === 'citizen' && (
                <button
                  onClick={handleUpvote}
                  className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                    hasUpvoted
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  👍 {hasUpvoted ? 'Upvoted' : 'Upvote'} ({issue.upvotes})
                </button>
              )}

              {/* Government remarks */}
              {issue.governmentRemarks && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Government Remarks</p>
                  <p className="text-sm text-gray-700">{issue.governmentRemarks}</p>
                </div>
              )}
            </div>

            {/* Status history */}
            {issue.statusHistory?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 mb-4">Status Timeline</h2>
                <div className="space-y-4">
                  {[...issue.statusHistory].reverse().map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          h.status === 'resolved' ? 'bg-green-500' :
                          h.status === 'in-progress' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        {i < issue.statusHistory.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-100 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <StatusBadge status={h.status} />
                        {h.remark && <p className="text-xs text-gray-600 mt-1">{h.remark}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(h.updatedAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: gov actions */}
          {user?.role === 'government' && (
            <div className="space-y-5">
              <form
                onSubmit={handleGovUpdate}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
              >
                <h2 className="font-semibold text-gray-800">Update Issue</h2>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={govForm.status}
                    onChange={(e) => setGovForm({ ...govForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select
                    value={govForm.assignedDepartment}
                    onChange={(e) => setGovForm({ ...govForm, assignedDepartment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remark</label>
                  <textarea
                    rows={3}
                    value={govForm.remark}
                    onChange={(e) => setGovForm({ ...govForm, remark: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add official remarks…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition"
                >
                  {updating ? 'Updating…' : 'Update Issue'}
                </button>
              </form>

              <button
                onClick={handleDelete}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
              >
                🗑 Delete Issue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
