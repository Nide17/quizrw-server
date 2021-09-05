// Bring in all dependencies
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const config = require('config')
const cors = require('cors')

// Initialize express into the app variable
const app = express();

// Express has bodyParser
app.use(cors({ origin: '*' }))
app.use(express.json());

//DB Config
const dbURI = process.env.MONGO_URI || config.get('mongoURI');

//connect to Mongo
const connectDB = async () => {
    await mongoose.
        connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        })
        .then(() => console.log('MongoDB connected ...'),
            err => {
                console.error(`Connection error: ${err.stack}`)
                process.exit(1)
            }
        )
}

connectDB().catch(err => console.error(err))

// Bring in routes from the api
//Use routes / All requests going to the api/questions goes the questions variable at the top questions.js file
app.use('/api/questions', require('./routes/api/questions'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/subscribers', require('./routes/api/subscribers'));
app.use('/api/categories', require('./routes/api/categories'));
app.use('/api/quizes', require('./routes/api/quizes'));
app.use('/api/scores', require('./routes/api/scores'));
app.use('/api/contacts', require('./routes/api/contacts'));
app.use('/api/downloads', require('./routes/api/downloads'));
app.use('/api/courseCategories', require('./routes/api/courseCategories'));
app.use('/api/courses', require('./routes/api/courses'));
app.use('/api/chapters', require('./routes/api/chapters'));
app.use('/api/notes', require('./routes/api/notes'));

//Edit for deployment || serve static assets if in production
if (process.env.NODE_ENV === 'production') {

    //Set a static folder for frontend build
    app.use(express.static('client/build'));

    //anything coming will be redirected here
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
    //Let's create a post build script in package.json
}

//port to run on: env when deployed and 4000 locally/heroku
const port = process.env.PORT || 4000;

//When server started listen the port
app.listen(port, () => console.log(`Server is running on port ${port}`));