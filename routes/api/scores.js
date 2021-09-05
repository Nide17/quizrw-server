const express = require("express");
const router = express.Router();

// auth middleware to protect routes
const { auth, authRole } = require('../../middleware/auth');

//Score Model : use capital letters since it's a model
const Score = require('../../models/Score');

// @route GET api/scores
// @route Get All scores
// @route Private: accessed by logged in user
router.get('/', auth, async (req, res) => {

  // Pagination
  const totalPages = await Score.countDocuments({});
  var PAGE_SIZE = 20
  var pageNo = parseInt(req.query.pageNo || "0")
  var query = {}

  query.limit = PAGE_SIZE
  query.skip = PAGE_SIZE * (pageNo - 1)

  try {

    const scores = pageNo > 0 ?
      await Score.find({}, {}, query)

        //sort scores by creation_date

        .sort({ test_date: -1 })
        .populate('quiz')
        .populate('category')
        .populate('taken_by') :

      await Score.find()

        //sort scores by creation_date
        .sort({ test_date: -1 })
        .populate('quiz')
        .populate('category')
        .populate('taken_by')

    if (!scores) throw Error('No scores exist');

    res.status(200).json({
      totalPages: Math.ceil(totalPages / PAGE_SIZE),
      scores
    });

  } catch (err) {
    res.status(400).json({ msg: err.message })
  }
});


// @route   GET /api/scores/:id
// @desc    Get one score
// @access  Needs to private
router.get('/:id', auth, async (req, res) => {

  let id = req.params.id;
  try {
    //Find the score by id
    await Score.findOne({ id }, (err, score) => {
      res.status(200).json(score);
    })
      // Use the name of the schema path instead of the collection name
      .populate('category')
      .populate('quiz')
      .populate('user')

  } catch (err) {
    res.status(400).json({
      msg: 'Failed to retrieve! ' + err.message,
      success: false
    });
  }

});

// @route   GET /api/scores/taken-by/:id
// @desc    Get all scores by taker
// @access  Needs to private
router.get('/taken-by/:id', auth, async (req, res) => {

  let id = req.params.id;
  try {
    //Find the scores by id
    await Score.find({ taken_by: id }, (err, scores) => {
      res.status(200).json(scores);
    })
      // Use the name of the schema path instead of the collection name
      .populate('category')
      .populate('quiz')
      .populate('user')

  } catch (err) {
    res.status(400).json({
      msg: 'Failed to retrieve! ' + err.message,
      success: false
    });
  }

});

// @route POST api/scores
// @route Create a Score
// @route Private: accessed by logged in user

router.post('/', auth, async (req, res) => {

  const { id, marks, out_of, category, quiz, review, taken_by } = req.body;

  // Simple validation
  if (!id || !marks || !category || !out_of || !quiz || !review || !taken_by) {
    return res.status(400).json({ msg: 'There are missing info!' });
  }

  try {
    const scoreExist = await Score.findOne({ id });
    if (scoreExist) throw Error('Score already exists!');

    const newScore = new Score({
      id,
      marks,
      out_of,
      category,
      quiz,
      review,
      taken_by
    });

    const savedScore = await newScore.save();

    if (!savedScore) throw Error('Something went wrong during creation!');

    res.status(200).json({
      _id: savedScore._id,
      id: savedScore.id,
      marks: savedScore.marks,
      category: savedScore.category,
      quiz: savedScore.quiz,
      review: savedScore.review,
      taken_by: savedScore.taken_by
    });

  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// @route DELETE api/scores
// @route delete a Score
// @route Private: Accessed by admin only
router.delete('/:id', auth, authRole(['Admin']), (req, res) => {

  //Find the Score to delete by id first
  Score.findById(req.params.id)

    //returns promise 
    .then(score => score.remove().then(() => res.json({ success: true })))
    // if id not exist or if error
    .catch(err => res.status(404).json({ success: false }));
});

module.exports = router;