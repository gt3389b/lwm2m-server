var express = require("express"),
    router = express.Router(),
    models = require('../scripts/models'),
    mongoose = require('mongoose'),
    _ = require('underscore');

router.get("/", function(req, res){
    var LwResource = models.LwResource;
    LwResource.find({}, '-_id -__v')
      .populate('specific_object', '-_id -__v').exec(function(err, resources){
        res.json({resources: resources});
    });
});

router.get("/:id1/:id2?", function(req, res){

    var LwResource = models.LwResource;
    var LwObject = models.LwObject;

    if(!req.params.id2){
        // get a reusable resource
        LwResource.findOne({id: req.params.id1}, '-_id -__v', function (err, data) {
            res.json({resource: data});
        });
    } else {
        // get resource associated to an object
        LwObject.findOne({id: req.params.id1}, function (err, obj) {
            if(obj){
                LwResource.findOne({id: req.params.id2, specific_object: obj._id}, '-_id -__v')
                  .populate('specific_object', '-_id -__v -owner').exec(function (err, data) {
                    if(!err){
                        res.json({resource: data});
                    } else {
                        res.json(err);
                    }
                });
            } else {
                res.json(err);
            }


        });
    }
});

router.post('/', function (req, res) {
    var LwResource = new models.LwResource(req.body);
    LwResource.save(function(err){
        res.json({error: err});
    });
});

router.delete('/:id1/:id2?', function (req, res) {
    var LwResource = models.LwResource;
    LwResource.findOneAndRemove({id: req.params.id}, function(err, data) {
        res.json({error: err});
    });
});

router.post('/:id', function (req, res) {
    var LwResource = models.LwResource;
    LwResource.findOneAndUpdate({id: req.params.id}, req.body, function(err, data) {
        res.json({error: err});
    });
});

module.exports = router;