var express    = require('express');
var bodyParser = require('body-parser');
var lwm2m = require('./scripts/lwm2m'),
    config = require('../lwm2m-node-lib/config-mongo').server,
    dbService = require('./scripts/db'),
    debug = require('./debug')('express');

var app = express();

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var server = require('http').createServer(app);
var io = require('socket.io')(server);

var port = process.env.PORT || 5000;

var router = express.Router();

// MongoDB initialization and models loading
dbService.init(config.deviceRegistry.host, config.deviceRegistry.db, function(){
  process.emit('dbison');
});

lwm2m.start(io);

app.use(function(req,res,next) {
  debug('Request', req.method);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

router.get('/', function(req, res) {
  res.json({ message: 'API root' });
});

router.use('/devices', require('./controllers/devices'));
router.use('/', require('./controllers/operations'));
router.use('/objects', require('./controllers/objects_db'));
router.use('/resources', require('./controllers/resources'));
router.use('/owners', require('./controllers/owners'));
router.use('/observations', require('./controllers/observations'));
router.use('/devicemodels', require('./controllers/device_models'));
router.use('/actions', require('./controllers/actions'));
app.use('/api', router);


server.listen(port);
debug('LwM2M API Started on port %d', port);