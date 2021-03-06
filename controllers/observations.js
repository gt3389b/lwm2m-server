var express = require("express"),
  router = express.Router(),
  lwm2m = require('../scripts/lwm2m'),
  lwm2mServer = lwm2m.server,
  debug = require('../debug')('API');
  _ = require('underscore');

router.get("/:deviceId", function(req, res){
    debug('GET /observations/%d', req.params.deviceId);
    lwm2mServer.listObserversByDeviceId(req.params.deviceId, function(error, subscriptions){
        let observations = [];
        _.each(subscriptions, sub => {
            const ids = sub.resource.split('/');
            const obs = {
                id: sub.id,
                path: sub.resource,
                did: parseInt(sub.deviceId),
                oid: parseInt(ids[1]),
                iid: parseInt(ids[2]),
                rid: parseInt(ids[3])
            };
            observations.push(obs);
        });
        res.json( {observations} );
    });
});

module.exports = router;