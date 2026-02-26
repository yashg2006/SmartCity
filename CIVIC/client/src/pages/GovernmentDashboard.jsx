import { useEffect, useState } from 'react';
import api from '../api/axios';
import IssueCard from '../components/IssueCard';
import IssueMap from '../components/IssueMap';

const STATUSES = ['', 'pending', 'in-progress', 'resolved'];
const CATEGORIES = ['', 'Pothole', 'Streetlight', 'Garbage', 'Drainage', 'Water Leakage', 'Others'];
const DEPARTMENTS = [
  '', 'Roads & Infrastructure', 'Electricity Department',
  'Solid Waste Management', 'Water & Sanitation', 'General Administration',
];

export default function GovernmentDashboard() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mapIssues, setMapIssues] = useState([]);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMapIssues();
  }, []);

  const fetchMapIssues = async () => {
    try {
      const res = await api.get('/issues?limit=500&page=1');
      setMapIssues(res.data.issues);
    } catch {/* ignore */}
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, categoryFilter, deptFilter, page]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/issues/stats');
      setStats(res.data);
    } catch {/* ignore */}
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (deptFilter) params.set('department', deptFilter);

      const res = await api.get(`/issues?${params}`);
      setIssues(res.data.issues);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {/* ignore */}
    finally { setLoading(false); }
  };

  const statCards = stats
    ? [
        { label: 'Total Issues',  value: stats.total,      icon: '📋', color: 'blue'   },
        { label: 'Pending',       value: stats.pending,    icon: '🔴', color: 'red'    },
        { label: 'In Progress',   value: stats.inProgress, icon: '🟡', color: 'yellow' },
        { label: 'Resolved',      value: stats.resolved,   icon: '🟢', color: 'green'  },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Government Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Review, assign, and resolve citizen-reported civic issues</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {stats?.categoryStats?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm">Issue Breakdown by Category</h2>
            <div className="flex flex-wrap gap-3">
              {stats.categoryStats.map((c) => (
                <div key={c._id} className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                  <span className="text-sm font-semibold text-blue-800">{c._id}</span>
                  <span className="text-xs bg-blue-700 text-white rounded-full px-2 py-0.5">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">🗺️ Live Issues Heatmap</h2>
            <button
              onClick={() => setShowMap((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
          {showMap && <IssueMap issues={mapIssues} title="All Civic Issues" />}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || 'All Categories'}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d || 'All Departments'}</option>
            ))}
          </select>
          <span className="self-center text-sm text-gray-400">{total} issues</span>
        </div>

        {/* Issues grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">✅</p>
            <h3 className="font-semibold text-gray-700 text-lg">No issues match your filters</h3>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {issues.map((issue) => (
                <IssueCard key={issue._id} issue={issue} govView />
              ))}
            </div>

            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(pages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
                      page === i + 1
                        ? 'bg-blue-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
