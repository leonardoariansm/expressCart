const common = require('../../lib/common');
const colors = require('colors');
const promise = require('bluebird');
const StaticFunctions = require('../utilities/staticFunctions');
const RedisUtils = require('../Redis/RedisUtils');
const RedisKeys = require('../Redis/RedisKeys');
const Enums = require('../models/Enums');
const MangoUtils = require('../utilities/MangoUtils');

class ProductDataStores{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
        this.redisUtils = RedisUtils;
        this.redisKeys = RedisKeys;
        this.mangoUtils = MangoUtils;
        this.enums = Enums;
    }

    static async getProductByProductID(productId){
        try{
            let products = await this.getProductByProductIDs([productId]);
            return products[0];
        }catch(e){
            console.log(`Error: getProductByProductID fetching: ${e.message}`);
            throw e;
        }
    }

    static async getProductByProductIDs(productIds){
        try{
            if(this.staticFunctions.isEmpty(productIds)){
                throw Error(this.enums.PRODUCT_ID_INVALID);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let productId of productIds){
                this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            }
            let products = await this.redisUtils.executeQueuedCommands(multi);
            return products;
        }catch(e){
            console.log(`Error: getProductByProductIDs fetching: ${e.message}`);
            throw e;
        }
    }

    static async getProductByProductPermalink(productPermalink){
        try{
            let productId = await this.getProductIdByProductPermalink(productPermalink);
            return await this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId));
        }catch(e){
            console.log(`Error: getProductByProductPermalink function: ${e.message}`);
            throw e;
        }
    }

    static async getProductIdByProductPermalink(productPermalink){
        try{
            if(this.staticFunctions.isEmpty(productPermalink)){
                throw Error(this.enums.PRODUCT_PERMALINK_EMPTY);
            }
            let productId = await this.redisUtils.get(this.redisKeys.getProductPermaLinkRediskey(productPermalink));
            return productId;
        }catch(e){
            console.log(`Error: getProductIdByProductPermalink function: ${e.message}`);
            throw e;
        }
    }

    static async getProductScore(productId){
        try{
            if(this.staticFunctions.isEmpty(productId))return null;
            return await this.redisUtils.getSortedSetScoreByMember(this.redisKeys.getProductRedisKey(), productId);
        }catch(e){
            console.log(`Error: getProductScore function: ${e.message}`);
            throw e;
        }
    }

    static async getProductProperty(productId, productProperty){
        try{
            if(this.staticFunctions.isEmpty(productId))return null;
            return await this.redisUtils.getValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), productProperty);
        }catch(e){
            console.log(`Error: getProductProperty function: ${e.message}`);
            throw e;
        }
    }

    static async setProductProperty (productId, productProperty){
        try{
            if(this.staticFunctions.isEmpty(productId)){
                throw this.enums.PRODUCT_ID_INVALID;
            }
            let propertyName = Object.keys(productProperty)[0];
            let propertyValue = productProperty[propertyName];
            await promise.all([
                this.redisUtils.setValueInHash(this.redisKeys.getProductDetailsRedisKey(productId), propertyName, propertyValue),
                this.mangoUtils.updateDocument({productId: productId}, productProperty, this.enums.productCollectionName)
            ]);
        }catch(e){
            console.log(`Error: setProductProperty function: ${e.message}`);
            throw e;
        }
    }

    static async deleteProduct(req, res, productId, product){
        try{
            let tasks = [];
            let userId = req.session && req.session.user && req.session.user.userId;
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.removeToSet(this.redisKeys.getCategoryProductMappingKey(product.productCategory), productId, multi);
            this.redisUtils.removeToSet(this.redisKeys.getUserToUserProductsMapping(userId), productId, multi);
            this.redisUtils.delete(this.redisKeys.getProductPermaLinkRediskey(product.productPermalink), multi);
            this.redisUtils.delete(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            this.redisUtils.removeToSortedSet(this.redisKeys.getProductRedisKey(), productId, multi);
            tasks.push(this.mangoUtils.deleteDocument({productId: productId}, this.enums.productCollectionName));
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            await promise.all(tasks);
        }catch(e){
            console.log(`Error deleteProduct function: ${e.message}`);
            throw e;
        }
    }

    static async updateProductPublishedState(productId, publishedState){
        try{
            if(this.staticFunctions.isEmpty(productId) || this.staticFunctions.isEmpty(publishedState)){
                throw Error('Error: Empty productId or publishedState');
            }
            await this.setProductProperty(productId, {'productPublished': publishedState});
        }catch(e){
            console.log(`Error: updateProductPublishedState function: ${e.message}`);
            throw e;
        }
    }

    static async setProductDetails(productId, productDetails, userId){
        try{
            let tasks = [];
            let currentTimeInMs = Date.now();
            if(this.staticFunctions.isEmpty(productId)){
                throw Error(this.enums.PRODUCT_ID_INVALID);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            if(this.staticFunctions.isNotEmpty(userId)){
                this.redisUtils.addToSet(this.redisKeys.getUserToUserProductsMapping(userId), productId, multi);
            }
            this.redisUtils.addToSet(this.redisKeys.getCategoryProductMappingKey(productDetails.productCategory), productId, multi);
            this.redisUtils.set(this.redisKeys.getProductPermaLinkRediskey(productDetails.productPermalink), productId, -1, multi);
            this.redisUtils.setMultipleValuesInHash(this.redisKeys.getProductDetailsRedisKey(productId), productDetails, multi);
            this.redisUtils.setValueInSortedSet(this.redisKeys.getProductRedisKey(), currentTimeInMs, productId, multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.updateDocument({productId: productId}, productDetails, this.enums.productCollectionName));
            await promise.all(tasks);
        }catch(e){
            console.log(`Error: setProductDetails function: ${e.message}`);
            throw e;
        }
    }

    static async getLatestAddedProduct(skipProduct, isPublicRoute, userId, numOfProducts, isAdmin){
        try{
            let userIdToProductMappingKey = this.redisKeys.getUserToUserProductsMapping(userId);
            let currentTimeInMs = Date.now();
            let productIds = await this.redisUtils.getSortedSetRangeByScoreReverse(this.redisKeys.getProductRedisKey(), currentTimeInMs, null, [skipProduct, numOfProducts]);
            if(!isPublicRoute && [false, 'false'].includes(isAdmin)){
                let tempProductFilterKey = 'tmpUserWiseProdFilterKey';
                let multi = this.redisUtils.queueSuccessiveCommands();
                this.redisUtils.addToSet(tempProductFilterKey, productIds, multi);
                this.redisUtils.expireKey(tempProductFilterKey, 300, multi);
                await this.redisUtils.executeQueuedCommands(multi);
                productIds = await this.redisUtils.setInter([tempProductFilterKey, userIdToProductMappingKey]);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let productId of productIds){
                this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            }
            return await this.redisUtils.executeQueuedCommands(multi);
        }catch(err){
            console.log(`Error getLatestAddedProduct function: ${err.message}`);
            throw err;
        }
    }

    static async getCategoryProductIds(category){
        try{
            if(this.staticFunctions.isEmpty(category))return[];
            return await this.redisUtils.getAllSetMembers(this.redisKeys.getCategoryProductMappingKey(category));
        }catch(err){
            console.log(`Error getCategoryProductIds function: ${err.message}`);
            throw err;
        }
    }
}

module.exports = {
    dependencies: ProductDataStores.injectStaticDependencies(),
    ProductDataStores: ProductDataStores
};
