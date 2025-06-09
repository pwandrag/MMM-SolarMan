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
let NodeHelper = require('node_helper');


/**
 * For interfacing with SolarmanPV.
 *
 * @module
 * @param {Object} opts  Need to pass a stationID, token.
 */
let SolarMan = async function(opts,source) {

	if(!opts.token) {
		throw new Error('token');
	}
	if(!opts.stationID) {
		throw new Error('stationID Must Be Defined');
	}

	let dataUrl = "";
	let token = opts.token;
	if (source === "system") {
		//https://globalhome.solarmanpv.com/maintain-s/operating/system/62052809
		dataUrl = `https://globalhome.solarmanpv.com/maintain-s/operating/system/${opts.stationID}`;
	}
	else {
		//https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/62052809/stats/daily?year=2025&month=6&day=8
		let today = new Date();
		let year = today.getFullYear();
		let month =today.getMonth()+1; // Months are zero-based, so we add 1
		let day = today.getDate();
		 dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/${opts.stationID}/stats/daily?year=${year}&month=${month}&day=${day}`;

	}
		
	let response = await fetch(dataUrl,
		{ headers: { 
			Authorization: `Bearer ${token}`, 
			UserAgent:'MagicMirror' } 
		}, 
	);

	if (!response.ok) {
		console.error(`Error url:${dataUrl} status:${response.statusText} body: ${response.text()}`);
		return null;
	} 	 


	if (source === "system") {
		let json = await response.json();
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
		let json = await response.json();
		let records = json.records;
		let chartData = [];
		
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
		let pv = await SolarMan(payload,"system");
		self.sendSocketNotification('SOLARMAN_DAY_SUMMARY', {
			payload: payload,
			data: pv
		});
	
		let pv2 = await SolarMan(payload,"detail");
		self.sendSocketNotification('SOLARMAN_DAY_DETAIL',{
			payload: payload,
			data: pv2
		});
		return;
	},

});
