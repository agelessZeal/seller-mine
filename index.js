// Importing Node modules and initializing Express
const express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  logger = require('morgan'),
  router = require('./router'),
  mongoose = require('mongoose'),
  socketEvents = require('./socketEvents'),
  config = require('./config/main'),
  cors = require('cors'),
  fileUpload = require('express-fileupload'),
  pdt_controller = require('./controllers/v1/ProductController'),
  order_controller = require('./controllers/v1/OrderController');

// Database Setup
mongoose.connect(config.database, { useMongoClient: true });

// startCrone
task_dir = require('./config/cron');
// task_dir.prodcuts();
// task_dir.orders();
// task_dir.orderItems();
// task_dir.sendScheduleLetter();  //Send Template email
// task_dir.requestForFeedbackReport();  //
// task_dir.findRequestReportList();
// task_dir.feedbackDataStore();

// for file upload
app.use(fileUpload());
app.use('/upload_files', express.static('upload_files'))
// for testing
app.use(cors());

// Start the server
let server;
if (process.env.NODE_ENV != config.test_env) {
  server = app.listen(config.port);
  console.log(`Your server is running on port ${config.port}.`);
} else{
  server = app.listen(config.test_port);
}


const io = require('socket.io').listen(server);

socketEvents(io);

// Set static file location for production
// app.use(express.static(__dirname + '/public'));
// Setting up basic middleware for all Express requests
app.use(bodyParser.urlencoded({ extended: false })); // Parses urlencoded bodies
app.use(bodyParser.json()); // Send JSON responses
app.use(logger('dev')); // Log requests to API using morgan

// Enable CORS from client-side
app.use((req, res, next) => {
  // res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
    var allowedOrigins = ['http://localhost:8080', 'http://localhost:3001', 'http://178.128.73.230:3001', 'http://localhost:3000', 'http://178.128.73.230:3000', 'http://178.128.73.230:9001', 'http://178.128.73.230:8080'];
    var origin = req.headers.origin;
    if(allowedOrigins.indexOf(origin) > -1){
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});


schedule = require('node-schedule');
// schedule.scheduleJob("*/15 * * * *", function () { // every 15 min
schedule.scheduleJob("0 0 */12 * * *", function () { // every 12 hour
    console.log('-----------------------Start Product Scheduling-------------------------');
    pdt_controller.getProductSchedule();
    console.log('-----------------------Start Order Scheduling---------------------------');
    order_controller.getOrderSchedule();
});

// Import routes to be served
router(app);

// necessary for testing
module.exports = server;
