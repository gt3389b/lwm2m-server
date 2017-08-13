var express = require("express"),
  router = express.Router(),
  models = require('../scripts/models')
;

router.get("/", function(req, res){
    var Owner = models.Owner;
    Owner.find({}, '-_id -__v', function(error, owners){
        res.json({owners: owners});
    });
});

router.get("/:id", function(req, res){
    var Owner = models.Owner;
    Owner.findOne({id: req.params.id}, '-_id -__v', function(error, owner){
        res.json({owner: owner});
    });
});

router.post('/', function (req, res) {
    var Owner = new models.Owner(req.body);
    Owner.save(function(error){
        res.json({error: error});
    });
});

router.delete('/:id', function (req, res) {
    var Owner = models.Owner;
    Owner.findOneAndRemove({id: req.params.id}, function(error, data) {
        res.json({error: error});
    });
});

module.exports = router;