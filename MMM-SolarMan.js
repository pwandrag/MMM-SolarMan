/* Magic Mirror
 * Module: MMM-SolarMan
 * Displays scalable chart.js graphs representing the current, monthly and yearly power output of SunnyPortal solar panels
 *
 * Author: pwandrag
 * Based upon original MMM-Sunnyportal module by linuxtuxie
 * MIT Licensed.
 *
 */

const { createElement } = require("react");

Module.register("MMM-SolarMan",{
	// Default module config.
	defaults: {	  
		updateInterval: 900,
		width: 500,
		height: 400,
		stationID: 62052809,	  
		token : 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiIwX3BhdWxAd2FuZHJhZy5jby56YV8yIiwibW9kaWZ5X3Bhc3N3b3JkIjoxLCJzY29wZSI6WyJhbGwiXSwiZGV0YWlsIjp7Im9yZ2FuaXphdGlvbklkIjowLCJ0b3BHcm91cElkIjpudWxsLCJncm91cElkIjpudWxsLCJyb2xlSWQiOi0xLCJ1c2VySWQiOjEzNzA2MTQzLCJ2ZXJzaW9uIjoxMDAwLCJpZGVudGlmaWVyIjoicGF1bEB3YW5kcmFnLmNvLnphIiwiaWRlbnRpdHlUeXBlIjoyLCJtZGMiOiJGT1JFSUdOXzEiLCJhcHBJZCI6bnVsbH0sImV4cCI6MTc1Mzg5MTY2MiwibWRjIjoiRk9SRUlHTl8xIiwiYXV0aG9yaXRpZXMiOlsiYWxsIl0sImp0aSI6IjAwODFmOTJkLWI1YjAtNGZmMS04ZDE2LWIzOWMyNWJiZjViZiIsImNsaWVudF9pZCI6InRlc3QifQ.gue7RcXKvO64mzE8qBUxdQYRdJoFTw1QfyAJB3oax9IZy88UJnxQMZnpGRjZTg56oBGs8TGpSSz7onWlgHCTcVZfVfeEmuYnRMJYEeNBxDjVJz6U0K2z-bqfsKTFtlixqW4Z094ML-2KplojGhbRAniQhgWSFLmXRvsSnchXVQTl2JyhObJte6fQQ1ms9hgcnK5bVemBcT0futicTuNvBWPrkal0Fmze24F3PikfrS9zM6kJ8r_lni-DT3Au4n0WhkdIm4ed_Ce5dCXB_FqBsUVuKphKLljydfL84lhc_BcyxW2QCRZfN3nCvUW-Dw2x1JSG3QHn9KnVlPu_5PX_rg',  //Required!
	},

  
	// Define required scripts. Chart.js needed for the graph.
	getScripts: function() {
	  return [
		'modules/MMM-SolarMan/node_modules/chart.js/dist/Chart.bundle.js',
		'moment.js'
	  ];
	},
  
	// Define required styles.
	getStyles: function() {
	  return ["MMM-SolarMan.css"];
	},
  
	getTranslations: function() {
		return {
			en: "translations/en.json",
		};
	},
  
	// Override start method.
	start: function() {
	  console.log("Starting module: " + this.name);

	  // Set locale.
      moment.locale(config.language);

	  this.payload = false;
	  refresh = (this.config.updateInterval <= 900 ? 900 : this.config.updateInterval) * 1000;
	  this.sendSocketNotification("START_SOLARMAN", {
		updateInterval: refresh,
		stationID: this.config.stationID,
		token: this.config.token,
	  });
	},

	socketNotificationReceived: function(notification, payload) {
	  var msgStats = document.getElementById("solarmanStats");

	  // was not able to receive data
	  if (notification == "ERROR") {
		msgStats.innerHTML=payload.error;
		return;
	  } else if (notification == "SOLARMAN_DAY_SUMMARY") {
		// no data received from node_helper.js
		if (!payload.data || payload.data.length == 0) {
		  msgStats.innerHTML = this.translate("NODATA");
		  return;
		} else {
			console.log("Going to draw Day chart with the following data: ");
			console.log(payload.data);

		  this.drawSummaryTable(payload.data);
		}
	} else if (notification == "SOLARMAN_DAY_DETAIL") {
		// no data received from node_helper.js
		if (!payload.data || payload.data.length == 0) {
		  msgStats.innerHTML = this.translate("NODATA");
		  return;
		} else {
			console.log("Going to draw Month chart with the following data: ");
			console.log(payload.data);

			this.drawDayChart(payload.data);
		}
	  }
	},
  
	// Override dom generator.
	getDom: function() {
		
		// Build the table
		var container = document.createElement("div");

		container.className = "solarmanContainer";
		container.style.width = this.config.width + "px";

		var headerDiv = document.createElement("div");
		var headerText = document.createElement("p");
		headerText.innerHTML = this.translate("Solar");
		headerText.style = "margin: 0px 0px 0px 15px;";

		var headerIcon = document.createElement("i");
		headerIcon.className = "fas fa-solar-panel";

		headerDiv.appendChild(headerIcon);
		headerDiv.appendChild(headerText);

		var divider = document.createElement("hr");
		divider.className = "dimmed";

		var graph = document.createElement("canvas");
		graph.className = "small thin light";
		graph.style.width = this.config.width + "px";
		graph.style.height = this.config.height - 30 + "px";
		graph.style.display = "none";
		graph.id = "solarmanGraph";

		var msg = document.createElement("div");
		msg.className = "small bright";
		msg.style.width = this.config.width + "px";
		msg.style.height = 30 + "px";
		msg.id = "solarmanStats";
		msg.innerHTML = this.translate("LOADING");

		container.appendChild(headerDiv);
		container.appendChild(divider);
		container.appendChild(msg);
		container.appendChild(graph);

		return container;
	},
  
	drawSummaryTable:  function(data){
		var container = document.getElementById("solarmanStats");
		container.style.display = "block";
		container.innerHTML = ""; // Clear previous content

		//create two column table
		var table = document.createElement("table");
		table.className = "small thin light";
		table.style.width = this.config.width + "px";
		table.style.height = this.config.height - 30 + "px";
		table.id = "solarmanStatsTable";

		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>System</td><td class='small light bright'>${data.status}</td>`)); 
		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>Load</td><td class='small light bright'>${data.load} W</td>`));
		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>Generating</td><td class='small light bright'>${data.generating} W</td>`));
		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>Battery</td><td class='small light bright'>${data.battery} W</td>`));
		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>Municipality</td><td class='small light bright'>${data.grid} W</td>`));
		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>Battery Status</td><td class='small light bright'>${data.batteryStatus}</td>`));
		table.append(document.createElement("tr").innerHTML(`<td class='small regular bright'>SOC</td><td class='small light bright'>${data.soc} %</td>`));

		container.appendChild(table);

	},

	/* 
	* Draw chart using chart.js node module
	* For config options visit https://www.chartjs.org/docs/latest/
	*/
	drawDayChart: function(data) {
		new Chart(document.getElementById("sunnyportalDayGraph"),
		{
			type: 'line',
			options:{
			elements:{
				point:{
				pointStyle:false
				},
				line:{
				cubicInterpolationMode:'default',
				borderWidth:0,
				},
				legend:{
				display: true,
				position: 'bottom',
				labels: {
					color: 'rgb(255,255,255)',
					boxWidth: 20,
					usePointStyle: true
				}
				},
			},
			scales: {
				x:{
					ticks:{
					color: 'rgb(255,255,255)',
					autoSkip: true,
					maxRotation: 90,
					minRotation: 90
					}
				},
				y: {
					stacked: false,
					beginAtZero: true,
					color: 'rgb(255,255,255)',
					min: 0,
					max: 8000,
					title: {
					display: true,
					text: 'Power (W)',
					color: 'rgb(255,255,255)'
					},
					ticks: {
					color: 'rgb(255,255,255)',
					stepSize: 500,
					}
				},
				y2:{
					display: true,
					lineWidth: 0,
					position: 'right',
					min:30,
					max:100,
					title: {
						display: true,
						text: 'Battery %',
						color: 'rgb(255,255,255)'
					},
					ticks: {
						color: 'rgb(255,255,255)',
						stepSize: 5,
					}
				}
			}
			},
			data: {
			labels: data.map(row => row.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})),
			datasets:[ 
			{
				type: 'line',
				label: 'SOC',
				data: data.map(row => row.soc),
				fill: false,
				borderWidth: 2,
				borderColor: 'rgb(255,0,255)',
				backgroundColor: 'rgb(255,0,255)',
				yAxisID: 'y2',
				},
				{
				type: 'line',
				label: 'Grid',
				data: data.map(row => row.grid),
				fill: false,
				borderWidth: 2,
				borderColor: 'rgb(255,0,0)',
				backgroundColor: 'rgb(255,0,0)',
				},
				{
				label: 'Load',
				type:'bar',
				data: data.map(row => row.load),
				fill: true,
				borderColor: 'rgb(0,255,0)',
				backgroundColor: 'rgb(0,255,0)',
				},
				{
				type: 'line',
				label: 'Generation',
				data: data.map(row => row.generationPower),
				fill: false,
				borderWidth: 2,
				borderColor: 'rgb(0,0,255)',
				backgroundColor: 'rgb(0,0,255)',
				},          
			]
			}
		}
		);
	
	}
	
  });
  
