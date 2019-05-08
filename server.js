'use strict';
var violetSrvr = require('violet/lib/violetSrvr')('/violet');
violetSrvr.listAppsAt('/');
var srvrInstance = violetSrvr.createAndListen(process.env.PORT || 8080);
violetSrvr.loadScript('gameNight.js', 'trailhead');
console.log('Waiting for requests...');