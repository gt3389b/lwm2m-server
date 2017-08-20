'use strict';

const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    relationship = require("mongoose-relationship"),
    autoIncrement = require('mongoose-auto-increment');

const Owner = new Schema({
    id: Number,
    name: String
});

const LwObject = new Schema({
    id: String,
    name: String,
    shortname: String,
    description: String,
    owner: {type:Schema.ObjectId, ref: 'Owner'},
    resources: [Number]
});

const access_types = ["R", "W", "RW", "E", null];
const value_types = ["Integer", "Float", "String", "Time", "Boolean", "Execute", "Opaque", "Objlnk"];
const LwResource = new Schema({
    id: String,
    name: String,
    shortname: String,
    description: String,
    access: {type: String, enum: access_types},
    multiple: Boolean,
    mandatory: Boolean,
    type: {type: String, enum: value_types},
    range: String,
    units: String,
    specific_object: {type:Schema.ObjectId, ref: 'LwObject', default: null}
});

const DeviceModel = new Schema({
    id: Number,
    name: {type: String, required: true},
    endpoint_prefix: {type: String, required: true},
    objects: []
});



const commands = ["read", "write", "observe", "execute", "writeAttr"];
const executions = ["registration"];
const services = ["MQTT"];

const Action = new Schema({
    id: Number,
    command: {type: String, enum: commands},
    oid: {type: Number, default: null},
    iid: {type: Number, default: null},
    rid: {type: Number, default: null},
    payload: String,
    execution: {type: String, enum: executions},
    activated: {type: Boolean, default: true},
    services: [],
    device_model: {type:Schema.ObjectId, ref: 'DeviceModel'}
});

const Observation = new Schema({
    device_id: Number,
    oid: {type: String, default: null},
    iid: {type: String, default: null},
    rid: {type: String, default: null},
    mqtt_topic: String
});


const ServicesActions = new Schema({
    config: Object,
    service: {type: String, enum: services},
});


const Aggregator = new Schema({
    name: String,
    server: {
        address: String
    },
    authentification: {
        user: String,
        password: String
    }
});

function load(db) {
    autoIncrement.initialize(db);

    DeviceModel.plugin(autoIncrement.plugin, { model: 'DeviceModel', field: 'id', startAt: 100 });
    Action.plugin(autoIncrement.plugin, { model: 'Action', field: 'id', startAt: 1000 });
    Owner.plugin(autoIncrement.plugin, { model: 'Owner', field: 'id', startAt: 10 });

    module.exports.Owner = db.model('Owner', Owner);
    module.exports.LwObject = db.model('LwObject', LwObject);
    //LwObject.plugin(relationship, { relationshipPathName: 'owner' });
    module.exports.LwResource = db.model('LwResource', LwResource);
    module.exports.DeviceModel = db.model('DeviceModel', DeviceModel);
    module.exports.Action = db.model('Action', Action);
    module.exports.Observation = db.model('Observation', Observation);
}

module.exports.load = load;
module.exports.commands = commands;
module.exports.access_types = access_types;
module.exports.value_types = value_types;