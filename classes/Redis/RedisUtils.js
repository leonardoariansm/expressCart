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
                        console.error(colors.red('Error in setting multiple Values in hash'));
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
        return multi.incr(key);
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

    static getSortedSetScoreByMember(key, member, multi){
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.zscore(key, member)
                    .then((value) => {
                        resolve(value);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.zscore(key, member);
    }

    static setValueInSortedSet(key, score, value, multi){
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

    static setMultipleValuesInSortedSet(setkey, valueWithScores, multi){
        let that = this;
        let newMulti = (typeof multi === 'undefined' || multi === null) ? that.queueSuccessiveCommands() : multi;
        for(let key in valueWithScores){
            let valueWithScore = valueWithScores[key];
            that.setValueInSortedSet(setkey, valueWithScore.score, valueWithScore.value, newMulti);
        }
        if((typeof multi === 'undefined' || multi === null)){
            that.executeQueuedCommands(newMulti);
        }
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

    static getSortedSetRangeByScoreReverse(key, maxScore, minScore, limit, multi){
        let that = this;
        if(!minScore || minScore == null){ minScore = '-inf'; }

        if(!maxScore || maxScore == null){ maxScore = '+inf'; }

        let allArgs = [key, maxScore, minScore];
        if(limit && limit.length >= 2){
            allArgs.push('limit');
            allArgs.push(limit[0]);
            allArgs.push(limit[1]);
        }
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.zrevrangebyscore(allArgs)
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.zrevrangebyscore(allArgs);
    }

    static getSortedSetRangeScoreByScoreReverse(key, maxScore, minScore, limit, multi){
        let that = this;
        let allArgs = this.createArgsForSortedSetRangeByScore(key, maxScore, minScore, limit);
        [allArgs[1], allArgs[2]] = [allArgs[2], allArgs[1]];
        allArgs.push('WITHSCORES');
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.zrevrangebyscore(allArgs)
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.zrevrangebyscore(allArgs);
    }

    static removeToSortedSet(key, member, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.zrem(key, member)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.zrem(key, member);
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

    static getAllSortedSetMembers(key, minscore, maxscore, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.zrange(key, minscore, maxscore)
                    .then((members) => {
                        resolve(members);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.zrange(key, minscore, maxscore);
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

    static setUnionAndStore(toStoreKeyName, keys, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.sunionstore(toStoreKeyName, keys)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.sunionstore(toStoreKeyName, keys);
    }

    static setInterAndStore(toStoreKeyName, keys, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.sinterstore(toStoreKeyName, keys)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.sinterstore(toStoreKeyName, keys);
    }

    static setInter(keys, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.sinter(keys)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.sinter(keys);
    }

    static setDifferenceAndStore(toStoreKeyName, keys, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.sdiffstore(toStoreKeyName, keys)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.sdiffstore(toStoreKeyName, keys);
    }

    static getSetSize(key, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return new promise((resolve, reject) => {
                client.scard(key)
                    .then((size) => {
                        resolve(size);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return multi.scard(key);
    }

    static set (key, value, expiryTime, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return expiryTime === null || expiryTime === undefined || expiryTime === -1 ? client.set(key, value) : client.setex(key, expiryTime, value);
        }

        return expiryTime === -1 ? multi.set(key, value) : multi.setex(key, expiryTime, value);
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

    static expireKey(key, expiryTime, multi){
        let that = this;
        if(typeof multi === 'undefined' || multi === null){
            return client.expire(key, expiryTime)
                .catch((err) => {
                    console.log(colors.red(err.stack));
                });
        }
        return multi.expire(key, expiryTime);
    }
}

module.exports = RedisUtils;
