let RedisKeys = require('../Redis/RedisKeys'),
    promise = require('bluebird'),
    StaticFunctions = require('../utilities/staticFunctions');

class PageServices{
    static getKeyValuesUserPairArray(Pages){
        return new promise((resolve, reject) => {
            let redisKeysValues = {};
            Pages.find({}).toArray((err, PagesList) => {
                if(err){
                    console.error(colors.red(err.stack));
                    reject(err);
                }
                PagesList.forEach((Page) => {
                    let PageId = Page.PageId;
                    redisKeysValues[RedisKeys.getPageDetailsRedisKeys(PageId)] = JSON.stringify(Page);
                });
            });
            resolve(redisKeysValues);
        });
    }
}

module.exports = PageServices;
