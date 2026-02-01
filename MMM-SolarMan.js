/* Magic Mirror
 * Module: MMM-SolarMan
 * Displays scalable chart.js graphs representing the current, monthly and yearly power output of SunnyPortal solar panels
 *
 * Author: pwandrag
 * Based upon original MMM-Sunnyportal module by linuxtuxie
 * MIT Licensed.
 *
 */

Module.register("MMM-SolarMan",{
	// Default module config.
	defaults: {	  
		updateIntervalSeconds: 120, // Update interval in seconds
		width: 500,
		height: 400,
		stationID: 62052809,	  
		token : '',
		workmode2: null
	},

  
	// Define required scripts. Chart.js needed for the graph.
	getScripts: function() {
	  return [
		'modules/MMM-SolarMan/node_modules/chart.js/dist/chart.js',
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
	  refresh = (this.config.updateIntervalSeconds) * 1000;
	  this.sendSocketNotification("START_SOLARMAN", {
		updateInterval: refresh,
		stationID: this.config.stationID,
		token: this.config.token,
	  });
	},

	socketNotificationReceived: function(notification, payload) {
	  let msgStats = document.getElementById("solarmanStats");

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
		  	this.drawSummaryTable(payload.data);
			return;
		}
	} else if (notification == "SOLARMAN_DAY_DETAIL") {
		// no data received from node_helper.js
		if (!payload.data || payload.data.length == 0) {
		  	msgStats.innerHTML = this.translate("NODATA");
		  	return;
		} else {
			this.drawDayChart(payload.data);
			return;
		}
	  }
	},
  
	// Override dom generator.
	getDom: function() {
		
		// Build the table
		let container = document.createElement("div");

		container.className = "solarmanContainer";
		container.style.width = this.config.width + "px";

		let headerDiv = document.createElement("div");
		let headerText = document.createElement("p");
		headerText.innerHTML = this.translate("Solar");
		headerText.style = "margin: 0px 0px 0px 15px;";
		headerText.className = "light small";

		let headerIcon = document.createElement("i");
		headerIcon.className = "fas fa-fw fa-solar-panel";

		headerDiv.appendChild(headerIcon);
		headerDiv.appendChild(headerText);

		let divider = document.createElement("hr");
		divider.className = "dimmed";

		let graphDiv = document.createElement("div");
		graphDiv.className = "small thin light";
		graphDiv.style.width = this.config.width + "px";
		graphDiv.style.height = (this.config.height-30) /2  + "px";
		graphDiv.style.display = "table-cell";
		let graph = document.createElement("canvas");
		graph.id = "solarmanGraph";
		graphDiv.appendChild(graph);

		let msg = document.createElement("div");
		msg.className = "small bright";
		msg.style.width = this.config.width + "px";
		msg.style.height = (this.config.height-30)/2 + "px";
		msg.style.display = "table-cell";
		msg.id = "solarmanStats";
		msg.innerHTML = this.translate("LOADING");

		container.appendChild(headerDiv);
		container.appendChild(divider);
		container.appendChild(msg);
		container.appendChild(graphDiv);

		return container;
	},
  
	drawSummaryTable:  function(data){
		//console.log("Going to draw summary table: ");
		//console.log(JSON.stringify(data));


		let container = document.getElementById("solarmanStats");
		container.style.display = "block";
		container.innerHTML = ""; // Clear previous content

		//create two column table
		let table = document.createElement("table");
		table.className = "small thin light";
		table.style.width = this.config.width + "px";
		table.id = "solarmanStatsTable";

		let row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>System</td><td class='small light bright'>${data.instantaneous.status}</td><td class='small regular bright'>Grid:<span class='small light bright'>${data.instantaneous.gridStatus}</span></td><td><span class='normal xsmall' style='float:right'>Token:${new Date(data.instantaneous.tokenExpiration).toLocaleDateString('en-us',[{day:'numeric'},{month:'short'},{year:'none'}])}</span></td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Load</td><td class='small light bright'>${data.instantaneous.load} W</td><td class='normal small light align-right'>${data.today.loadToday} KW</td><td class='normal xsmall light align-right'>${data.yesterday.loadPrevDay} KW</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Generating</td><td class='small light bright'>${data.instantaneous.generating} W</td><td class='normal small light align-right'>${data.today.generationPowerToday} KW</td><td class='normal xsmall light align-right'>${data.yesterday.generationPowerPrevDay} KW</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Battery</td><td class='small light bright'>${data.instantaneous.battery} W</td><td class='normal small light align-right'>${data.today.batteryPowerToday} KW</td><td class='normal xsmall light align-right'>${data.yesterday.batteryPowerPrevDay} KW</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Grid</td><td class='small light bright'>${data.instantaneous.grid} W</td><td class='normal small light align-right'>${data.today.gridPowerToday} KW</td><td class='normal xsmall light align-right'>${data.yesterday.gridPowerPrevDay} KW</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Battery Status</td><td colspan=3 class='small light bright'>${data.instantaneous.batteryStatus}</td><td></td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Battery Level</td><td colspan=3 class='small light bright'><div class='progress-container'><div class='progress-bar' style='width:${data.instantaneous.soc}%'>${data.instantaneous.soc}%</div></div></td>`;
		table.appendChild(row);

		container.appendChild(table);

	},

	/* 
	* Draw chart using chart.js node module
	* For config options visit https://www.chartjs.org/docs/latest/
	*/
	drawDayChart: function(data) {
		//console.log("Going to draw Month chart with the following data: ");
		//console.log(JSON.stringify(data));

		var container = document.getElementById("solarmanGraph");
		var ctx = container.getContext("2d");

		// Clear previous chart if it exists
		if (this.c) {
			this.c.destroy();
		}

		this.c = new Chart(ctx,
		{
			type: 'line',
			options:{
				elements:{
					point:{
						pointStyle:false,
						radius: 0,
					},
					legend:{
						display: true,
						position: 'bottom',
						labels: {
							color: 'rgb(255,255,255)',
							boxWidth: 20,
						}
					},
					line: {
						tension: 0.4, // Smooth lines
					}
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
				},
				plugins:{
					legend:{
						labels:{
							color: 'rgb(255,255,255)',
						}
					}
				}
			},
			data: {
				labels: data.map(row => row.timeLabel),
				datasets:[ 
					{
						type: 'line',
						label: 'Battery',
						data: data.map(row => row.soc),
						fill: false,
						borderWidth: 2,
						borderColor: 'rgba(75, 236, 144, 1)',
						backgroundColor: 'rgba(75, 236, 144, 0.20)',
						yAxisID: 'y2',
						pointStyle : false,
					},
					{
						type: 'line',
						label: 'Grid',
						data: data.map(row => row.grid),
						fill: true,
						borderWidth: 2,
						borderColor: 'rgba(236, 225, 75, 1)',
						backgroundColor: 'rgba(236, 225, 75, 0.20)',
						yAxisID: 'y'
					},
					{
						type:'line',
						label: 'Load',
						data: data.map(row => row.load),
						fill: true,
						borderWidth: 2,
						borderColor: 'rgb(236, 75, 167)',
						backgroundColor: 'rgb(236, 75, 167,0.20)',
						yAxisID: 'y'
					},
					{
						type: 'line',
						label: 'Generation',
						data: data.map(row => row.generationPower),
						fill: true,
						borderWidth: 2,
						borderColor: 'rgb(75, 86, 236)',
						backgroundColor: 'rgb(75, 86, 236,0.20)',
						yAxisID: 'y'
					},
					{
						type: 'line',
						label: 'Soc Target',
						data: data.map(row => row.socTarget),
						fill: true,
						borderWidth: 2,
						borderColor: 'rgba(7, 247, 235, 1)',
						backgroundColor: 'rgb(75, 86, 236,0.20)',
						yAxisID: 'y2'
					}         
				]
			}
		});
	}
	
  });
  
