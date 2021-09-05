const express = require("express");
const router = express.Router();
const sendEmail = require("./emails/sendEmail");

// auth middleware to protect routes
const { auth, authRole } = require('../../middleware/auth');

//Contact Model : use capital letters since it's a model
const Contact = require('../../models/Contact');
const User = require('../../models/User');
const Broadcast = require('../../models/Broadcast');
const SubscribedUser = require('../../models/SubscribedUser');

// @route GET api/contacts
// @route Get All contacts
// @route Private: accessed by logged in user

//we use router. instead of app. and / because we are already in this dir
router.get('/', async (req, res) => {

  try {
    const contacts = await Contact.find()
      //sort contacts by creation_date
      .sort({ contact_date: -1 })

    if (!contacts) throw Error('No contacts found');

    res.status(200).json(contacts);

  } catch (err) {
    res.status(400).json({ msg: err.message })
  }
});

// @route POST api/contacts
// @route Create a Contact
// @route Private: accessed by logged in user

router.post("/", async (req, res) => {

  try {

    const newContact = await Contact.create(req.body);
    res.send(newContact);

    if (!newContact) throw Error('Something went wrong!');

    // Sending e-mail to contacted user
    sendEmail(
      newContact.email,
      "Thank you for contacting Quiz Blog!",
      {
        name: newContact.contact_name,
      },
      "./template/contact.handlebars");

    // Sending e-mail to admins
    const admins = await User.find({ role: 'Admin' }).select("email")

    admins.forEach(ad => {
      sendEmail(
        ad.email,
        "A new message, someone contacted us!",
        {
          cEmail: newContact.email
        },
        "./template/contactAdmin.handlebars");
    })

    res.status(200).json({ msg: "Sent successfully!" });

  } catch (err) {
    console.log(err);

    if (err.name === "ValidationError") {
      return res.status(400).send(err.errors);
    }
    res.status(500).send("Something went wrong");
  }
});

// @route POST api/contacts
// @route Create a Broadcast
// @route Private: accessed by logged in user
router.post("/broadcast", authRole(['Creator', 'Admin']), async (req, res) => {

  const { title, sent_by, message } = req.body;

  // Simple validation
  if (!title || !sent_by || !message) {
    return res.status(400).json({ msg: 'Please fill required fields' });
  }

  // Send email to subscribers of Category on Quiz creation
  const subscribers = await SubscribedUser.find()
  const allUsers = await User.find()
  const clientURL = process.env.NODE_ENV === 'production' ?
    'http://www.quizblog.rw' : 'http://localhost:3000'

  try {
    const newBroadcast = new Broadcast({
      title,
      sent_by,
      message
    });

    const savedBroadcast = await newBroadcast.save();
    if (!savedBroadcast) throw Error('Something went wrong during creation!');

    res.status(200).json({
      _id: savedBroadcast._id,
      title: savedBroadcast.title,
      sent_by: savedBroadcast.sent_by,
      message: savedBroadcast.message,
      createdAt: savedBroadcast.createdAt
    });

    // Sending a Broadcast
    subscribers.forEach(sub => {

      sendEmail(
        sub.email,
        req.body.title,
        {
          name: sub.name,
          message: req.body.message,
          unsubscribeLink: `${clientURL}/unsubscribe`
        },
        "./template/broadcast.handlebars");
    });

    allUsers.forEach(usr => {

      sendEmail(
        usr.email,
        req.body.title,
        {
          name: usr.name,
          message: req.body.message,
          unsubscribeLink: `${clientURL}/unsubscribe`
        },
        "./template/broadcast.handlebars");
    });

    res.status(200).json({ msg: "Sent successfully!" });

  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// @route GET api/contacts/:id
// @route GET one Contact
// @route Private: accessed by logged in user

//:id placeholder, findId=we get it from the parameter in url
router.get('/:id', authRole(['Admin']), (req, res) => {

  //Find the Contact by id
  Contact.findById(req.params.id)

    //return a promise
    .then(contact => res.json(contact))
    // if id not exist or if error
    .catch(err => res.status(404).json({ success: false }));
});

// @route PUT api/contacts/:id
// @route Replying a contact
// @access Private: Accessed by admin only

router.put('/:id', authRole(['Creator', 'Admin']), async (req, res) => {

  try {

    // Update the Quiz on Contact updating
    const contact = await Contact.updateOne(
      { "_id": req.params.id },
      { $push: { "replies": req.body } },
      { new: true }
    );

    // Send Reply email
    sendEmail(
      req.body.to_contact,
      "New message! Quiz Blog replied!",
      {
        name: req.body.to_contact_name,
        question: req.body.contact_question,
        answer: req.body.message,
      },
      "./template/reply.handlebars");

    res.status(200).json(contact);

  } catch (err) {
    res.status(400).json({
      msg: 'Failed to update! ' + err.message,
      success: false
    });
  }
});

// @route DELETE api/contacts
// @route delete a Contact
// @route Private: Accessed by admin only

//:id placeholder, findId=we get it from the parameter in url
router.delete('/:id', auth, authRole(['Admin']), (req, res) => {

  //Find the Contact to delete by id first
  Contact.findById(req.params.id)

    //returns promise 
    .then(contact => contact.remove().then(() => res.json({ success: true })))
    // if id not exist or if error
    .catch(err => res.status(404).json({ success: false }));
});

module.exports = router;