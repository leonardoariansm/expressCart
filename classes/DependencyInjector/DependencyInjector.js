const intravenous = require('intravenous');
let container = intravenous.create(); //default onDispose method use
let redisUtils = require('../Redis/RedisUtils'),
    mangoUtils = require('../utilities/MangoUtils'),
    Constants = require ('../utilities/Constants');

class DependencyInjector {

    static getContainer(env) {
        container.register("RedisUtils", redisUtils, "singleton");
        container.register("MangoUtils", mangoUtils, "singleton");
        container.register("Constants", Constants, 'singleton');
        switch(env) {
            case "beta":
                break;
            case "live":
                break
        }
        return container;
    }
}

module.exports = DependencyInjector;
