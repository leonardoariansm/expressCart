const promise = require('bluebird');
const config = require('config');
const Redis = require('ioredis');
const colors = require('colors');
const StaticFunctions = require('../utilities/staticFunctions');
let client = null;

class RedisUtils{
    static connectToRedis(){
        let host = config.get('redis.host');
        let port = config.get('redis.port');
        return new promise((resolve, reject) => {
            if(client !== null){
                resolve(client);
            }
            client = null;
            let options = {};
            options.retryStrategy = () => {
                setTimeout(() => {
                    RedisUtils.connectToRedis();
                }, 1);
            };
            options.port = port;
            options.host = host;
            client = new Redis(options);
            client.on('connect', () => {
                console.log('Redis Client' + ' connected on port: ' + client.options.port);
                resolve(client);
            });
            client.on('end', () => {
                client = null;
                reject(client);
            });
            client.on('error', (err) => {
                client = null;
                reject(client);
            });
        });
    }

    static async getRedisInstance(){
        if(StaticFunctions.isNotEmpty(client))return client;
        let redisInstance = await RedisUtils.connectToRedis();
        return redisInstance;
    }

    static queueSuccessiveCommands(){
        return client.pipeline();
    }

    static setMultipleValuesInHash(key, hashKeysValues, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.hmset(key, hashKeysValues)
                    .then(result => {
                        resolve(result);
                    })
                    .catch((err) => {
                        console.error(colors.red('Error in setting mulitple Values in hash'));
                        reject(err);
                    });
            });
        }
        return multi.hmset(key, hashKeysValues);
    }

    static getMultipleValuesFromHash(key, hashKeys, multi){
        if(typeof multi === 'undefined' || multi == null){
            return new promise((resolve, reject) => {
                client.hmget(key, hashKeys)
                    .then((values) => {
                        resolve(values);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.hmget(key, hashKeys);
    }

    static getAllValueFromHash (key, multi){
        if(typeof multi === 'undefined' || multi == null){
            return new promise((resolve, reject) => {
                client.hgetall(key)
                    .then((values) => {
                        resolve(values);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.hgetall(key);
    }

    static executeQueuedCommands(multi){
        return new promise((resolve, reject) => {
            multi.exec()
                .then((results) => {
                    let retResult = [];
                    for(let val of results){
                        retResult.push(val[1]);
                    }
                    resolve(retResult);
                })
                .catch((err) => {
                    console.log('Error in executeQueuedCommands redis');
                    reject(err);
                });
        });
    }

    static getKeyCount(key, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.get(key)
                    .then((value) => {
                        if(StaticFunctions.isNotEmpty(value) && value !== 'none'){
                            resolve(+value);
                        }
                        return resolve(0);
                    })
                    .catch((err) => {
                        console.error(colors.red('Error in setting value in redisClient'));
                        reject(err);
                    });
            });
        }
        return multi.get(key);
    }

    static setKeyCount(key, count, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi == null){
            return client.set(key, count)
                .catch((err) => {
                    console.error(colors.red('Error in setting value in redisClient'));
                });
        }
        return multi.set(key, count);
    }

    static setValueInHash(key, hashKey, value, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.hset(key, hashKey, value)
                .catch((err) => {
                    console.log(colors.red('Error in setting value in redisClient'));
                });
        }
        return multi.hset(key, hashKey, value);
    }

    static exists(key, hashKey, multi){
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.hexists(key, hashKey)
                    .then((value) => {
                        if(StaticFunctions.checkIsSetOrNot(value)){
                            resolve(true);
                        }else resolve(false);
                    })
                    .catch((err) => {
                        console.error(colors.red('Error in setting value in redisClient'));
                        reject(err);
                    });
            });
        }
        return multi.hexists(key, hashKey);
    }

    static incrementKey (key, multi){
        if(typeof multi === 'undefined' || multi == null){
            return client.incr(key)
                .catch((err) => {
                    console.error(colors.red('Error in increment' + err));
                });
        }
        return client.incr(key);
    }

    static getValueFromHash(keyName, hashKey, multi){
        if(typeof multi === 'undefined' || multi == null){
            return new promise((resolve, reject) => {
                client.hget(keyName, hashKey)
                    .then((value) => {
                        resolve(value);
                    })
                    .catch((err) => {
                       reject(err);
                    });
            });
        }
        return multi.hget(keyName, hashKey);
    }

    static setValueInSortedSet(key, value, score, multi){
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
               client.zadd(key, score, value)
                   .then((value) => {
                       resolve(value);
                   })
                   .catch((err) => {
                       reject(err);
                   });
            });
        }
        return multi.zadd(key, score, value);
    }

    static setMultipleValuesInSortedSet(key, valueWithScores, multi){
        let that = this;
        multi = (typeof multi === 'undefined' || multi === null) ? that.queueSuccessiveCommands() : multi;
        for(let key in valueWithScores){
            let valueWithScore = valueWithScores[key];
            that.setValueInSortedSet(key, valueWithScore.value, valueWithScores.score, multi);
        }
        return new promise((resolve, reject) => {
            that.executeQueuedCommands(multi)
                .then((result) => {
                    resolve(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    static createArgsForSortedSetRangeByScore(key, maxScore, minScore, limit){
        if(!minScore || minScore === null){
            minScore = '-inf';
        }
        if(!maxScore || maxScore === null){
            maxScore = '+inf';
        }
        let allArgs = [key, minScore, maxScore];
        if(limit && limit.length >= 2){
            allArgs.push('limit');
            allArgs.push(limit[0]);
            allArgs.push(limit[1]);
        }
        return allArgs;
    }

    static getSortedSetRangeAndScoreByScore(key, maxScore, minScore, limit, multi){
        let that = this;
        let allArgs = that.createArgsForSortedSetRangeByScore(key, maxScore, minScore, limit);
        allArgs.push('WITHSCORES');
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.zrangebyscore(allArgs)
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.zrangebyscore(allArgs);
    }

    static addToSet(key, values, multi){
        let that = this;
        let allArgs = [key];
        allArgs = allArgs.concat(values);
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.sadd.apply(client, allArgs)
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.sadd.apply(multi, allArgs);
    }

    static isSetMember(key, value, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.sismember(key, value)
                    .then((isMember) => {
                        if(StaticFunctions.checkIsSetOrNot(isMember)){
                            resolve(true);
                        }else resolve(false);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.sismember(key, value);
    }

    static getAllSetMembers(key, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.smembers(key)
                    .then((members) => {
                        resolve(members);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.smembers(key);
    }

    static removeToSet(key, member, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.srem(key, member)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.srem(key);
    }

    static set(key, value, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.set(key, value)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.set(key);
    }

    static get(key, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.get(key)
                    .then((value) => {
                        resolve(value);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.get(key);
    }

    static delete(key, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.del(key)
                    .catch((err) => {
                        console.log(colors.red(err.stack));
                    });
            });
        }
        return multi.del(key);
    }
}

module.exports = RedisUtils;
