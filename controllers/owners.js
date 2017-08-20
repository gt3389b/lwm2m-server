var express = require("express"),
  router = express.Router(),
  debug = require('../debug')('API'),
  models = require('../scripts/models')
;

router.get("/", function(req, res){
    models.Owner.find({}, '-_id -__v', function(error, owners){
        res.json({owners: owners});
    });
});

router.get("/:id", function(req, res){
    models.Owner.findOne({id: req.params.id}, '-_id -__v', function(error, owner){
        res.json({owner: owner});
    });
});

router.post('/', function (req, res) {
    var Owner = new models.Owner(req.body);
    Owner.save(function(error){
        models.Owner.findOne({id: Owner.id}, '-_id -__v', function(error, owner){
            res.json({owner: owner});
        });
    });
});


router.post('/:id', function (req, res) {
    debug('POST /owners/%d', req.params.id, req.body);
    var params = req.body;
    models.Owner.findOneAndUpdate({id: req.params.id}, req.body, function (err, data) {
        params.id = data.id;
        res.json({owner: params});
    });
});


router.delete('/:id', function (req, res) {
    var Owner = models.Owner;
    Owner.findOneAndRemove({id: req.params.id}, function(error, data) {
        res.json({owner: {id: data.id}});
    });
});

module.exports = router;