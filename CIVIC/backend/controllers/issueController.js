import Issue from '../models/Issue.js';
import path from 'path';

const DEPARTMENT_MAP = {
  Pothole: 'Roads & Infrastructure',
  Streetlight: 'Electricity Department',
  Garbage: 'Solid Waste Management',
  Drainage: 'Water & Sanitation',
  'Water Leakage': 'Water & Sanitation',
  Others: 'General Administration',
};

// ──────────────── CITIZEN ────────────────

// POST /api/issues
export const createIssue = async (req, res) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;

    const imageUrl = req.file
      ? `/uploads/issues/${req.file.filename}`
      : '';

    const issue = await Issue.create({
      title,
      description,
      category,
      imageUrl,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || '',
      },
      citizen: req.user.id,
      assignedDepartment: DEPARTMENT_MAP[category] || 'General Administration',
      statusHistory: [
        {
          status: 'pending',
          remark: 'Issue submitted',
          updatedBy: req.user.id,
        },
      ],
    });

    // Emit socket event for new issue
    req.io?.emit('new_issue', issue);

    const populated = await issue.populate('citizen', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/issues/my  — citizen's own issues
export const getMyIssues = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const filter = { citizen: req.user.id };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('citizen', 'name email');

    const total = await Issue.countDocuments(filter);
    res.json({ issues, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/issues/:id/upvote
export const upvoteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const alreadyUpvoted = issue.upvotedBy.includes(req.user.id);
    if (alreadyUpvoted) {
      issue.upvotes -= 1;
      issue.upvotedBy = issue.upvotedBy.filter(
        (uid) => uid.toString() !== req.user.id
      );
    } else {
      issue.upvotes += 1;
      issue.upvotedBy.push(req.user.id);
    }

    await issue.save();
    res.json({ upvotes: issue.upvotes, upvotedBy: issue.upvotedBy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ──────────────── GOVERNMENT ────────────────

// GET /api/issues  — all issues (with filters)
export const getAllIssues = async (req, res) => {
  try {
    const { status, category, department, page = 1, limit = 20, lat, lng, radius } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.assignedDepartment = department;

    // Geo filter
    if (lat && lng && radius) {
      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      };
    }

    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('citizen', 'name email phone');

    const total = await Issue.countDocuments(filter);
    res.json({ issues, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/issues/map  — lightweight, all issues, accessible to any logged-in user
export const getMapIssues = async (req, res) => {
  try {
    const issues = await Issue.find({})
      .select('title category status location upvotes createdAt citizen')
      .populate('citizen', 'name')
      .lean();
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/issues/stats
export const getStats = async (req, res) => {
  try {
    const [total, pending, inProgress, resolved] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'pending' }),
      Issue.countDocuments({ status: 'in-progress' }),
      Issue.countDocuments({ status: 'resolved' }),
    ]);

    const categoryStats = await Issue.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ total, pending, inProgress, resolved, categoryStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/issues/:id
export const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('citizen', 'name email phone');
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/issues/:id/status  — government updates status + remark
export const updateIssueStatus = async (req, res) => {
  try {
    const { status, remark, assignedDepartment } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    issue.status = status || issue.status;
    if (remark) issue.governmentRemarks = remark;
    if (assignedDepartment) issue.assignedDepartment = assignedDepartment;

    issue.statusHistory.push({
      status: issue.status,
      remark: remark || '',
      updatedBy: req.user.id,
    });

    await issue.save();

    // Emit socket event to citizen
    req.io?.to(issue.citizen.toString()).emit('issue_updated', {
      issueId: issue._id,
      status: issue.status,
      remark: remark || '',
    });

    const populated = await issue.populate('citizen', 'name email phone');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/issues/:id  — government only
export const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
