var express = require("express"),
  router = express.Router(),
  models = require('../scripts/models'),
  debug = require('../debug')('API'),
  _ = require('underscore'),
  lwm2m = require('../scripts/lwm2m'),
  lwm2mServer = lwm2m.server;


router.get('/', function (req, res) {
    debug('GET /actions');


    var allRequests = _.map(lwm2mServer.listQueuedRequests, (req) => {
        return {
            operation: req.type,
            did: parseInt(req.did),
            oid: parseInt(req.oid),
            iid: parseInt(req.iid),
            rid: parseInt(req.rid),
        }
    });

    res.json({queued_requests: allRequests});
});


//
// router.get("/:id", function(req, res){
//     debug('GET /actions/%d', req.params.id);
//     var Action = models.Action;
//     Action.findOne({id: req.params.id}, '-_id -__v', function(error, data){
//         res.json({action: data});
//     });
// });
//
// router.post('/', function (req, res) {
//     debug('POST /actions', req.body);
//     var Action = new models.Action(req.body);
//
//     models.DeviceModel.findOne({id: req.body.device_model}, function(error, dm){
//         Action.device_model = dm._id;
//         Action.save(function(error){
//             models.Action.findOne({id: Action.id}, '-_id -__v').populate('device_model', 'id name -_id').exec(function (err, data) {
//                 res.json({action: data});
//             });
//         });
//     });
// });
//
// router.post('/:id', function (req, res) {
//     debug('POST /actions/%d', req.params.id, req.body);
//     var params = req.body;
//     models.Action.findOneAndUpdate({id: req.params.id}, req.body, function (err, data) {
//         params.id = data.id;
//         res.json({action: params});
//     });
// });
//
// router.delete('/:id', function (req, res) {
//     debug('DELETE /actions/%d', req.params.id);
//     var Action = models.Action;
//     Action.findOneAndRemove({id: req.params.id}, function(error, data) {
//         res.json({action: {id: data.id}});
//     });
// });

module.exports = router;
