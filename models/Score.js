// Bring in Mongo
const mongoose = require('mongoose');

//initialize Mongo schema
const Schema = mongoose.Schema;

//create a schema object
const ScoreSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    marks: {
        type: Number,
        required: true
    },
    out_of: {
        type: Number,
        required: true
    },
    test_date: {
        type: Date,
        default: Date.now
    },
    review: {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true
        },
        questions: [
            {
                questionText: {
                    type: String,
                    required: true
                },

                answerOptions: {
                    type: [
                        {
                            answerText: {
                                type: String,
                                required: true
                            },
                            explanations: {
                                type: String,
                                required: false,
                                default: null
                            },
                            isCorrect: {
                                type: Boolean,
                                required: true,
                                default: false
                            },
                            choosen: {
                                type: Boolean,
                                required: true,
                                default: false
                            }
                        }
                    ]
                }
            }
        ]

    }, 
    category: {
        type: Schema.Types.ObjectId,
        ref: 'category'
    },
    quiz: {
        type: Schema.Types.ObjectId,
        ref: 'quiz'
    },
    taken_by: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    }
});

//Score: the name of this model
module.exports = mongoose.model('score', ScoreSchema);