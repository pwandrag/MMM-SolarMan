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
	let today = new Date();
	let year = today.getFullYear();
	let month =today.getMonth()+1; // Months are zero-based, so we add 1
	let day = today.getDate();
	if (source === "system") {
		dataUrl = `https://globalhome.solarmanpv.com/maintain-s/operating/system/${opts.stationID}`;
	}
	else if (source === "detail") {
		 dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/${opts.stationID}/stats/daily?year=${year}&month=${month}&day=${day}`;
		console.debug(`SolarMan dataUrl: ${dataUrl}`);
	} else {
		// daily data
		dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/power/analysis/${opts.stationID}/day?year=${year}&month=${month}&day=${day}`;
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
		// split the token, take the second part, which is the actual token
		let tokenParts = token.split('.');
		let tokenPart = tokenParts[1];
		// decode the token part
		let decodedToken = Buffer.from(tokenPart, 'base64').toString('utf8');
		// parse the decoded token as JSON
		let parsedToken = JSON.parse(decodedToken);
		// get expiration time from the token
		let expirationTime = parsedToken.exp * 1000; // convert to milliseconds

		let json = await response.json();
		this.stats = json;
		return {
				status: this.stats.consumerWarningStatus,
				load: this.stats.usePower,
				generating: this.stats.generationPower,
				battery: this.stats.dischargePower,
				grid: this.stats.wirePower,
				batteryStatus: this.stats.batteryStatus,
				soc: this.stats.batterySoc,
				tokenExpiration: expirationTime,
			};
	}
	else if (source === "detail") {
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
	} else {
		let json = await response.json();
		this.statsDay = json;
	
		return {
				generationPowerToday: this.statsDay.gvForUse.toFixed(2),
				loadToday: this.statsDay.useValue.toFixed(2),
				batteryPowerToday: this.statsDay.uvFromDischarge.toFixed(2),
				gridPowerToday: this.statsDay.uvFromBuy.toFixed(2)
		};
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
   			setInterval( async function() { await self.processData(payload) }, payload.updateInterval); // Now let's schedule the job
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
		let pvTotal = await SolarMan(payload,"day");
		
		self.sendSocketNotification('SOLARMAN_DAY_SUMMARY', {
			payload: payload,
			data: {
				instantaneous: pv,
				today: pvTotal
			}
		});
	
		let pv2 = await SolarMan(payload,"detail");
		self.sendSocketNotification('SOLARMAN_DAY_DETAIL', {
			payload: payload,
			data: pv2
		});
		return;
	},

});
