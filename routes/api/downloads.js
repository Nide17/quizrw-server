const express = require('express');
const router = express.Router();

// Download Model
const Download = require('../../models/Download');
const { auth, authRole } = require('../../middleware/auth');

// @route   GET /api/downloads
// @desc    Get the downloads
// @access  Needs to private
router.get('/', authRole(['Creator', 'Admin']), async (req, res) => {

    try {
        const downloads = await Download.find()
            //sort downloads by createdAt
            .sort({ createdAt: -1 })
            .populate('notes')
            .populate('chapter')
            .populate('course')
            .populate('courseCategory')
            .populate('downloaded_by')

        if (!downloads) throw Error('No downloads found!');

        res.status(200).json(downloads);

    } catch (err) {
        res.status(400).json({ msg: err.message })
    }
});

// @route   POST /api/downloads
// @desc    Save the download
// @access  Needs to private
router.post('/', auth, async (req, res) => {

    const { notes, chapter, course, courseCategory, downloaded_by } = req.body;

    // Simple validation
    if (!notes || !downloaded_by) {
        return res.status(400).json({ msg: 'Please fill required fields' });
    }

    try {
        const newDownload = new Download({
            notes,
            chapter,
            course,
            courseCategory,
            downloaded_by
        });

        const savedDownload = await newDownload.save();
        if (!savedDownload) throw Error('Something went wrong during creation!');

        res.status(200).json({
            _id: savedDownload._id,
            notes: savedDownload.notes,
            chapter: savedDownload.chapter,
            course: savedDownload.course,
            courseCategory: savedDownload.course,
            downloaded_by: savedDownload.downloaded_by,
            createdAt: savedDownload.createdAt,
        });

    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// @route DELETE api/downloads
// @route delete a download
// @route Private: Accessed by admin only
//:id placeholder, findById = we get it from the parameter in url

router.delete('/:id', authRole(['Creator', 'Admin']), async (req, res) => {

    try {
        const download = await Download.findById(req.params.id);
        if (!download) throw Error('Download is not found!')

        // Delete Download
        const removedDownload = await download.remove();

        if (!removedDownload)
            throw Error('Something went wrong while deleting!');

    } catch (err) {
        res.status(400).json({
            success: false,
            msg: err.message
        });
    }
});

module.exports = router;