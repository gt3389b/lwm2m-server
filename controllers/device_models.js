var express = require("express"),
    router = express.Router(),
    models = require('../scripts/models'),
      debug = require('../debug')('API'),
    _ = require('underscore'),
    lwm2m = require('../scripts/lwm2m'),
    lwm2mServer = lwm2m.server

router.get('/', function (req, res) {
    debug('GET /device_models');
    var DeviceModel = models.DeviceModel;
    DeviceModel.find({}, '-_id -__v', function (err, data) {
        res.json({device_models: data});
    });
});

router.get("/:id", function(req, res){
    debug('GET /device_models/%d', req.params.id);
    var DeviceModel = models.DeviceModel;
    DeviceModel.findOne({id: req.params.id}, '-_id -__v', function(error, owner){
        res.json({device_model: owner});
    });
});

router.delete('/:id', function (req, res) {
    debug('DELETE /device_models/%d', req.params.id);
    var DeviceModel = models.DeviceModel;
    DeviceModel.findOneAndRemove({id: req.params.id}, function(error, data) {
        res.json({device_model: {id: data.id}});
    });
});

router.post('/:id', function (req, res) {
    debug('POST /device_models/%d', req.params.id, req.body);
    var params = req.body;
    models.DeviceModel.findOneAndUpdate({id: req.params.id}, req.body, function (err, data) {
        params.id = data.id;
        res.json({device_model: params});
    });
});

router.post('/', function (req, response) {
    debug('POST /device_models');
    // Create new device model based on a device.
    // Copy all objects, instances and resources from the device.
    if(req.body.deviceId){
        lwm2mServer.getDeviceById(req.body.deviceId, function(error, device){

            let devices_objects = Object.assign({}, device.objects);

            // clear resources values
            _.each(devices_objects, function(obj){
                _.each(obj.instances, function(inst){
                    _.each(inst.resources, function(res){
                        res.value = null;
                    });
                });
            });

            var DeviceModel = models.DeviceModel;
            DeviceModel.findOne({endpoint_prefix: device.name}, function(err, device_model) {

                var dmObj;
                if(device_model){
                    dmObj = device_model;
                    debug('Update Device Model based on the device name: %s', device.name);
                } else {
                    dmObj = new models.DeviceModel(req.body);
                    dmObj.endpoint_prefix = device.name;
                    dmObj.name = device.name;
                    dmObj.actions = [];
                    debug('Add Device Model based on the device name: %s', device.name);
                }

                // Update or create the device model with all objects from the device
                dmObj.objects = _.values(devices_objects);

                debug("Device model: %O", dmObj);

                dmObj.save(function(err){
                    debug('Add/Update Device Model error: ', err);
                    response.json({error: err});
                });
            });

        });
    }

    // Update or create a device model manually
    else {
        debug('Create Device Model %o', req.body);
        var DeviceModel = new models.DeviceModel(req.body);
        DeviceModel.save(function(err){
            response.json({error: err});
        });
    }

});


// router.post('/cud-model', function (req, res) {
//     if(req.body._id){
//         var DeviceModel = models.DeviceModel;
//         if(_.keys(req.body).length>1){
//             DeviceModel.findByIdAndUpdate(req.body._id, req.body, function(err, data) {
//                 res.json({error: err});
//             });
//         } else {
//             DeviceModel.findByIdAndRemove(req.body._id, function(err, data) {
//                 res.json({error: err});
//             });
//         }
//     } else {
//         delete req.body._id;
//
//         // Create new device model based on a device.
//         // Copy all objects, instances and resources from the device.
//         if(req.body.device_id){
//             lwm2mServer.getDeviceById(req.body.device_id, function(error, device){
//
//                 // clear resources values
//                 _.each(device.objects, function(obj){
//                     _.each(obj.instances, function(inst){
//                         _.each(inst.resources, function(res){
//                             res.value = null;
//                         });
//                     });
//                 });
//
//                 var DeviceModel = models.DeviceModel;
//                 DeviceModel.findOne({endpoint_prefix: req.body.endpoint_prefix}, function(err, device_model) {
//                     if(device_model){
//                         device_model.objects = device.objects;
//                         device_model.save(function(err){
//                             res.json({error: err});
//                         });
//                     } else {
//                         var DeviceModel = new models.DeviceModel(req.body);
//                         DeviceModel.objects = device.objects;
//                         DeviceModel.save(function(err){
//                             res.json({error: err});
//                         });
//                     }
//                 });
//
//             });
//         } else {
//             var DeviceModel = new models.DeviceModel(req.body);
//             DeviceModel.save(function(err){
//                 res.json({error: err});
//             });
//         }
//     }
// });
//
// router.get('/get-actions', function (req, res) {
//     var RegisterAction = models.RegisterAction;
//
//     if( mongoose.Types.ObjectId.isValid(req.query.device_model) ){
//         var options = {
//             conditions: {device_model: req.query.device_model}
//         };
//         RegisterAction.dataTable(req.query, options, function (err, data) {
//             res.json(data);
//         });
//     }
// });
//
// router.post('/cud-action', function (req, res) {
//     if(req.body._id){
//         var RegisterAction = models.RegisterAction;
//         if(_.keys(req.body).length>1){
//             RegisterAction.findByIdAndUpdate(req.body._id, req.body, function(err, data) {
//                 res.json({error: err});
//             });
//         } else {
//             RegisterAction.findByIdAndRemove(req.body._id, function(err, data) {
//                 res.json({error: err});
//             });
//         }
//     } else {
//         delete req.body._id;
//         var RegisterAction = new models.RegisterAction(req.body);
//         RegisterAction.save(function(err){
//             res.json({error: err});
//         });
//     }
// });

module.exports = router;