const express = require("express");
const router = express.Router();
// auth middleware to protect routes
const { auth, authRole } = require('../../middleware/auth');


//Question Model : use capital letters since it's a model
const Question = require('../../models/Question');
const Quiz = require('../../models/Quiz');
const Category = require('../../models/Category');

// @route GET api/questions
// @route Get All questions
// @route Public

//we use router. instead of app. and / because we are already in this dir
router.get('/', async (req, res) => {

  try {
    const questions = await Question.find()
      //sort questions by creation_date
      .sort({ creation_date: -1 })
      .populate('category')
      .populate('quiz')
      .populate('created_by')

    if (!questions) throw Error('No questions found');

    res.status(200).json(questions);
  } catch (err) {
    res.status(400).json({ msg: err.message })
  }
});

// GET ENDPOINT //
// @route GET api/questions/:id
// @route GET one Question
// @route Private
//:id placeholder, findId=we get it from the parameter in url

router.get('/:id', auth, async (req, res) => {
  try {
    //Find the question by id
    await Question.findById(req.params.id, (err, question) => {
      res.status(200).json(question);
    })
      // Use the name of the schema path instead of the collection name
      .populate('category')
      .populate('quiz')

  } catch (err) {
    res.status(400).json({
      msg: 'Failed to retrieve! ' + err.message,
      success: false
    });
  }

});

// @route POST api/questions
// @route Create a Question
// @route Accessed by Admin and Creator
router.post("/", auth, authRole(['Admin', 'Creator']), async (req, res) => {

  try {
    let qtn = await Question.findOne({ questionText: req.body.questionText });

    if (qtn) {
      return res.status(400).json({ msg: 'A question with same name already exists!' });
    }

    const newQuestion = new Question(req.body);
    const savedQuestion = await newQuestion.save();

    // Update the Quiz on Question creation
    await Quiz.updateOne(
      { "_id": req.body.quiz },
      { $addToSet: { "questions": savedQuestion._id } }
    );

    if (!savedQuestion) throw Error('Something went wrong during creation!');

    res.status(200).json(savedQuestion);

  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({msg: err.errors});
    }
    res.status(500).json({msg: 'Something went wrong'});
  }
});

// @route PUT api/questions/:id
// @route Move question from one quiz to another
// @access Private: Accessed by admin only

router.put('/:id', authRole(['Creator', 'Admin']), async (req, res) => {

  try {
    //Find the Question by id
    const question = await Question.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true })
    res.status(200).json(question);

    // Delete Question in old quiz
    await Quiz.updateOne(
      { _id: req.body.oldQuizID },
      { $pull: { questions: question._id } }
    );

    // Update the Quiz on Question updating
    await Quiz.updateOne(
      { "_id": req.body.quiz },
      { $addToSet: { "questions": question._id } }
    );

  } catch (err) {
    res.status(400).json({
      msg: 'Failed to update! ' + err.message,
      success: false
    });
  }
});


// @route DELETE api/questions
// @route delete a Question
// @route Private: Accessed by admin only

//:id placeholder, findId=we get it from the parameter in url
router.delete('/:id', auth, authRole(['Creator', 'Admin']), async (req, res) => {

  try {
    //Find the Question to delete by id first
    const question = await Question.findById(req.params.id);
    if (!question) throw Error('Question is not found!')

    // Remove question from questions of the quiz
    await Quiz.updateOne(
      { _id: question.quiz },
      { $pull: { questions: question._id } }
    );

    // Delete the question
    const removedQuestion = await question.remove();

    if (!removedQuestion)
      throw Error('Something went wrong while deleting!');

    res.status(200).json({ msg: "Deleted successfully!" });

  } catch (err) {
    res.status(400).json({
      success: false,
      msg: err.message
    });
  }
});

module.exports = router;