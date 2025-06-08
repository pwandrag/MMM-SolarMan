/*
 *
 * MMM-SolarMan
 *
 * Author: pwandrag
 * MIT Licensed.
 *
 */
var NodeHelper = require('node_helper');
var fetch = require('node-fetch');

/**
 * Sunny Portal API Node Library
 * For interfacing with SolarmanPV.
 *
 * @module
 * @param {Object} opts  Need to pass a stationID, token.
 */
var SolarMan = async function(opts) {

	if(!opts.token) {
		throw new Error('token');
	}
	if(!opts.stationID) {
		throw new Error('stationID Must Be Defined');
	}

	//https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/62052809/stats/daily?year=2025&month=6&day=8
	var today = new Date();
	var year = today.year();
	var month =today.month();
	var day = today.day();
	var dataUrl = `globalhome.solarmanpv.com/maintain-s/history/batteryPower/${opts.url}/${opts.stationID}/stats/daily?year=${year}&month=${month}&day=${day}`;
	var token = opts.token;
	
	const response = await fetch(
	dataUrl,
	{ headers: { Authorization: `Bearer ${token}`, UserAgent:'MagicMirror' } }
	);
	const json = await response.json();
	const records = json.records;
	const stats = json.statistics;

	records.forEach(row => {
		this.chartData.push({   
		dateTime : new Date((row.dateTime + row.timeZoneOffset) * 1000),
		timeZoneOffset: row.timeZoneOffset,
		batteryPower: row.batteryPower,
		generationPower: row.generationPower,
		load: row.usePower,
		soc: row.batterySoc,
		grid: row.wirePower,
		});
	});

	this.statsData = new {
		status: stats.warningStatus,
		load: stats.usePower,
		generating: stats.generationPower,
		battery: stats.dischargePoser,
		grid: stats.buyPower,
		batteryStatus: stats.batteryStatus,
		soc: stats.batterySoc,
	}

	return {
		stats : statsData,
        details : chartData
	};

};

module.exports = NodeHelper.create({
    // Override start method.
    start: function() {
	  console.log("Starting node helper for: " + this.name);
	  this.started = false;
      return;
    },

	// Override socketNotificationReceived method.
	socketNotificationReceived: function(notification, payload) {

		// We save this.started (update timer) status, to prevent mutiple timer restarts
        // for each new client connection/instance.
		var self = this;

		if (notification === "START_SOLARMAN" && this.started == false) {				
			console.log("SocketNotification START_SOLARMAN received for the first time...setting updateInterval to " + payload.updateInterval + "ms");
			startup(payload); // When the MagicMirror module is called the first time, we are immediatly going to fetch data
   			setInterval(function() { processData(payload) }, payload.updateInterval); // Now let's schedule the job
			self.started = true;
		} else if (notification === "START_SOLARMAN" && this.started == true) {
			console.log("SocketNotification START_SOLARMAN received");
			self.processData(payload);
		}
  },

  processData: function(payload) {
	  const pv = new SolarMan(payload.url,payload.stationID, payload.token);
	  console.log("Starting function processDayData with data: " + pv);

    // Send all to script
    self.sendSocketNotification('SOLARMAN_DAY_SUMMARY', {
		payload: payload,
        data: pv.stats
    });

	self.sendSocketNotification('SOLARMAN_DAY_DETAIL',{
		payload: payload,
		data: pv.details
	});
  },

});
