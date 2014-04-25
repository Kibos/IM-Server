/**
 * mongodb
 */

exports.mongodb = {
  // the defaulte mongodb
  mg1: {
    port: 27017,
    ip: "10.21.3.59"
  }
}

/**
 * the static host
 */
exports.sta = {
  // the plugpush server
  PPSH: {
    pp1: {
      ip: '10.21.3.66',
      port: '6379'
    }
  },
  redis: {

  }
};

/**
 *redis、node server
 */
exports.Server = {
  PNode: {},
  PRedis: {
    'pr1': {
      'ip': '10.21.3.66',
      'port': '6379'
    }
  },
  GRedis: {
    'gr1': {
      'ip': '10.21.3.66',
      'port': '6379'
    }
  },
  GSub: {},
  URedis: {}
};