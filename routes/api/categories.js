const express = require("express");
const router = express.Router();

// Category Model
const Category = require('../../models/Category');
const Quiz = require('../../models/Quiz');
const Question = require('../../models/Question');

const { auth, authRole } = require('../../middleware/auth');

// @route   GET /api/categories
// @desc    Get categories
// @access  Public

router.get('/', async (req, res) => {

    try {
        const categories = await Category.find()
            //sort categories by creation_date
            .sort({ creation_date: -1 })
            .populate('quizes')

        if (!categories) throw Error('No categories found');

        res.status(200).json(categories);

    } catch (err) {
        res.status(400).json({ msg: err.message })
    }
});

// @route   GET /api/categories/:id
// @desc    Get one category
// @access Private: accessed by logged in user
router.get('/:id', auth, async (req, res) => {

    let id = req.params.id;
    try {
        //Find the Category by id
        await Category.findById(id, (err, category) => {
            res.status(200).json(category);
        })
            // Use the name of the schema path instead of the collection name
            .populate('quizes')

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to retrieve! ' + err.message,
            success: false
        });
    }
});

// @route   POST /api/categories
// @desc    Create a category
// @access Private: Accessed by admin only

router.post('/', auth, authRole(['Admin']), async (req, res) => {
    const { title, description, quizes, created_by, creation_date } = req.body;

    // Simple validation
    if (!title || !description) {
        return res.status(400).json({ msg: 'Please fill all fields' });
    }

    try {
        const category = await Category.findOne({ title });
        if (category) throw Error('Category already exists!');

        const newCategory = new Category({
            title,
            description,
            creation_date,
            quizes,
            created_by
        });

        const savedCategory = await newCategory.save();
        if (!savedCategory) throw Error('Something went wrong during creation!');

        res.status(200).json({
            _id: savedCategory._id,
            title: savedCategory.title,
            description: savedCategory.description,
            creation_date: savedCategory.creation_date,
            quizes: savedCategory.quizes,
            created_by: savedCategory.created_by
        });

    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// @route PUT api/categories/:id
// @route UPDATE one Category
// @access Private: Accessed by admin only

router.put('/:id', auth, authRole(['Admin']), async (req, res) => {

    try {
        //Find the Category by id
        const category = await Category.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true })
        res.status(200).json(category);

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to update! ' + err.message,
            success: false
        });
    }
});

// @route DELETE api/categories/:id
// @route delete a Category
// @route Private: Accessed by admin only
//:id placeholder, findById = we get it from the parameter in url

router.delete('/:id', auth, authRole(['Admin']), async (req, res) => {

    try {
        const category = await Category.findById(req.params.id);
        if (!category) throw Error('Category is not found!')

        // Delete questions belonging to this quiz
        await Question.remove({ category: category._id });

        // Delete quizes belonging to this category
        await Quiz.remove({ category: category._id });

        // Delete this category
        const removedCategory = await category.remove();

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