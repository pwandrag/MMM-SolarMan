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
		token : ''
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
		row.innerHTML = `<td class='small regular bright'>System</td><td class='small light bright'>${data.status} <span class='normal xsmall' style='float:right'>Token:${new Date(data.tokenExpiration).toLocaleDateString('en-us',[{day:'numeric'},{month:'short'},{year:'none'}])}</span></td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Load</td><td class='small light bright'>${data.load} W</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Generating</td><td class='small light bright'>${data.generating} W</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Battery</td><td class='small light bright'>${data.battery} W</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Grid</td><td class='small light bright'>${data.grid} W</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Battery Status</td><td class='small light bright'>${data.batteryStatus}</td>`;
		table.appendChild(row);
		row = document.createElement("tr");
		row.innerHTML = `<td class='small regular bright'>Battery Level</td><td class='small light bright'><div class='progress-container'><div class='progress-bar' style='width:${data.soc}%'>${data.soc}%</div></div></td>`;
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
						label: 'SOC',
						data: data.map(row => row.soc),
						fill: false,
						borderWidth: 2,
						borderColor: '#4caf50',
						backgroundColor: '#4caf50',
						yAxisID: 'y2',
						pointStyle : false
					},
					{
						type: 'line',
						label: 'Grid',
						data: data.map(row => row.grid),
						fill: false,
						borderWidth: 2,
						borderColor: 'rgba(255, 0, 0, 0.87)',
						backgroundColor: 'rgba(255, 0, 0, 0.87)',
						yAxisID: 'y'
					},
					{
						type:'bar',
						label: 'Load',
						data: data.map(row => row.load),
						fill: true,
						borderColor: 'rgb(116, 74, 116)',
						backgroundColor: 'rgb(116, 74, 116)',
						yAxisID: 'y',
						borderWidth: 2,
						minBarLength: 2,
						//barThickness: 10,
						//borderRadius: 5,
					},
					{
						type: 'line',
						label: 'Generation',
						data: data.map(row => row.generationPower),
						fill: false,
						borderWidth: 2,
						borderColor: 'rgb(101, 101, 233)',
						backgroundColor: 'rgb(101, 101, 233)',
						yAxisID: 'y'
					}         
				]
			}
		});
	}
	
  });
  
