var express = require("express"),
  router = express.Router(),
  lwm2m = require('../scripts/lwm2m'),
  async = require('async'),
  lwm2mServer = lwm2m.server,
  lwm2mid = require('../scripts/lwm2mid'),
  _ = require('underscore')

router.get("/", function(req, res){

    var sensors = [];
    lwm2mServer.listDevices(function (error, deviceList) {
        if (error) {

        } else {

            for (var i=0; i < deviceList.length; i++) {
                sensors.push({
                    id: deviceList[i].id,
                    name: deviceList[i].name,
                    type: deviceList[i].type,
                    address: deviceList[i].address,
                    lifetime: deviceList[i].lifetime,
                    binding: deviceList[i].binding,
                    creationDate: deviceList[i].creationDate,
                    lastSeen: deviceList[i].lastSeen
                });
            }

            res.json( {devices: sensors} );
        }
    });


});

router.get("/:deviceId", function(req, res){
    lwm2mServer.getDeviceById(req.params.deviceId, function(error, device){
        if(!error){

            // list of lwm2m objects in the device
            device.objects = _.sortBy(device.objects, function(o){ return parseInt(o.id)} );

            var tasks = [];

            tasks.push(function(callback){
                // populate object's resources of the device with data from database
                async.each(device.objects, function(obj, callback){

                    lwm2mid.getObject(obj.id, function(err, o){
                        if(o){
                            obj.name = o.name;
                            obj.shortname = o.shortname;
                        }
                        async.each(obj.instances, function(instance, callback){
                            var resources = [];
                            // for each resources listed in the device object property
                            async.each(instance.resources, function(resource, callback){
                                lwm2mid.getResource(obj.id, resource.id, function(err, data){
                                    if(data){
                                        // get resource last value
                                        var registry = lwm2mServer.getRegistry();
                                        registry.get(device.id, function(error, device){
                                            var dobjects = device.objects;
                                            var res = _.findWhere(_.findWhere(_.findWhere(dobjects, {id: obj.id})
                                              .instances, {id: instance.id}).resources, {id: parseInt(data.id)});
                                            if(res) {
                                                if (res.hasOwnProperty('value')) {
                                                    data.value = res.value;
                                                } else {
                                                    data.value = null;
                                                }
                                            }
                                            // push full resource informations
                                            resources.push(data);
                                            callback();
                                        });
                                    } else {
                                        // add only the resource number if not found in database
                                        resources.push({id: resource.id.toString()});
                                        callback();
                                    }
                                });
                            }, function(err){
                                var res = _.sortBy(resources, function(e){ return parseInt(e.id)} );
                                // add back the list of resources with informations
                                instance.resources = res;
                                callback();
                            });
                        }, callback);
                    });

                }, callback);
            });

            async.parallel(tasks, function () {
                res.json( {device: device} );
            });

        } else {
            res.json( {error: 'Device not found.'} );
        }
    });
});

module.exports = router;