var lwm2mid = require('./lwm2mid'),
    lwm2m = require('./lwm2m'),
    lwm2mServer = lwm2m.server;

function populateResourceInfos(oid, rid, callback){

    lwm2mid.getResource(oid, rid, function(err, data){
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

}