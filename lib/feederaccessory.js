const BaseAccessory = require('./baseaccessory')

let Accessory;
let Service;
let Characteristic;

// Fresh Element Solo (D4) only accepts these portion sizes (grams)
const SOLO_DEVICE_TYPES = new Set(['D4']);
const SOLO_VALID_AMOUNTS = [10, 20, 30, 40, 50];

function isFreshElementSolo(deviceType) {
  return SOLO_DEVICE_TYPES.has(deviceType);
}

/**
 * Fan RotationSpeed (%) → grams
 *
 * Fresh Element Solo (D4) — API only accepts 10–50g:
 *   1–20%  → 10g
 *  21–40%  → 20g
 *  41–60%  → 30g
 *  61–80%  → 40g
 *  81–100% → 50g
 *
 * Other feeders — original plugin formula:
 *   amount = floor(speed / 10) * 5
 */
function amountFromFanSpeed(speed, deviceType) {
  const pct = Math.max(0, Math.min(100, parseInt(speed, 10) || 0));
  if (isFreshElementSolo(deviceType)) {
    if (pct <= 0) {
      return SOLO_VALID_AMOUNTS[0];
    }
    const idx = Math.min(SOLO_VALID_AMOUNTS.length - 1, Math.ceil(pct / 20) - 1);
    return SOLO_VALID_AMOUNTS[idx];
  }
  return Math.floor(pct / 10) * 5;
}

function normalizeDefaultFanSpeed(value, deviceType) {
  const pct = parseInt(value, 10);
  if (isFreshElementSolo(deviceType)) {
    if (isNaN(pct) || pct <= 0) {
      return 20;
    }
    // Snap to nearest 20% step (20, 40, 60, 80, 100)
    return Math.min(100, Math.max(20, Math.round(pct / 20) * 20));
  }
  if (isNaN(pct) || pct <= 0) {
    return 40;
  }
  return Math.min(100, Math.max(0, pct));
}

class FeederAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {
    const hap = platform.api.hap;
    ({ Accessory, Characteristic, Service } = hap);
    const Categories = hap.Categories || (Accessory && Accessory.Categories);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Categories.FAN,
      Service.Fanv2
    );
    this.statusArr = deviceConfig.state ? deviceConfig.state : {};
    this.deviceType = deviceConfig.type;
    this.deviceId = deviceConfig.id;

    const options = (platform.config && platform.config.options) || {};
    this.defaultFanSpeed = normalizeDefaultFanSpeed(options.defaultFanSpeed, this.deviceType);

    this.addService(Service.Switch, 'Food Dispenser');
    this.addService(Service.OccupancySensor, 'Door');
    this.addService(Service.OccupancySensor, 'Food');

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    this.log.info(
      `Feeder ${this.deviceConfig.name} (${this.deviceType}): default fan ${this.defaultFanSpeed}% → ${amountFromFanSpeed(this.defaultFanSpeed, this.deviceType)}g`
    );
  }

  addService(serviceType, name) {
    var service = this.homebridgeAccessory.getService(name);
    if (service) {
      service.setCharacteristic(Characteristic.Name, name);
    } else {
      this.homebridgeAccessory.addService(serviceType, name, name);
    }
  }

  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    if (!this.isRefresh) {
      this.normalAsync(Characteristic.RotationSpeed, this.defaultFanSpeed, this.service);
    }

    const dispenser = this.homebridgeAccessory.getService('Food Dispenser');
    if (dispenser) {
      this.eventAsync(Characteristic.On, false, dispenser);
    }

    // RotationSpeed get/set so changing the fan % updates cleanly
    if (!this.isRefresh && this.service) {
      this.bindRotationSpeed();
    }

    let blk_d = null;
    for (const statusMap in statusArr) {
      let service;
      switch (statusMap) {
        case 'errorCode':
          blk_d = statusArr[statusMap] === 'blk_d' ? 1 : 0;
        case 'door':
          service = this.homebridgeAccessory.getService('Door');
          if (service) {
            this.normalAsync(Characteristic.OccupancyDetected, blk_d == 1 ? 1 : 0, service);
          }
          break;
        case 'food':
          service = this.homebridgeAccessory.getService('Food');
          if (service) {
            this.normalAsync(Characteristic.OccupancyDetected, statusArr[statusMap] ? 0 : 1, service);
          }
          break;
        default:
          break;
      }
    }
  }

  bindRotationSpeed() {
    const characteristic = this.service.getCharacteristic(Characteristic.RotationSpeed);
    characteristic.removeAllListeners('get');
    characteristic.removeAllListeners('set');
    if (isFreshElementSolo(this.deviceType)) {
      // 20% steps so each notch maps to a valid Solo portion (10–50g)
      characteristic.setProps({ minValue: 0, maxValue: 100, minStep: 20 });
    } else {
      characteristic.setProps({ minValue: 0, maxValue: 100, minStep: 1 });
    }
    characteristic
      .on('get', (callback) => {
        const key = this.service.displayName + '-' + Characteristic.RotationSpeed.UUID;
        callback(null, this.hasValidCache() && this.cachedState.has(key)
          ? this.getCachedState(key)
          : this.defaultFanSpeed);
      })
      .on('set', (value, callback) => {
        const amount = amountFromFanSpeed(value, this.deviceType);
        const key = this.service.displayName + '-' + Characteristic.RotationSpeed.UUID;
        this.setCachedState(key, value);
        this.log.info(`Portion set to ${value}% → ${amount}g`);
        callback();
      });
  }

  normalAsync(name, hbValue, service = null) {
    const target = service ? service : this.service;
    const key = target.displayName + '-' + name.UUID;
    this.setCachedState(key, hbValue);
    if (this.isRefresh) {
      target.getCharacteristic(name).updateValue(hbValue);
    } else {
      this.getAccessoryCharacteristic(name, target);
    }
  }

  eventAsync(name, hbValue, service = null) {
    const target = service ? service : this.service;
    const key = target.displayName + '-' + name.UUID;
    this.setCachedState(key, hbValue);
    if (this.isRefresh) {
      target.getCharacteristic(name).updateValue(hbValue);
    } else {
      this.getAccessoryCharacteristic(name, target);
    }
  }

  getAccessoryCharacteristic(name, service = null) {
    const target = service ? service : this.service;
    const key = target.displayName + '-' + name.UUID;
    const characteristic = target.getCharacteristic(name);

    characteristic.removeAllListeners('get');
    characteristic.removeAllListeners('set');

    characteristic
      .on('get', (callback) => {
        if (this.hasValidCache() && this.cachedState.has(key)) {
          callback(null, this.getCachedState(key));
        } else {
          callback(null, false);
        }
      })
      .on('set', async (value, callback) => {
        if (name === Characteristic.On && !value) {
          this.setCachedState(key, false);
          callback();
          return;
        }

        const command = this.getSendParam(name, value);
        if (!command) {
          callback();
          return;
        }

        this.platform.petkitOpenApi.sendCommand(command).then(async () => {
          this.setCachedState(key, false);
          target.getCharacteristic(Characteristic.On).updateValue(false);
          try {
            const device = await this.refreshDevice();
            this.updateState(device);
          } catch (e) {
            this.log.error(`Refresh after feed failed: ${e}`);
          }
          callback();
        }).catch((error) => {
          this.log.error(`[SET][${this.homebridgeAccessory.displayName}] Characteristic Error: ${error}`);
          this.setCachedState(key, false);
          target.getCharacteristic(Characteristic.On).updateValue(false);
          this.invalidateCache();
          callback(error);
        });
      });
  }

  async refreshDevice() {
    await this.platform.petkitOpenApi.ensureSession();
    return this.platform.petkitOpenApi.getDeviceDetail(this.deviceType, this.deviceId);
  }

  getSendParam(name) {
    if (name !== Characteristic.On) {
      return null;
    }

    const speed = this.service.getCharacteristic(Characteristic.RotationSpeed).value;
    const amount = amountFromFanSpeed(speed, this.deviceType);
    const date = new Date();
    const day = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('');

    this.log.info(`Dispensing ${amount}g (${speed}% fan) from ${this.deviceConfig.name}`);

    return {
      path: '/' + this.deviceType.toLowerCase() + '/saveDailyFeed',
      params: {
        amount,
        day,
        deviceId: this.deviceId,
        time: -1,
      },
    };
  }

  updateState(data) {
    if (data && data.state) {
      this.refreshAccessoryServiceIfNeed(data.state, true);
    }
  }
}

module.exports = FeederAccessory;
