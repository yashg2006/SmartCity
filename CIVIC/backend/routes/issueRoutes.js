import express from 'express';
import protect from '../middleware/authMiddleware.js';
import restrictTo from '../middleware/roleMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  createIssue,
  getMyIssues,
  getAllIssues,
  getIssueById,
  updateIssueStatus,
  deleteIssue,
  upvoteIssue,
  getStats,
  getMapIssues,
} from '../controllers/issueController.js';

const router = express.Router();

// --- Stats (government) ---
router.get('/stats', protect, restrictTo('government'), getStats);

// --- Map view (all logged-in users) ---
router.get('/map', protect, getMapIssues);

// --- Citizen routes ---
router.post('/', protect, restrictTo('citizen'), upload.single('image'), createIssue);
router.get('/my', protect, restrictTo('citizen'), getMyIssues);
router.post('/:id/upvote', protect, upvoteIssue);

// --- Government routes ---
router.get('/', protect, restrictTo('government'), getAllIssues);
router.put('/:id/status', protect, restrictTo('government'), updateIssueStatus);
router.delete('/:id', protect, restrictTo('government'), deleteIssue);

// --- Shared ---
router.get('/:id', protect, getIssueById);

export default router;
