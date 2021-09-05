const express = require("express");
const router = express.Router();
const { auth, authRole } = require('../../middleware/auth');

// CourseCategory Model
const CourseCategory = require('../../models/CourseCategory');
const Course = require('../../models/Course');
const Chapter = require('../../models/Chapter');
const Notes = require('../../models/Notes');

// @route   GET /api/courseCategories
// @desc    Get courseCategories
// @access  Public

router.get('/', auth, async (req, res) => {

    try {
        const courseCategories = await CourseCategory.find()
            //sort courseCategories by createdAt
            .sort({ createdAt: -1 })

        if (!courseCategories) throw Error('No course categories found!');

        res.status(200).json(courseCategories);

    } catch (err) {
        res.status(400).json({ msg: err.message })
    }
});

// @route   GET /api/courseCategories/:id
// @desc    Get one category
// @access Private: accessed by logged in user
router.get('/:id', auth, async (req, res) => {

    let id = req.params.id;
    try {
        //Find the Category by id
        await CourseCategory.findById(id, (err, category) => {
            res.status(200).json(category);
        })

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to retrieve! ' + err.message,
            success: false
        });
    }
});

// @route   POST /api/courseCategories
// @desc    Create a course category
// @access Private: Accessed by admin only

router.post('/', authRole(['Admin']), async (req, res) => {
    const { title, description, created_by } = req.body;

    // Simple validation
    if (!title || !description) {
        return res.status(400).json({ msg: 'Please fill all fields' });
    }

    try {
        const courseCategory = await CourseCategory.findOne({ title });
        if (courseCategory) throw Error('Category already exists!');

        const newCourseCategory = new CourseCategory({
            title,
            description,
            created_by
        });

        const savedCourseCategory = await newCourseCategory.save();
        if (!savedCourseCategory) throw Error('Something went wrong during creation!');

        res.status(200).json({
            _id: savedCourseCategory._id,
            title: savedCourseCategory.title,
            description: savedCourseCategory.description,
            createdAt: savedCourseCategory.createdAt,
            quizes: savedCourseCategory.quizes,
            created_by: savedCourseCategory.created_by
        });

    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// @route PUT api/courseCategories/:id
// @route UPDATE one course category
// @access Private: Accessed by admin only

router.put('/:id', authRole(['Admin']), async (req, res) => {

    try {
        //Find the course category by id
        const courseCategory = await CourseCategory.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true })
        res.status(200).json(courseCategory);

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to update! ' + err.message,
            success: false
        });
    }
});

// @route DELETE api/courseCategories/:id
// @route delete a course Category
// @route Private: Accessed by admin only
//:id placeholder, findById = we get it from the parameter in url

router.delete('/:id', authRole(['Admin']), async (req, res) => {

    try {
        const courseCategory = await CourseCategory.findById(req.params.id);
        if (!courseCategory) throw Error('Course category is not found!')

        // Delete courses belonging to this category
        await Course.remove({ category: courseCategory._id });

        // Delete chapters belonging to this category
        await Chapter.remove({ category: courseCategory._id });

        // Delete notes belonging to this category
        await Notes.remove({ category: courseCategory._id });

        // Delete this category
        const removedCategory = await courseCategory.remove();

        if (!removedCategory)
            throw Error('Something went wrong while deleting!');

    } catch (err) {
        res.status(400).json({
            success: false,
            msg: err.message
        });
    }

});

module.exports = router;