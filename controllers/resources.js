var express = require("express"),
    router = express.Router(),
    models = require('../scripts/models'),
    debug = require('../debug')('API'),
    mongoose = require('mongoose'),
    _ = require('underscore');

router.get("/", function(req, res){
    debug('GET /resources');
    models.LwResource.find({}, '-_id -__v')
      .populate('specific_object', '-_id -__v').exec(function(err, resources){
        res.json({resources: resources});
    });
});

router.get("/:id1/:id2?", function(req, res){
    debug('GET /resources/%d/%d', req.params.id1, req.params.id2);
    if(!req.params.id2){
        // get a reusable resource
        models.LwResource.findOne({id: req.params.id1}, '-_id -__v', function (err, data) {
            res.json({resource: data});
        });
    } else {
        // get resource associated to an object
        models.LwObject.findOne({id: req.params.id1}, function (err, obj) {
            if(obj){
                models.LwResource.findOne({id: req.params.id2, specific_object: obj._id}, '-_id -__v')
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
    debug('POST /resources %O', req.body);
    var LwResource = new models.LwResource(req.body);

    if(req.body.specific_object){
        // Find the ._id of the object because .specific_object is the normal .id
        models.LwObject.findOne({id: req.body.specific_object}, function(error, o){
            LwResource.specific_object = o._id;
            LwResource.save(function(error){
                // return to the user the full resource with the specific_object object
                models.LwResource.findOne({id: LwResource.id}, '-_id -__v')
                  .populate('specific_object', '-_id -__v -owner').exec(function (err, data) {
                    res.json({resource: data});
                });
            });
        });
    } else {
        LwResource.save(function(error){
            // return to the user the full resource with the specific_object object
            models.LwResource.findOne({id: LwResource.id}, '-_id -__v')
              .populate('specific_object', '-_id -__v -owner').exec(function (err, data) {
                res.json({resource: data});
            });
        });
    }


});

router.post('/:id', function (req, res) {
    debug('POST /resources/%d %O', req.params.id, req.body);
    var LwResource = models.LwResource;

    if(req.body.specific_object){
        models.LwObject.findOne({id: req.body.specific_object}, function(error, o){
            req.body.specific_object = o._id;
            LwResource.findOneAndUpdate({id: req.params.id}, req.body, function(err, data) {
                // return to the user the full resource with the specific_object object
                models.LwResource.findOne({_id: data._id}, '-_id -__v')
                  .populate('specific_object', '-_id -__v -owner').exec(function (err, data) {
                    res.json({resource: data});
                });
            });
        });

    } else {
        LwResource.findOneAndUpdate({id: req.params.id}, req.body, function(err, data) {
            models.LwResource.findOne({_id: data._id}, '-_id -__v')
              .populate('specific_object', '-_id -__v -owner').exec(function (err, data) {
                res.json({resource: data});
            });
        });
    }

});

router.delete('/:id1/:id2?', function (req, res) {
    debug('DELETE /resources/%d/%d', req.params.id1, req.params.id2);

    if(!req.params.id2){
        // delete a reusable resource
        models.LwResource.findOneAndRemove({id: req.params.id1}, function(err, data) {
            res.json({resource: {id: data.id}});
        });
    } else {
        // get resource associated to an object
        models.LwObject.findOne({id: req.params.id1}, function (err, obj) {
            if(obj){
                models.LwResource.findOneAndRemove({id: req.params.id2, specific_object: obj._id}, function (err, data) {
                    if(!err){
                        res.json({resource: {
                            id: data.id,
                            specific_object: {id: obj.id}
                        }});
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



module.exports = router;