'use strict';

var lwm2mServer = require('../../lwm2m-node-lib/lib/lwm2m-node-lib').server,
  config = require('../../lwm2m-node-lib/config-mongo'),
  async = require('async'),
  events = require('events'),
  models = require('./models'),
  lwm2mid = require('./lwm2mid'),
  _ = require('underscore'),
  queuedRequests = require('../../lwm2m-node-lib/lib/services/server/queuedRequests'),
  Device = require('../../lwm2m-node-lib/lib/services/model/Device'),
  middleware = require('./middleware'),
  mqtt = require('mqtt'),
  mqtt_config = require('../mqtt-config').mqtt_config,
  debug = require('../debug')('lwm2m');



var observations = [];
var webclient = null;

var mqttclient = mqtt.connect(mqtt_config);

function handleResult(message) {
  return function(error) {
    if (error) {
    } else {
      console.log('\nSuccess: %s\n', message);
    }
  };
}

function handleObserveValues(value, oid, iid, rid, did) {
    debug('handleObserveValues()', did, oid, iid, rid, value)
    if(webclient){
        webclient.emit('action', {
            type: 'OBSERVATION',
            data: {
                did: did,
                oid: oid,
                iid: iid,
                rid: rid,
                value: value
            }
        });
    }


    lwm2mServer.getRegistry().get(did, function(error, device){
        models.DeviceModel.find({}, function(err, device_models){
            // get list of device model to compare with the registered device
            device_models.forEach(function(device_model){
                // compare the device endpoint name with the prefix device model
                var regex = new RegExp("^"+device_model.endpoint_prefix+"?");
                if(device.name.match(regex)){

                    models.Action.find({device_model: device_model._id, oid, iid, rid}, function(err, actions){
                        actions.forEach(function(action){
                            action.services.forEach(function(service){
                                if(service.service === 'MQTT'){
                                    var topic = service.config.topic.replace("{DEVICE_NAME}", device.name);
                                    topic = topic.replace("{OID}", oid);
                                    topic = topic.replace("{IID}", iid);
                                    topic = topic.replace("{RID}", rid);
                                    debug('Publishing to MQTT topic: <%s> the value: %d', topic, value);
                                    mqttclient.publish(topic, '{"value":'+value+'}');
                                }
                            });
                        });
                    });
                }
            });
        });
    });

}

function registrationHandler(endpoint, lifetime, version, binding, payload, callback) {
    debug('registrationHandler', endpoint, lifetime, binding, payload);

    // finish the registration in the database with this call
    callback();

    // update the registered device with the objects in payload and mandatory resources
    var calls = [];
    var objectsList = [];

    //<editor-fold desc="Parse the payload and populate device's objects">
    if (payload !== "") {
        var objects = payload.toString().split(',');

        _.each(objects, function (o) {
            calls.push(function(callback) {
                // TODO: handle the case where the instance is not specified in the registration payload
                var objectId = parseInt(o.match(/<\/(.*)\/(.*)>/)[1]);
                var objectInst = parseInt(o.match(/<\/(.*)\/(.*)>/)[2]);

                var mandRes = [];
                lwm2mid.getFullObject(objectId, function (err, object) {

                    // add the mandatory resource associated to the object
                    _.each(object.resourceDetails, function (r) {
                        if (r.mandatory) {
                            mandRes.push({id: parseInt(r.id), value: null});
                        }
                    });

                    var obj = _.findWhere(objectsList, {id: objectId});
                    if (obj) {
                        // object already in the list, just add the new instance
                        obj.instances.push({
                            id: objectInst,
                            resources: mandRes
                        });
                    } else {
                        // add the object in the list
                        objectsList.push({
                            id: objectId,
                            instances: [{
                                id: objectInst,
                                resources: mandRes
                            }]
                        });
                    }
                    callback(null);
                });
            });
        });
    }
    //</editor-fold>

    //<editor-fold desc="Handle Device Model">
    models.DeviceModel.find({}, function(err, device_models){
        // get list of device model to compare with the registered device
        device_models.forEach(function(device_model){
            var register_actions = [];

            // compare the device endpoint name with the prefix device model
            var regex = new RegExp("^"+device_model.endpoint_prefix+"?");
            if(endpoint.match(regex)){

                // copy full objects when present to the actual device (overwrite previous object list)
                if(device_model.objects){
                    Device.model.findOne({name: endpoint}, function(err, device){
                        device.objects = device_model.objects;
                        device.save();
                    });
                }

                //<editor-fold desc="Execute registered actions">
                models.Action.find({device_model: device_model._id, execution: 'registration', activated: true},
                  function(err, actions){
                    // Get the actions at 'Registration' for this model and execute them
                    actions.forEach(function(a){
                        register_actions.push(a.toObject());
                    });

                    lwm2mServer.getDeviceByName(endpoint, function(error, device){

                        _.each(register_actions, function(e){
                            debug('Execute registered action %o', e);

                            if(e.command === "read"){

                            } else if (e.command === "write"){
                                lwm2mServer.write(device.id, parseInt(e.oid), parseInt(e.iid),
                                  parseInt(e.rid), e.payload, function (error, result) {


                                });
                            } else if (e.command === "execute"){

                            } else if (e.command === "observe"){
                                lwm2mServer.observe(device.id, parseInt(e.oid), parseInt(e.iid), parseInt(e.rid),
                                    handleObserveValues, function(error) {


                                });
                            } else if (e.command === "writeAttr"){

                            }

                        });
                    });
                });
                //</editor-fold>
            }
        })
    });
    //</editor-fold>

    //<editor-fold desc="Description">
    async.parallel(calls, function(err, result){
        // The device has been registered in the database by the library. We complete
        // the processus by adding the objects to the device if not already done by
        // the device model.
        Device.model.findOne({name: endpoint}, function(err, device){
            // Device's objects may have been populated by the device model.
            // If objects.length is zero the device doesn't correspond to any model.
            if(!device.objects.length){
                device.objects = objectsList;
                device.save();
            }
            if(webclient){
                webclient.emit('action', {type: 'DEVICE_REGISTRATION', data: device});
            }
        });
    });
    //</editor-fold>

}

function unregistrationHandler(device, callback) {
    debug('unregistrationHandler() %o', device);
    lwm2mServer.cleanObserversByDeviceId(device.id, function(){
        var Observation = models.Observation;
        Observation.find({device_id: device.id}).remove();
    });

    if(webclient){
        webclient.emit('action', {type: 'UNREGISTRATION', data: device});
    }

    callback();
}

function updateRegistrationHandler(obj, payload, callback) {
    callback();
    if(webclient){
        delete obj._id;
        webclient.emit('action', {type: 'UPDATE_REGISTRATION', data: obj});
    }
}

function setHandlers(serverInfo, callback) {
    lwm2mServer.setHandler(serverInfo, 'registration', registrationHandler);
    lwm2mServer.setHandler(serverInfo, 'unregistration', unregistrationHandler);
    lwm2mServer.setHandler(serverInfo, 'updateRegistration', updateRegistrationHandler);
    callback();
}

function startServer(io){
    io.on('connection', function(client) {
        debug('Web client connected to the LwM2M Server.');
        webclient = client;

        // Register a callback for the response of the queued requests.
        // The response will be sent through the websocket.
        queuedRequests.set_callback(function(operation, did, oid, iid, rid, error, result){

            let response = {
                operation: operation,
                did: did,
                oid: oid,
                iid: iid,
                rid: rid,
                error: error,
                result: result
            };

            if(operation==='discover'){
                middleware.handleDiscoverResponse(oid, result, function(error, data){
                    response.resources = data;
                    response.error = error;
                    delete response.result;
                    delete response.rid;
                    webclient.emit('action', {
                        type: 'QUEUED_REQ_RESPONSE',
                        data: response
                    });
                    middleware.addDiscoveredResources(lwm2mServer.getRegistry(),
                      response.did, response.oid, response.iid,
                      _.map(response.resources, (r) => { return r.id}) );
                });
            } else {
                webclient.emit('action', {
                    type: 'QUEUED_REQ_RESPONSE',
                    data: response
                });
            }
            console.log('QUEUED_REQ_RESPONSE', result);
        });



        client.on('user', function(data) {
            console.log(data);
            if(data.action=="read"){
                lwm2mServer.read(data.did, data.oid, data.iid, data.rid, function (error, result) {
                    client.emit('response', {
                        did: data.did,
                        oid: data.oid,
                        iid: data.iid,
                        rid: data.rid,
                        value: result,
                        error: error
                    });

                    // Store the last value of the resource in database
                    var registry = lwm2mServer.getRegistry();
                    registry.get(data.did, function(error, device){
                        if(!device || error){
                            return false;
                        }

                        var o = device.objects;

                        // read the resource
                        if(data.rid){
                            var res = _.findWhere(_.findWhere(_.findWhere(o, {id: data.oid})
                            .instances, {id: data.iid}).resources, {id: data.rid});
                            if(res){ res.value = result; }
                        }

                        // read the instance
                        else if(result) {
                            /* Example of SenML string:
                             {"e":[{"n":"5701","sv":"V"},{"n":"5750","sv":"Solar panel voltage"},{"n":"5603","v":0},
                             {"n":"5604","v":4},{"n":"5601","v":0},{"n":"5602","v":1}]}
                             */

                            var senml = JSON.parse(result);
                            _.each(senml.e, function (resource) {
                                var res = _.findWhere(_.findWhere(_.findWhere(o, {id: data.oid})
                                    .instances, {id: data.iid}).resources, {id: parseInt(resource.n)});
                                if(res){ res.value = resource[Object.keys(resource)[1]]; }
                            });
                        }

                        // store the value
                        registry.update(data.did, device, function(){});
                    });

                });
            } else if (data.action=="discover"){
                lwm2mServer.discover(data.did, data.oid, data.iid, function handleDiscover(error, payload) {
                    if (!error) {
                        var resourcesPath = payload.substr(payload.indexOf(',') + 1).replace(/<|>/g, '').split(',');
                        var resources = resourcesPath.map(function(e){
                            return parseInt(e.split('/').pop());
                        });

                        client.emit('discover', {
                            oid:data.oid,
                            iid:data.iid,
                            resources:resources,
                            error: null
                        });

                        var registry = lwm2mServer.getRegistry();

                        registry.get(data.did, function(error, device){
                            var o = device.objects;
                            var dRes = _.findWhere(_.findWhere(o, {id: data.oid})
                                .instances, {id:  data.iid}).resources;
                            _.difference(resources, dRes.map(function(e){return e.id})).map(function(resid){
                                dRes.push({id: resid, value: null});
                            });
                            registry.update(data.did, device, function(error){

                            });

                        });

                    } else {
                        client.emit('discover', {
                            oid:data.oid,
                            iid:data.iid,
                            resources:null,
                            error: error
                        });
                    }
                });
            } else if (data.action=="write") {
                lwm2mServer.write(data.did, data.oid, data.iid, data.rid, data.value, function (error, result) {
                    /* Normally we don't receive a payload after a 'write' operation. Thus, if the operation
                    * succeed, the input value is returned back on the screen simulating an imediate reading
                    * operation. */
                    client.emit('response', {oid:data.oid, iid:data.iid, rid:data.rid, value: data.value, error: error});
                });
            } else if (data.action=="observe") {
                lwm2mServer.observe(data.did, data.oid, data.iid, data.rid, handleObserveValues, function handleObserve(error) {
                    console.log('\nObserver stablished over resource [/%s/%s/%s]\n', data.oid, data.iid, data.rid);
                    client.emit('observe', {did:data.did, oid:data.oid, iid:data.iid, rid:data.rid, error: error});
                });
            } else if (data.action=="cancel") {
                lwm2mServer.cancelObserver(data.did, data.oid, data.iid, data.rid, function(error) {
                    console.log('\nObserver canceled over resource [/%s/%s/%s]\n', data.oid, data.iid, data.rid);
                    client.emit('cancelObservation', {did:data.did, oid:data.oid, iid:data.iid, rid:data.rid, error: error});
                });
            } else if (data.action=="execute") {
                lwm2mServer.execute(data.did, data.oid, data.iid, data.rid, null, function (error) {
                    console.log('\nExecute on resource [/%s/%s/%s]\n', data.oid, data.iid, data.rid);
                    client.emit('execute', {oid:data.oid, iid:data.iid, rid:data.rid, error: error});
                });
            }

        });

    });


  async.waterfall([
        async.apply(lwm2mServer.start, config.server),
        setHandlers
    ], handleResult('Lightweight M2M Server started'));
}

exports.server = lwm2mServer;
exports.start = startServer;
exports.observations = observations;
exports.handle_observations = handleObserveValues;