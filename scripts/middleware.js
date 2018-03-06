var lwm2mid = require('./lwm2mid'),
    lwm2m = require('./lwm2m'),
    lwm2mServer = lwm2m.server, // TODO: find why we cannot call lwm2mServer it here
    debug = require('../debug')('Middleware'),
    async = require('async'),
    _ = require('underscore');

function handleDiscoverResponse(oid, payload, callback){

    if(payload){

        // parse the discover return string from the device and create an array with the resources
        const resourcesPath = payload.substr(payload.indexOf(',') + 1).replace(/<|>/g, '').split(',');
        let resourcesIds = resourcesPath.map(function(e){
            return parseInt(e.split('/').pop());
        });

        // will respond to the application with the full information of the resource
        // get those information from the database
        var resourcesFull = [];
        async.each(resourcesIds, function(resId, callback){
            lwm2mid.getResource(oid, resId, function(err, data){
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
            callback(err, _.sortBy(resourcesFull, function(e){ return parseInt(e.id)} ) );
        });
    }

}


var queueAddResourcesInDevice = async.queue(function addResources({registry, deviceId, oid, iid, resourcesIds}, callback) {
    // add the missing resources in the device's objects (just the resources id)
    registry.get(deviceId, function(error, device){
        debug('addDiscoveredResources()', deviceId, oid, iid, resourcesIds);
        var o = device.objects;
        var dIns = _.findWhere(o, {id: parseInt(oid)});
        if (dIns) {
            var dRes = _.findWhere(dIns.instances, {id:  parseInt(iid)}).resources;
            _.difference(resourcesIds, dRes.map(function(e){return e.id})).map(function(resid){
                  dRes.push({id: resid, value: null});
            });
            registry.update(parseInt(deviceId), device, function(error){
                  callback();
            });
        }
    });
});


function addDiscoveredResources(registry, deviceId, oid, iid, resourcesIds){
    queueAddResourcesInDevice.push({registry, deviceId, oid, iid, resourcesIds}, function(err){
    });
}

//
// function populateResourceInfos(oid, rid, callback){
//
//     lwm2mid.getResource(oid, rid, function(err, data){
//         if(data){
//             // get resource last value
//             var registry = lwm2mServer.getRegistry();
//             registry.get(device.id, function(error, device){
//                 var dobjects = device.objects;
//                 var res = _.findWhere(_.findWhere(_.findWhere(dobjects, {id: obj.id})
//                   .instances, {id: instance.id}).resources, {id: parseInt(data.id)});
//                 if(res) {
//                     if (res.hasOwnProperty('value')) {
//                         data.value = res.value;
//                     } else {
//                         data.value = null;
//                     }
//                 }
//                 // push full resource informations
//                 resources.push(data);
//                 callback();
//             });
//         } else {
//             // add only the resource number if not found in database
//             resources.push({id: resource.id.toString()});
//             callback();
//         }
//     });
//
// }

exports.handleDiscoverResponse = handleDiscoverResponse;
exports.addDiscoveredResources = addDiscoveredResources;
