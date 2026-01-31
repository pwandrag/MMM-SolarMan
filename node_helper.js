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

let cache = {};

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
	switch (source){
		case "deviceList":{
				dataUrl = `https://globalhome.solarmanpv.com/maintain-s/fast/device/${opts.stationID}/device-list?deviceType=INVERTER`;
			}
			break;
		case "deviceConfig": {
				dataUrl = `https://globaldc-pro.solarmanpv.com/order-s/order/action/${opts.deviceID}`;
			}
			break;
		case "system": {
				dataUrl = `https://globalhome.solarmanpv.com/maintain-s/operating/system/${opts.stationID}`;
			}
			break;
		case "detail": {
		 		dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/batteryPower/${opts.stationID}/stats/daily?year=${year}&month=${month}&day=${day}`;
			}
			break;
		case "day": {
			dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/power/analysis/${opts.stationID}/day?year=${year}&month=${month}&day=${day}`;
			}
			break;
		case "prevDay": {
			today.setDate(today.getDate() - 1); // Go back one day
			year = today.getFullYear();
			month = today.getMonth() + 1; // Months are zero-based, so we add 1
			day = today.getDate();
			dataUrl = `https://globalhome.solarmanpv.com/maintain-s/history/power/analysis/${opts.stationID}/day?year=${year}&month=${month}&day=${day}`;
			}
			break;
	}
	//console.log(`Fetching data from ${dataUrl}`);
	let response = await fetch(dataUrl,
		{ headers: { 
			Authorization: `Bearer ${token}`, 
			UserAgent:'MagicMirror' } 
		}, 
	);

	if (!response.ok) {
		console.error(`Error url:${dataUrl} status:${response.statusText} body: ${await response.text()}`);
		return null;
	} 	 

	switch(source) {
		case "deviceList": {
			// Handle device list response
			let json = await response.json();
			return json;
		}		
		case "deviceConfig": {
			// Handle device config response
			let json = await response.json();
			return json;
		}
		case "system": {
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
			var gridStatus = "BREAK";
			if (this.stats.gridStatus != null){
				gridStatus = this.stats.gridStatus;
			}
			return {
					status: this.stats.consumerWarningStatus,
					load: this.stats.usePower,
					generating: this.stats.generationPower,
					battery: this.stats.dischargePower,
					grid: this.stats.wirePower,
					batteryStatus: this.stats.batteryStatus,
					soc: this.stats.batterySoc,
					tokenExpiration: expirationTime,
					gridStatus: gridStatus
				};
		}
		case "detail": {
			let json = await response.json();
			let records = json.records;
			let chartData = [];

			records.forEach(row => {
				let dateStamp = new Date((row.dateTime) * 1000);
				//let socTargetForHour = getSocTarget(dateStamp.getHours(),opts.deviceSetup.workmode2);
				chartData.push({   
					dateTime : dateStamp,
					timeLabel: dateStamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
					batteryPower: row.batteryPower,
					generationPower: row.generationPower,
					load: row.usePower,
					soc: row.batterySoc,
					grid: row.wirePower,
					//socTarget: socTargetForHour
				});
			});
			return chartData;
		}
		case "day": {
			let json = await response.json();
			this.statsDay = json;
			//console.log("Stats Day:", this.statsDay);
			return {
					generationPowerToday: (this.statsDay.gvForUse===null ? 0 : this.statsDay.gvForUse.toFixed(2)),
					loadToday: (this.statsDay.useValue===null ? 0 : this.statsDay.useValue.toFixed(2)),
					batteryPowerToday: (this.statsDay.uvFromDischarge===null ? 0 : this.statsDay.uvFromDischarge.toFixed(2)),
					gridPowerToday: (this.statsDay.uvFromBuy===null ? 0 : this.statsDay.uvFromBuy.toFixed(2))
			};
		}
		case "prevDay": {
			let json = await response.json();
			this.statsPrevDay = json;
			//console.log("Stats Prev Day:", this.statsPrevDay);
			return {
					generationPowerPrevDay: (this.statsPrevDay.gvForUse===null ? 0 : this.statsPrevDay.gvForUse.toFixed(2)),
					loadPrevDay: (this.statsPrevDay.useValue===null ? 0 : this.statsPrevDay.useValue.toFixed(2)),
					batteryPowerPrevDay: (this.statsPrevDay.uvFromDischarge===null ? 0 : this.statsPrevDay.uvFromDischarge.toFixed(2)),
					gridPowerPrevDay: (this.statsPrevDay.uvFromBuy===null ? 0 : this.statsPrevDay.uvFromBuy.toFixed(2))
			};
		}
	}
};

function getSocTarget(hour, workmode2){
	try	
	{
		if (!hour) return 0; // If no hour is provided, return 0

		//round incoming date to nearest hour
		var hourLookup = (hour.toString()+'00').padStart(4, '0');
		var socTarget = workmode2.find((item) => item.hour === hourLookup);
		return socTarget ? socTarget.soc : 0; // Return the SOC or 0 if not found
	}catch (error) {
		console.error("Error in getSocTarget: ", error);
		return 0; // Return 0 if an error occurs
	}
}

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
			payload.deviceSetup = await self.initStartup(payload);
			cache = payload.deviceSetup; // Store the device setup in cache for later use
			self.processData(payload); // When the MagicMirror module is called the first time, we are immediatly going to fetch data
   			setInterval( async function() { await self.processData(payload) }, payload.updateInterval); // Now let's schedule the job
			self.started = true;
		} else if (notification === "START_SOLARMAN" && this.started == true) {
			console.log("SocketNotification START_SOLARMAN received");
			payload.deviceSetup = cache; // Use the cached device setup
			await self.processData(payload);
		}
		return;
	},

	initStartup: async function (payload) {
		var self = this;

		return {
			workmode2: []
		}

		//devices returns all inverters for the location id
		let devices = await SolarMan({stationID: payload.stationID, token: payload.token},"deviceList");
		let deviceId = devices[0].deviceId;

		//this gets the device configuration for the first inverter
		let deviceConfig = await SolarMan({stationID: payload.stationID, token: payload.token, deviceID: deviceId},"deviceConfig");

		//workmodes tell the inverter wat target SOC (State of Charge) to get the inverter to at a given time of the day
		let workMode2Setup = null;
		if (deviceConfig.cnjgzms2 === undefined) {
			console.log(deviceConfig.cnjgzms1.extendWeb);
			workMode2Setup = JSON.parse(deviceConfig.cnjgzms1.extendWeb);
		} else{
			console.log(deviceConfig.cnjgzms2.extendWeb);
			workMode2Setup = JSON.parse(deviceConfig.cnjgzms2.extendWeb);
		}
		workMode2Setup = workMode2Setup.inputParam;

		let workmode2 =[];
		
		workmode2.push({ hour: workMode2Setup["00FA"].v, soc: workMode2Setup["010C"].v });
		workmode2.push({ hour: workMode2Setup["00FB"].v, soc: workMode2Setup["010D"].v });
		workmode2.push({ hour: workMode2Setup["00FC"].v, soc: workMode2Setup["010E"].v });
		workmode2.push({ hour: workMode2Setup["00FD"].v, soc: workMode2Setup["010F"].v });
		workmode2.push({ hour: workMode2Setup["00FE"].v, soc: workMode2Setup["0110"].v });
		workmode2.push({ hour: workMode2Setup["00FF"].v, soc: workMode2Setup["0111"].v });

		//assuming workmode2 is keyed by hour, fill in missing hour values by forward filling soc so that we have a complete day of values which can be plotted
		let lastTarget = 0;
		let workmode2allDay = [];
		for (let index = 0; index < 2400; index++) {
			var time = index.toString().padStart(4, '0');
			var element = workmode2.find(item => item.hour === time);
			if (!element) {
				workmode2allDay.push({ hour: time, soc: lastTarget });
			} else {
				lastTarget = element.soc
				workmode2allDay.push({ hour: time, soc: lastTarget });
			}
		}

		return {
			workmode2: workmode2allDay
		}
	},

	processData: async function(payload) {
		var self = this;

		// Send all to script
		let pv = await SolarMan(payload,"system");
		let pvTotal = await SolarMan(payload,"day");
		let pvTotalPrevDay = await SolarMan(payload,"prevDay");
		
		self.sendSocketNotification('SOLARMAN_DAY_SUMMARY', {
			payload: payload,
			data: {
				instantaneous: pv,
				today: pvTotal,
				yesterday: pvTotalPrevDay
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
