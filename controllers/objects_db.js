var express = require("express"),
    router = express.Router(),
    models = require('../scripts/models')
;

router.get("/", function(req, res){
    var LwObject = models.LwObject;
    LwObject.find({}, '-_id -__v').populate('owner', '-_id -__v').exec(function(err, objects){

        //setTimeout(function(){
            res.json({objects: objects});
        //}, 3000);


    });
});

router.get("/:id", function(req, res){
    var LwObject = models.LwObject;
    LwObject.findOne({id: req.params.id}, '-_id -__v')
      .populate('owner', '-_id -__v').exec(function(err, object){
        res.json({object: object});
    });
});

router.post('/', function (req, res) {
    models.Owner.findOne({id: req.body.owner}, function(error, owner){
        req.body.owner = owner._id;
        var LwObject = new models.LwObject(req.body);
        LwObject.save(function(err){
            models.LwObject.findOne({id: LwObject.id}, '-_id -__v')
              .populate('owner', '-_id -__v').exec(function (err, object) {
                res.json({object: object});
            });

        });
    });

});

router.delete('/:id', function (req, res) {
    var LwObject = models.LwObject;
    LwObject.findOneAndRemove({id: req.params.id}, function(err, data) {
        res.json({object: {id: data.id}});
    });
});

router.post('/:id/:res?', function (req, res) {

    if(!req.params.res){
        if(req.body.owner){
            models.Owner.findOne({id: req.body.owner}, function(error, owner){
                req.body.owner = owner._id;
                models.LwObject.findOneAndUpdate({id: req.params.id}, req.body, function(err, data) {
                    if(!err){
                        models.LwObject.findOne({_id: data._id}, '-_id -__v')
                          .populate('owner', '-_id -__v').exec(function (err, object) {
                            res.json({object: object});
                        });
                    } else {
                        res.json({error: err});
                    }
                });
            });
        }
    } else {
        models.LwObject.findOne({id: req.params.id}, function(err, data){
            data.resources.push(req.params.res);
            data.save(function(err){
                res.json({error: err});
            })
        });
    }


});

module.exports = router;