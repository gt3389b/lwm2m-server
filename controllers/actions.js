var express = require("express"),
  router = express.Router(),
  models = require('../scripts/models'),
  debug = require('../debug')('API'),
  _ = require('underscore'),
  lwm2m = require('../scripts/lwm2m');


router.get('/', function (req, res) {
    debug('GET /actions');
    var Action = models.Action;
    Action.find({}, '-_id -__v').populate('device_model', 'id name -_id').exec(function (err, data) {
        res.json({actions: data});
    });
});



router.get("/:id", function(req, res){
    debug('GET /actions/%d', req.params.id);
    var Action = models.Action;
    Action.findOne({id: req.params.id}, '-_id -__v', function(error, data){
        res.json({action: data});
    });
});

router.post('/', function (req, res) {
    debug('POST /actions', req.body);
    var Action = new models.Action(req.body);

    models.DeviceModel.findOne({id: req.body.device_model}, function(error, dm){
        Action.device_model = dm._id;
        Action.save(function(error){
            if(!error){
                models.Action.findOne({id: Action.id}, '-_id -__v').populate('device_model', 'id name -_id').exec(function (err, data) {
                    if(err){
                        res.json({error: err});
                    } else {
                        res.json({action: data});
                    }
                });
            } else {
                res.json({error});
            }
        });
    });
});

router.post('/:id', function (req, res) {
    debug('POST /actions/%d', req.params.id, req.body);
    var params = req.body;

    models.DeviceModel.findOne({id: req.body.device_model}, function(error, dm){

        if(dm){
            req.body.device_model = dm._id;
        }

        models.Action.findOneAndUpdate({id: req.params.id}, req.body, function (err, data) {
            if(err){
                res.json({error: err});
            } else {
                models.Action.findOne({id: data.id}, '-_id -__v').populate('device_model', 'id name -_id').exec(function (err, data) {
                    if(err){
                        res.json({error: err});
                    } else {
                        res.json({action: data});
                    }
                });
            }
        });
    });
});

router.delete('/:id', function (req, res) {
    debug('DELETE /actions/%d', req.params.id);
    var Action = models.Action;
    Action.findOneAndRemove({id: req.params.id}, function(error, data) {
        res.json({action: {id: data.id}});
    });
});

module.exports = router;
