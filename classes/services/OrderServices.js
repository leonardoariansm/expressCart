const promise = require('bluebird');
const config = require('config');
const Enums = require('../models/Enums');
const colors = require('colors');
const constants = require('../utilities/Constants');
const RedisKeys = require('../Redis/RedisKeys');
const RedisUtils = require('../Redis/RedisUtils');
const MangoUtils = require('../utilities/MangoUtils');
const{ProductService} = require('./ProductService');
const{ProductDataStores} = require('../DataStores/ProductDataStores');
const StaticFunctions = require('../utilities/staticFunctions');
const{OrderIndexingService} = require('./Indexing/OrderIndexingService');
const{OrderRequestProcessor} = require('../RequestProcessor/OrderRequestProcessor');

class OrderServices{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
        this.redisUtils = RedisUtils;
        this.redisKeys = RedisKeys;
        this.mangoUtils = MangoUtils;
        this.enums = Enums;
        this.orderIndexingService = OrderIndexingService;
        this.orderRequestProcessor = OrderRequestProcessor;
        this.productService = ProductService;
        this.productDataStores = ProductDataStores;
    }

    static async getOrdersByOrderIds(orderIds){
        if(this.staticFunctions.isEmpty(orderIds))return[];
        let multi = this.redisUtils.queueSuccessiveCommands();
        for(let orderId of orderIds){
            this.redisUtils.getAllValueFromHash(this.redisKeys.getOrderDetailsRedisKeys(orderId), multi);
            this.redisUtils.getSortedSetRangeScoreByScoreReverse(this.redisKeys.getOrderToOrderProductMappingKey(orderId), constants.PER_ORDER_PER_PRODUCT_MAX_QUANTITY, 1, [0, constants.PER_ORDER_MAX_PRODUCTS], multi);
        }
        let result = await this.redisUtils.executeQueuedCommands(multi);
        let orders = [];
        for(let k = 0; k < result.length; k += 2){
            let order = result[k];
            order.orderProducts = result[k + 1];
            orders.push(order);
        }
        return orders;
    }

    static async getLatestOrders(){
        try{
            let topNOrderCount = config.get('orders.topNOrderCount');
            let currentTimeInMs = Date.now();
            let orderIds = await this.redisUtils.getSortedSetRangeByScoreReverse(this.redisKeys.getOrderRedisKeys(), currentTimeInMs, null, [0, topNOrderCount]);
            return await this.getOrdersByOrderIds(orderIds);
        }catch(err){
            console.log('Error in getting orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async getOrderByOrderStatus(orderStatus){
        try{
            let topNOrderCount = config.get('orders.topNOrderCount');
            let orderStatusSetRedisKey = this.redisKeys.getOrderByOrderStatusRedisKey(orderStatus);
            let currentTimeInMs = Date.now();
            let orderIds = await this.redisUtils.getSortedSetRangeByScoreReverse(orderStatusSetRedisKey, currentTimeInMs, null, [0, topNOrderCount]);
            return await this.getOrdersByOrderIds(orderIds);
        }catch(err){
            console.log('Error in getting orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async getOrderDetails(orderId){
        try{
            let order = (await this.getOrdersByOrderIds([orderId]))[0];
            let productsQuantity = [];
            let productIds = [];
            for(let k = 0; k < order.orderProducts.length; k += 2){
                productIds.push(order.orderProducts[k]);
                productsQuantity.push(order.orderProducts[k + 1]);
            }
            order.orderProducts = await this.productDataStores.getProductByProductIDs(productIds);
            for(let key in productsQuantity){
                order.orderProducts[key].title = order.orderProducts[key].productTitle;
                order.orderProducts[key].totalItemPrice = parseFloat(productsQuantity[key]) * order.orderProducts[key].productPrice;
                order.orderProducts[key].quantity = productsQuantity[key];
            }
            return order;
        }catch(err){
            console.log('Error: getOrderDetails fetching');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async deleteOrder(orderId){
        try{
            let tasks = [];
            let order = (await this.getOrdersByOrderIds([orderId]))[0];
            await this.orderIndexingService.deleteIndexing(orderId);
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.removeToSortedSet(this.redisKeys.getOrderByOrderStatusRedisKey(order.orderStatus, orderId, multi));
            this.redisUtils.delete(this.redisKeys.getOrderDetailsRedisKeys(orderId), multi);
            this.redisUtils.removeToSortedSet(this.redisKeys.getOrderRedisKeys(), orderId, multi);
            this.redisUtils.delete(this.redisKeys.getOrderToOrderProductMappingKey(orderId), multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.orderIndexingService.deleteIndexing(orderId, order));
            tasks.push(this.mangoUtils.deleteDocument(orderId, this.enums.orderCollectionName));
            await promise.all(tasks);
        }catch(err){
            console.log('Error in Deleting orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async updateOrderStatus(orderId, status){
        try{
            let currentTimeInMs = Date.now();
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            let orderStatus = await this.redisUtils.getValueFromHash(this.redisKeys.getOrderDetailsRedisKeys(orderId), 'orderStatus');
            if(orderStatus === status)return false;
            this.redisUtils.removeToSortedSet(this.redisKeys.getOrderByOrderStatusRedisKey(orderStatus), orderId, multi);
            this.redisUtils.setValueInSortedSet(this.redisKeys.getOrderByOrderStatusRedisKey(status), currentTimeInMs, orderId, multi);
            this.redisUtils.setValueInHash(this.redisKeys.getOrderDetailsRedisKeys(orderId), 'orderStatus', status, multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.updateDocument({orderId: orderId}, {orderStatus: status}, this.enums.orderCollectionName));
            await promise.all(tasks);
            return true;
        }catch(err){
            console.log('Error in Updating orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async insertOrder(req, res, order, orderProducts){
        let tasks = [];
        let compressProducts = [];
        order = this.orderRequestProcessor.getRawRequestOrder(req, res, order);
        // write validator also
        let orderId = order.orderId;
        let multi = this.redisUtils.queueSuccessiveCommands();
        this.redisUtils.setMultipleValuesInHash(this.redisKeys.getOrderDetailsRedisKeys(orderId), order, multi);
        this.redisUtils.setValueInSortedSet(this.redisKeys.getOrderByOrderStatusRedisKey(order.orderStatus), Date.now(), orderId, multi);
        this.redisUtils.setValueInSortedSet(this.redisKeys.getOrderRedisKeys(), Date.now(), orderId, multi);
        for(let orderProduct of orderProducts){
            let product = {};
            product.score = orderProduct.quantity;
            product.value = orderProduct.productId;
            compressProducts.push(product);
        }
        this.redisUtils.setMultipleValuesInSortedSet(this.redisKeys.getOrderToOrderProductMappingKey(orderId), compressProducts, multi);
        tasks.push(this.orderIndexingService.indexOrder(order, multi));
        tasks.push(this.redisUtils.executeQueuedCommands(multi));
        tasks.push(this.mangoUtils.insert(order, this.enums.orderCollectionName));
        await promise.all(tasks);
        return order;
    }
}

module.exports = {
    dependencies: OrderServices.injectStaticDependencies(),
    OrderServices: OrderServices
};
