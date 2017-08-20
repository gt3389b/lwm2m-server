const express = require("express"),
  router = express.Router(),
  lwm2m = require('../scripts/lwm2m'),
  async = require('async'),
  lwm2mServer = lwm2m.server,
  lwm2mid = require('../scripts/lwm2mid'),
  debug = require('../debug')('API'),
  middleware = require('../scripts/middleware');
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
        res.json({'response': response});
    });
});

router.get("/observe/:did/:oid/:iid/:rid", function(req, res){
    debug('GET /observe/%d/%d/%d/%d', req.params.did, req.params.oid, req.params.iid, req.params.rid);
    lwm2mServer.observe(req.params.did, req.params.oid, req.params.iid, req.params.rid, lwm2m.handle_observations,
      function handleObserve(error, result) {

        if(!error){
            debug('Observation established over resource /%s/%s/%s', req.params.oid, req.params.iid, req.params.rid);
        }

        // return response because operation Observe is a GET request first,
        // then the function lwm2m.handle_observations() passed in parameter will fire
        // for each notification
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
    lwm2mServer.cancelObserver(req.params.did, req.params.oid, req.params.iid, req.params.rid,
      function(error) {
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
    debug('POST /write/%d/%d/%d/%d %s', req.params.did, req.params.oid, req.params.iid,
      req.params.rid, req.body.value);
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
          res.json({'response': response});
      });
});

router.get("/discover/:did/:oid/:iid", function(req, res){
    debug('GET /discover/%d/%d/%d', req.params.did, req.params.oid, req.params.iid);
    lwm2mServer.discover(req.params.did, req.params.oid, req.params.iid,
      function handleDiscover(error, payload) {
          let response = {
              did: req.params.did,
              oid: req.params.oid,
              iid: req.params.iid,
              resources: null,
              error: null
          };
          if (!error) {
              middleware.handleDiscoverResponse(req.params.oid,
                payload, function(error, data){
                    response.resources = data;
                    response.error = error;
                    middleware.addDiscoveredResources(lwm2mServer.getRegistry(),
                      req.params.did, req.params.oid, req.params.iid, _.map(data, (r) => { return r.id}));
                    res.json({'response': response});
                });
          } else {
              response.error = error;
              res.json({'response': response});
          }

      });
});

module.exports = router;