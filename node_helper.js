/*
 *
 * MMM-SolarMan
 *
 * Author: pwandrag
 * MIT Licensed.
 *
 */
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
var NodeHelper = require('node_helper');


/**
 * For interfacing with SolarmanPV.
 *
 * @module
 * @param {Object} opts  Need to pass a stationID, token.
 */
var SolarMan = async function(opts,source) {

	if(!opts.token) {
		throw new Error('token');
	}
	if(!opts.stationID) {
		throw new Error('stationID Must Be Defined');
	}

	var dataUrl = "";
	const token = opts.token;
	if (source === "system") {
		//https://globalhome.solarmanpv.com/maintain-s/operating/system/62052809
		dataUrl = `https://globalhome.solarmanpv.com/maintain-s/operating/system/${opts.stationID}`;
	}
	else {
		//https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/62052809/stats/daily?year=2025&month=6&day=8
		var today = new Date();
		var year = today.getFullYear();
		var month =today.getMonth();
		var day = today.getDate();
		 dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/${opts.stationID}/stats/daily?year=${year}&month=${month}&day=${day}`;
	}
		
	const response = await fetch(dataUrl,
		{ headers: { 
			Authorization: `Bearer ${token}`, 
			UserAgent:'MagicMirror' } 
		}, 
	);

	if (!response.ok) {
		console.error(`Error url:${dataUrl} status:${response.statusText} body: ${response.text()}`);
		return null;;
	} 	 


	if (source === "system") {
		const json = await response.json();
		this.stats = json;
		return {
				status: this.stats.consumerWarningStatus,
				load: this.stats.usePower,
				generating: this.stats.generationPower,
				battery: this.stats.dischargePower,
				grid: this.stats.wirePower,
				batteryStatus: this.stats.batteryStatus,
				soc: this.stats.batterySoc
			};
	}
	else {
		const json = await response.json();
		const records = json.records;
		const chartData = [];
		
		records.forEach(row => {
			chartData.push({   
				dateTime : new Date((row.dateTime) * 1000),
				timeLabel: new Date((row.dateTime) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
				batteryPower: row.batteryPower,
				generationPower: row.generationPower,
				load: row.usePower,
				soc: row.batterySoc,
				grid: row.wirePower,
			});
		});
	
		return chartData
	}
};

module.exports = NodeHelper.create({
    // Override start method.
    start: function() {
	  console.log("Starting node helper for: " + this.name);
	  this.started = false;
	  this.config = {};
      return;
    },

	// Override socketNotificationReceived method.
	socketNotificationReceived: async function(notification, payload) {

		// We save this.started (update timer) status, to prevent mutiple timer restarts
        // for each new client connection/instance.
		var self = this;
        //console.debug("MMM-SolarMan: Node helper received notification: " + notification);
		//console.debug("MMM-SolarMan: Node helper received payload: " + JSON.stringify(payload));
		if (notification === "START_SOLARMAN" && this.started == false) {				
			console.log("SocketNotification START_SOLARMAN received for the first time...setting updateInterval to " + payload.updateInterval + "ms");
			self.processData(payload); // When the MagicMirror module is called the first time, we are immediatly going to fetch data
   			setInterval(function() { processData(payload) }, payload.updateInterval); // Now let's schedule the job
			self.started = true;
		} else if (notification === "START_SOLARMAN" && this.started == true) {
			console.log("SocketNotification START_SOLARMAN received");
			await self.processData(payload);
		}
		return;
	},

	processData: async function(payload) {
		var self = this;
		
		// Send all to script
		const pv = await SolarMan(payload,"system");
		self.sendSocketNotification('SOLARMAN_DAY_SUMMARY', {
			payload: payload,
			data: pv
		});
	
		const pv2 = await SolarMan(payload,"detail");
		self.sendSocketNotification('SOLARMAN_DAY_DETAIL',{
			payload: payload,
			data: pv2
		});
		return;
	},

});
