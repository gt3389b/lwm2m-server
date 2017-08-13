const express = require("express"),
  router = express.Router(),
  lwm2m = require('../scripts/lwm2m'),
  async = require('async'),
  lwm2mServer = lwm2m.server,
  lwm2mid = require('../scripts/lwm2mid'),
  debug = require('../debug')('API');
  _ = require('underscore');

router.get("/read/:did/:oid/:iid/:rid?", function(req, res){
    debug('GET /read/%d/%d/%d/%d', req.params.did, req.params.oid, req.params.iid, req.params.rid);

    lwm2mServer.read(req.params.did, req.params.oid, req.params.iid, req.params.rid || "" , function (error, result) {
        const response = {
            did: req.params.did,
            oid: req.params.oid,
            iid: req.params.iid,
            rid: req.params.rid,
            value: result,
            error: error
        };

        setTimeout(function () {
            debug('RES %o', response);
            res.json({'response': response});
        }, 2000);


    });
});

router.get("/observe/:did/:oid/:iid/:rid", function(req, res){
    debug('GET /observe/%d/%d/%d/%d', req.params.did, req.params.oid, req.params.iid, req.params.rid);
    lwm2mServer.observe(req.params.did, req.params.oid, req.params.iid, req.params.rid, lwm2m.handle_observations, function handleObserve(error, result) {
        console.log('\nObserver stablished over resource [/%s/%s/%s]\n', req.params.oid, req.params.iid, req.params.rid);

        // one time response, then lwm2m.handle_observations()
        const response = {
            did: req.params.did,
            oid: req.params.oid,
            iid: req.params.iid,
            rid: req.params.rid,
            value: result,
            error: error
        };
        res.json({'response': response});
    });
});

router.delete("/observe/:did/:oid/:iid/:rid", function(req, res){
    debug('DELETE /observe/%d/%d/%d/%d', req.params.did, req.params.oid, req.params.iid, req.params.rid);
    lwm2mServer.cancelObserver(req.params.did, req.params.oid, req.params.iid, req.params.rid, function(error) {
        const response = {
            did: req.params.did,
            oid: req.params.oid,
            iid: req.params.iid,
            rid: req.params.rid,
            error: error
        };
        res.json({'response': response});
    });
});

router.post("/write/:did/:oid/:iid/:rid", function(req, res){
    debug('POST /write/%d/%d/%d/%d %s', req.params.did, req.params.oid, req.params.iid, req.params.rid, req.body.value);
    lwm2mServer.write(req.params.did, req.params.oid, req.params.iid,
      req.params.rid, req.body.value, function (error, result) {
          const response = {
              did: req.params.did,
              oid: req.params.oid,
              iid: req.params.iid,
              rid: req.params.rid,
              value: result,
              error: error
          };
          setTimeout(function () {
              res.json({'response': response});
          }, 2000);
      });
});

router.get("/discover/:did/:oid/:iid", function(req, res){
    debug('GET /discover/%d/%d/%d', req.params.did, req.params.oid, req.params.iid);
    lwm2mServer.discover(req.params.did, req.params.oid, req.params.iid, function handleDiscover(error, payload) {
        let response;
        if (!error) {

            // parse the discover return string from the device and create an array with the resources
            const resourcesPath = payload.substr(payload.indexOf(',') + 1).replace(/<|>/g, '').split(',');
            let resourcesIds = resourcesPath.map(function(e){
                return parseInt(e.split('/').pop());
            });

            response = {
                did: req.params.did,
                oid: req.params.oid,
                iid: req.params.iid,
                resources: resourcesIds,
                error: null
            };

            var resourcesFull = [];
            async.each(resourcesIds, function(resId, callback){
                lwm2mid.getResource(req.params.oid, resId, function(err, data){
                    if(data){
                        resourcesFull.push(data);
                    } else {
                        // add only the resource number if not found in database
                        resourcesFull.push({id: resId.toString()});
                    }
                    callback();
                });
            }, function(err){
                // add back the list of resources with informations
                response.resources = _.sortBy(resourcesFull, function(e){ return parseInt(e.id)} );
                response.error = err;
                res.json({'response': response});
            });

            // add the missing resources in the device's objects
            // TODO: need to review this
            var registry = lwm2mServer.getRegistry();
            registry.get(req.params.did, function(error, device){
                var o = device.objects;
                var dRes = _.findWhere(_.findWhere(o, {id: parseInt(req.params.oid)})
                  .instances, {id:  parseInt(req.params.iid)}).resources;
                _.difference(resourcesIds, dRes.map(function(e){return e.id})).map(function(resid){
                    dRes.push({id: resid, value: null});
                });
                registry.update(parseInt(req.params.did), device, function(error){});
            });


        } else {
            response = {
                did: req.params.did,
                oid: req.params.oid,
                iid: req.params.iid,
                resources: null,
                error: error
            };
        }



    });

});

module.exports = router;