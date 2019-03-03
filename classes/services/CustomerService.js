const RedisKeys = require('../Redis/RedisKeys');
const RedisUtils = require('../Redis/RedisUtils');
const promise = require('bluebird');
const config = require('config');
const StaticFunctions = require('../utilities/staticFunctions');

class CustomerServices{
    static getKeyValuesUserPairArray(Customers){
        return new promise((resolve, reject) => {
            let redisKeysValues = {};
            Customers.find({}).toArray((err, CustomersList) => {
                if(err){
                    console.error(colors.red(err.stack));
                    reject(err);
                }
                CustomersList.forEach((Customer) => {
                    let CustomerId = Customer.email;
                    redisKeysValues[RedisKeys.getCustomerDetailsRedisKeys(CustomerId)] = JSON.stringify(Customer);
                });
            });
            resolve(redisKeysValues);
        });
    }

    static async getTopCustomer(){
        // should change logic when stable
        let topNCustomers = config.get('customers.topNCustomers');
        let customers = await RedisUtils.getAllValueFromHash(RedisKeys.getCustomerRedisKeys());
        let result = [];
        for(let customer in customers){
            result.push(JSON.parse(customers[customer]));
        }
        return result;
    }
}

module.exports = CustomerServices;
