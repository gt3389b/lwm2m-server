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
    var LwObject = new models.LwObject(req.body);
    LwObject.save(function(err){
        res.json({error: err});
    });
});

router.delete('/:id', function (req, res) {
    var LwObject = models.LwObject;
    LwObject.findOneAndRemove({id: req.params.id}, function(err, data) {
        res.json({error: err});
    });
});

router.post('/:id/:res?', function (req, res) {
    var LwObject = models.LwObject;

    if(!req.params.res){
        LwObject.findOneAndUpdate({id: req.params.id}, req.body, function(err, data) {
            res.json({error: err});
        });
    } else {
        LwObject.findOne({id: req.params.id}, function(err, data){
            data.resources.push(req.params.res);
            data.save(function(err){
                res.json({error: err});
            })
        });
    }


});

module.exports = router;