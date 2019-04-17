const colors = require('colors');
const promise = require('bluebird');
const RedisUtils = require('../../Redis/RedisUtils');
const RedisKeys = require('../../Redis/RedisKeys');
const MangoUtils = require('../../utilities/MangoUtils');
// const ProductServices = require('../ProductService');
// const UserServices = require('../UserServices');
// const OrderServices = require('../OrderServices');
// const PageServices = require('../PageServices');
// const CustomerServices = require('../CustomerService');
const StaticFunctions = require('../../utilities/staticFunctions');
const{ProductDataStores} = require('../../DataStores/ProductDataStores');

class IndexingService{
    static injectStaticDependencies(){
        this.redisKeys = RedisKeys;
        this.redisUtils = RedisUtils;
        this.mangoUtils = MangoUtils;
        this.staticFunctions = StaticFunctions;
        this.productDataStores = ProductDataStores;
    }

    static async runIndexing(){
        try{
            // let task = [];
            // task.push(UserServices.getKeyValuesUserPairArray(dbInstance.users));
            // task.push(OrderServices.getKeyValuesUserPairArray(dbInstance.orders));
            // task.push(PageServices.getKeyValuesUserPairArray(dbInstance.pages));
            // task.push(CustomerServices.getKeyValuesUserPairArray(dbInstance.customers));
            // task.push(ProductServices.ProductLunrIndexing(dbInstance.products));
            // let results = await promise.all(task);
            // let multi = await RedisUtils.queueSuccessiveCommands();
            // RedisUtils.setMultipleValuesInHash(RedisKeys.getUserRedisKeys(), results[0], multi);
            // RedisUtils.setMultipleValuesInHash(RedisKeys.getOrderRedisKeys(), results[1], multi);
            // RedisUtils.setMultipleValuesInHash(RedisKeys.getPageRedisKeys(), results[2], multi);
            // RedisUtils.setMultipleValuesInHash(RedisKeys.getCustomerRedisKeys(), results[3], multi);
            // RedisUtils.executeQueuedCommands(multi);
            // console.log(colors.cyan('- Product Lunr indexing complete'));
            // console.log(colors.cyan('- User Redis indexing complete'));
            // console.log(colors.cyan('- Order Redis indexing complete'));
            // console.log(colors.cyan('- Customer Redis indexing complete'));
            // console.log(colors.cyan('- Page Redis indexing complete'));
            // return results[4];
            return'';
        }catch(err){
            console.log(colors.red(err.stack));
            process.exit(1);
        }
    }
}

module.exports = {
    dependencies: IndexingService.injectStaticDependencies,
    IndexingService: IndexingService
};
