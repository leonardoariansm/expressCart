const RedisKeys = require('../Redis/RedisKeys');
const RedisUtils = require('../Redis/RedisUtils');
const promise = require('bluebird');
const config = require('config');
const StaticFunctions = require('../utilities/staticFunctions');

class OrderServices{
    // logic should be checked
    static getKeyValuesUserPairArray(orders){
        return new promise((resolve, reject) => {
            let redisKeysValues = {};
            orders.find({}).toArray((err, orderList) => {
                if(err){
                    console.error(colors.red(err.stack));
                    reject(err);
                }
                orderList.forEach((order) => {
                    let orderId = order.orderId;
                    redisKeysValues[RedisKeys.getOrderDetailsRedisKeys(orderId)] = JSON.stringify(order);
                });
            });
            resolve(redisKeysValues);
        });
    }

    static getLatestOrders(){
        try{
            let initialScoreOfOrder = config.get('orders.initialScore');
            let topNOrderCount = config.get('orders.topNOrderCount');
            return RedisUtils.getSortedSetRangeAndScoreByScore(RedisKeys.getOrderRedisKeys(), initialScoreOfOrder, topNOrderCount);
        }catch(err){
            console.log('Error in getting orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }
}

module.exports = OrderServices;
