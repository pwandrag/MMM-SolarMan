## MagicMirror Module: SolarMan

Display your SolarMan PV Solar Panel Inverter output

| Status | Version | Date | 
|:------- |:------- |:---- |
| Working | 1.0.1 | 2025-06-08 |

#### What is this module doing?

*MMM-SolarMan* is a [MagicMirror](https://github.com/MichMich/MagicMirror) module for displaying the 
current, power state of your PV installation. 

### Example Screenshots

Module Screenshot:

---

### Dependencies

This module depends on the following *npm* packages:

* [node-fetch](github.com/node-fetch/node-fetch)  - Simplified HTTP client
* [chartjs](https://github.com/chartjs/Chart.js) - Simple yet flexible JavaScript charting for designers & developers.

These are also listed in the `package.json` file and should be installed automatically when using *npm*.
However, those may require other packages. 

---

### Installation

Manual Installation:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/pwandrag/MMM-SolarMan.git
cd MMM-SolarMan
```

Next install the dependencies: *request*, *flow* and *chartjs*, by running:

```bash
npm install node-fetch --save
npm install chart.js --save

```

Alternatively, on a *unix* based distribution, you can try to install all the above mentioned dependencies with the Bash script:

```bash
chmod 755 install_deps.sh
./install_deps.sh
```

---

### Configuration 

To configure the SunnyPortal module, you need to do the following:

1. Add the Module to the global MagicMirror `config.js` 
2. Edit the global config to add the username and password values for your SunnyPortal installation
3. [optional] Modify `MMM-SolarMan.css` to your own CSS taste
4. [optional] Add your own language translation file in the translations folder (currently english are provided)


Add this module to the modules array in the `config/config.js` file by adding the following example section.<br>You must include your SolarMan stationID and token, you can edit the config to include any of the configuration options described below. 

```javascript
{
    module: 'MMM-SolarMan',
    position: 'bottom_left',
    header: 'Solar',
    config: {
        updateInterval: 900,
        token: '',              //Required: Your SolarMan token
        stationID: '',          //Reguired: Your stationID
        width: 500,
        height: 400,
    }
},
```

---

#### Configuration Options 

| Option            | Description  |
|:----------------- |:------------ | 
| updateInterval    | Module data update rate. [in seconds]<br>*Optional*<br>*Default and minimum value:* `900` (a lower value is ignored)|
| token             | Your Token `'token'`<br>**Required** |
| stationID         | Your Station ID `'stationID'`<br>**Required** |
| width             | The width of the module.<br>*Optional*<br>*Default value:* `500` |
| height            | The height of the module.<br>*Optional*<br>*Default value:* `400` |

#### Contribution

Feel free to post issues or remarks related to this module.  
For all other or general questions, please refer to the [MagicMirror Forum](https://forum.magicmirror.builders/).

#### Credits
I based the code on linuxtuxie's [MMM-SunnyPortal](https://github.com/linuxtuxie/MMM-SunnyPortal)

#### License 

[MIT License](https://github.com/linuxtuxie/MMM-SunnyPortal/blob/master/LICENSE) 

