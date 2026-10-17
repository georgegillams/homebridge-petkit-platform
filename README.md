Petkit Homebridge Plugin
========================

<p align="center">
    <img src="https://github.com/jubepue/homebridge-petkit-platform/blob/master/images/homebridge-petkit-platform.png"><br>
</p>

<span align="center">
    
[![npm](https://img.shields.io/npm/v/homebridge-petkit-platform.svg)](https://www.npmjs.com/package/homebridge-petkit-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-petkit-platform.svg)](https://www.npmjs.com/package/homebridge-petkit-platform)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
    
[![GitHub watchers](https://img.shields.io/github/watchers/jubepue/homebridge-petkit-platform.svg?style=social&label=Watch)](https://GitHub.com/jubepue/homebridge-petkit-platform/watchers/)
[![GitHub stars](https://img.shields.io/github/stars/jubepue/homebridge-petkit-platform.svg?style=social&label=Star)](https://GitHub.com/jubepue/homebridge-petkit-platform/stargazers/)
[![GitHub forks](https://img.shields.io/github/forks/jubepue/homebridge-petkit-platform.svg?style=social&label=Fork)](https://GitHub.com/jubepue/homebridge-petkit-platform/network/)

If you like Petkit Homebridge Plugin - give it a star, or fork it and contribute!

</span>

Homebridge custom plugin for controlling all your Petkit devices in HomeKit.

## Preparation
  1. [Use the Petkit Homebridge Plugin](https://github.com/jubepue/homebridge-petkit-platform/wiki/How-to-Use-Petkit-Homebridge-Plugin)
  2. [How to Get Logs](https://github.com/jubepue/homebridge-petkit-platform/wiki/How-To-Get-Logs)

## Feeding / fan speed

Feeders appear as a fan accessory. Set the fan speed to choose the portion, then toggle **Food Dispenser** to dispense.

### Fresh Element Solo (D4)

The Solo API only accepts 10–50g portions. Fan speed maps in 20% steps:

| Fan speed | Grams |
| --------- | ----- |
| 1–20% | 10g |
| 21–40% | 20g |
| 41–60% | 30g |
| 61–80% | 40g |
| 81–100% | 50g |

On Solo, the fan control steps in 20% increments so each notch is a valid portion. Use **Default Fan Speed** in the plugin settings to choose the startup portion.

### Other feeder models

Other feeders use the original plugin formula:

`grams = floor(speed% / 10) × 5`

Each 10% of fan speed adds 5g (0% dispenses nothing):

| Fan speed | Grams |
| --------- | ----- |
| 1–9% | 0g |
| 10–19% | 5g |
| 20–29% | 10g |
| 30–39% | 15g |
| 40–49% | 20g |
| 50–59% | 25g |
| 60–69% | 30g |
| 70–79% | 35g |
| 80–89% | 40g |
| 90–99% | 45g |
| 100% | 50g |

## Set up the development environment

```
—-VSCode
—-engines
    "node": “>=0.12.0”
    "homebridge": ">=0.2.0"
—-dependencies
    "axios": “^0.21.1",
    "crypto-js": “^4.0.0”, 
    "uuid": "^8.3.2",
    "qs": "^6.11.0"
```

## Feedback

You can use the **GitHub Issue** to provide feedback on any problems you encounter.

## LICENSE

For more information, see the [LICENSE](LICENSE) file.
