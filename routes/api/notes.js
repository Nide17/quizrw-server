const express = require('express');
const router = express.Router();
const config = require('config')
const AWS = require('aws-sdk');
const { notesUpload } = require('./utils/notesUpload.js');

const s3Config = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || config.get('AWSAccessKeyId'),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || config.get('AWSSecretKey'),
    Bucket: process.env.S3_BUCKET_NOTES || config.get('S3NotesBucket')
});

// Notes Model
const Notes = require('../../models/Notes');
const Download = require('../../models/Download');
const { auth, authRole } = require('../../middleware/auth');

// @route   GET /api/notes
// @desc    Get notes
// @access  Public
router.get('/', auth, async (req, res) => {

    try {
        const notes = await Notes.find()
            //sort notes by createdAt
            .sort({ createdAt: 1 })

        if (!notes) throw Error('No notes found!');

        res.status(200).json(notes);

    } catch (err) {
        res.status(400).json({ msg: err.message })
    }
});

// @route   GET /api/notes/chapter/:id
// @desc    Get all notes by chapter id
// @access  Needs to private
router.get('/chapter/:id', auth, async (req, res) => {

    let id = req.params.id;
    try {
        //Find the notes by id
        await Notes.find({ chapter: id }, (err, notes) => {
            res.status(200).json(notes)
        })
            .populate('chapter')

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to retrieve! ' + err.message,
            success: false
        });
    }
});

// @route   GET /api/notes/:id
// @desc    Get one note
// @access Private: accessed by logged in user
router.get('/:id', auth, async (req, res) => {

    let id = req.params.id;
    try {
        //Find the note by id
        await Notes.findById(id, (err, note) => {
            res.status(200).json(note);
        })

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to retrieve! ' + err.message,
            success: false
        });
    }
});

// @route   POST /api/notes
// @desc    Create a note
// @access Private: Accessed by admin only
router.post('/', authRole(['Creator', 'Admin']), notesUpload.single('notes_file'), async (req, res) => {

    const { title, description, courseCategory, course, chapter, created_by } = req.body;

    // Simple validation
    if (!title || !description || !courseCategory || !course) {
        return res.status(400).json({ msg: 'Please fill all fields' });
    }

    if (!req.file) {
        //If the file is not uploaded, then throw custom error with message: FILE_MISSING
        throw Error('FILE_MISSING')
    }

    else {
        //If the file is uploaded
        const nt_file = req.file

        try {

            const note = await Notes.findOne({ title });
            if (note) throw Error('Failed! notes already exists!');

            const newNotes = new Notes({
                title,
                description,
                notes_file: nt_file.location,
                courseCategory,
                course,
                chapter,
                created_by
            });

            const savedNotes = await newNotes.save();
            if (!savedNotes) throw Error('Something went wrong during creation!');

            res.status(200).json({
                _id: savedNotes._id,
                title: savedNotes.title,
                notes_file: savedNotes.notes_file,
                description: savedNotes.description,
                courseCategory: savedNotes.courseCategory,
                course: savedNotes.course,
                chapter: savedNotes.chapter,
                created_by: savedNotes.created_by,
                createdAt: savedNotes.createdAt,
            });

        } catch (err) {
            res.status(400).json({ msg: err.message });
        }
    }
});

// @route PUT api/notes/:id
// @route UPDATE one notes
// @access Private: Accessed by admin only
router.put('/:id', authRole(['Creator', 'Admin']), async (req, res) => {

    try {
        //Find the notes by id
        const notes = await Notes.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true })
        res.status(200).json(notes);

    } catch (err) {
        res.status(400).json({
            msg: 'Failed to update! ' + err.message,
            success: false
        });
    }
});

// @route DELETE api/notes/:id
// @route delete a notes
// @route Private: Accessed by admin only
//:id placeholder, findById = we get it from the parameter in url
router.delete('/:id', authRole(['Creator', 'Admin']), async (req, res) => {

    try {
        const notes = await Notes.findById(req.params.id);
        if (!notes) throw Error('Notes not found!')

        const params = {
            Bucket: process.env.S3_BUCKET_NOTES || config.get('S3NotesBucket'),
            Key: notes.notes_file.split('/').pop() //if any sub folder-> path/of/the/folder.ext
        }

        try {
            await s3Config.deleteObject(params, (err, data) => {
                if (err) {
                    res.status(400).json({ msg: err.message });
                    console.log(err, err.stack); // an error occurred
                }
                else {
                    res.status(200).json({ msg: 'deleted!' });
                    console.log(params.Key + ' deleted from ' + params.Bucket);
                }
            })

        }
        catch (err) {
            console.log('ERROR in file Deleting : ' + JSON.stringify(err))
        }

        // Delete downloads related to this notes
        const removedDownloads = await Download.deleteMany({ notes: notes._id });

        if (!removedDownloads)
            throw Error('Something went wrong while deleting the downloads!');

        // Delete this notes
        const removedNotes = await notes.remove();

        if (!removedNotes)
            throw Error('Something went wrong while deleting!');

    } catch (err) {
        res.status(400).json({
            success: false,
            msg: err.message
        });
    }

});

module.exports = router;