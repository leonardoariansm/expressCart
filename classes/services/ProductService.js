const promise = require('bluebird');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const url = require('url');
const crypto = require('crypto');
const config = require('config');
const MangoUtils = require('../utilities/MangoUtils');
const RedisUtils = require('../Redis/RedisUtils');
const RedisKeys = require('../Redis/RedisKeys');
const LunrFullTextSearching = require('./LunrFullTextSearching');
const StaticFunctions = require('../utilities/staticFunctions');
const Enums = require('../models/Enums');
const common = require('../../lib/common');
const Product = require('../models/Product');
const ProductUrls = require('../UrlService/ProductUrls');
const{ProductValidator} = require('./validator/ProductValidator');
const{ProductRequestProcessor} = require('../RequestProcessor/ProductRequestProcessor');
const{ProductIndexingService} = require('./Indexing/ProductIndexingService');

class ProductService{
    static injectStaticDependencies(){
        this.mangoUtils = MangoUtils;
        this.redisUtils = RedisUtils;
        this.redisKeys = RedisKeys;
        this.lunrFullTextSearching = LunrFullTextSearching;
        this.staticFunctions = StaticFunctions;
        this.enums = Enums;
        this.product = Product;
        this.productUrls = ProductUrls;
        this.productRequestProcessor = ProductRequestProcessor;
        this.productValidator = ProductValidator;
        this.productIndexingService = ProductIndexingService;
    }
    static async ProductLunrIndexing(products){
        let fieldsBoostWise = [];
        let productsDocument = [];
        fieldsBoostWise.push({name: 'productTitle', boost: 10});
        fieldsBoostWise.push({name: 'productTags', boost: 5});
        fieldsBoostWise.push({name: 'productDescription', boost: 1});
        await new promise((resolve, reject) => {
            products.find({}).toArray((err, productList) => {
                if(err){
                    console.log(colors.red(err.stack));
                    reject(false);
                }
                productList.forEach((product) => {
                    let doc = {
                        'productTitle': product.productTitle,
                        'productTags': product.productTags,
                        'productDescription': product.productDescription,
                        'id': product._id
                    };
                    productsDocument.push(doc);
                });
                resolve(productsDocument);
            });
        });
        return this.lunrFullTextSearching.creatLunrIndexing(fieldsBoostWise, productsDocument);
    }

    static async getProductByProductID(productId){
        try{
            if(this.staticFunctions.isEmpty(productId)){
                throw Error(this.enums.PRODUCT_ID_INVALID);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.getSortedSetScoreByMember(this.redisKeys.getProductRedisKey(), productId, multi);
            this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            let result = await this.redisUtils.executeQueuedCommands(multi);
            if(this.staticFunctions.isNotEmpty(result) && result.length > 1 && this.staticFunctions.isNotEmpty(result[0])){
                return result[1];
            }
            return null;
        }catch(e){
            console.log('Error: getProductByProductID fetching');
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
            console.log('Error: getProductByProductIDs fetching');
            throw e;
        }
    }

    static async getProductsByProductIDs(productIds){
        if(this.staticFunctions.isEmpty(productIds)){
            throw Error(this.enums.PRODUCT_ID_INVALID);
        }
        let multi = this.redisUtils.queueSuccessiveCommands();
        for(let productId of productIds){
            this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
        }
        let products = await this.redisUtils.executeQueuedCommands(multi);
        return products;
    }

    static async getProductByProductPermalink(productPermalink){
        if(this.staticFunctions.isEmpty(productPermalink)){
            throw Error(this.enums.PRODUCT_PERMALINK_EMPTY);
        }
        let productId = await this.redisUtils.get(this.redisKeys.getProductPermaLinkRediskey(productPermalink));
        let product = await this.getProductByProductID(productId);
        return product;
    }

    static async getLatestAddedProduct(req, res, skipProduct, isPublicRoute){
        try{
            let userIdToProductMappingKey = this.redisKeys.getUserToUserProductsMapping((req.session.user && req.session.user.userId));
            let isAdmin = (req.session.user && req.session.user.isAdmin);
            let productsPerPage = config.get('products.productsPerPage');
            skipProduct = this.staticFunctions.isNotEmpty(skipProduct) ? skipProduct : 0;
            let currentTimeInMs = Date.now();
            let productIds = await this.redisUtils.getSortedSetRangeByScoreReverse(this.redisKeys.getProductRedisKey(), currentTimeInMs, null, [skipProduct, productsPerPage]);
            if(!isPublicRoute && [false, 'false'].includes(isAdmin)){
                let tempProductFilterKey = 'tmpUserWiseProdFilterKey';
                await this.redisUtils.addToSet(tempProductFilterKey, productIds);
                productIds = await this.redisUtils.setInter([tempProductFilterKey, userIdToProductMappingKey]);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let productId of productIds){
                this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            }
            let result = await this.redisUtils.executeQueuedCommands(multi);
            return result;
        }catch(err){
            console.log('Error in getting orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async insertProduct(req, res){
        try{
            let userId = (req.session.user && req.session.user.userId);
            let product = this.productRequestProcessor.getRawRequestProduct(req, res, true);
            product.productId = this.getProductID(userId, product);
            let isValidProduct = await this.productValidator.isValidProduct(product);
            if(!this.staticFunctions.checkIsSetOrNot(isValidProduct)){
                throw Error(this.enums.INVALID_PRODUCT_DETAILS);
            }
            let productId = product.productId;
            let currentTimeInMs = Date.now();
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.get(this.redisKeys.getProductPermaLinkRediskey(product.productPermalink), multi);
            this.redisUtils.getSortedSetScoreByMember(this.redisKeys.getProductRedisKey(), productId, multi);
            let result = await this.redisUtils.executeQueuedCommands(multi);
            let isProductPermaLinkExist = !!result[0];
            let isProductExist = !!result[1];
            if(isProductPermaLinkExist){
                throw Error(this.enums.PRODUCT_PERMALINK_ALREADY_EXIST);
            }
            if(isProductExist){
                let currentProduct = await this.redisUtils.getMultipleValuesFromHash(this.redisKeys.getProductDetailsRedisKey(productId));
                currentProduct.productStock += product.productStock;
                tasks.push(this.redisUtils.setValueInHash(this.redisKeys.getProductDetailsRedisKey(productId)), 'productStock', currentProduct.productStock);
                tasks.push(this.mangoUtils.updateDocument({productId: productId}, currentProduct, this.enums.productCollectionName));
                await promise.all(tasks);
            }else{
                this.redisUtils.addToSet(this.redisKeys.getUserToUserProductsMapping(userId), productId, multi);
                this.redisUtils.set(this.redisKeys.getProductPermaLinkRediskey(product.productPermalink), productId, -1, multi);
                this.redisUtils.setValueInSortedSet(this.redisKeys.getProductRedisKey(), currentTimeInMs, productId, multi);
                this.redisUtils.setMultipleValuesInHash(this.redisKeys.getProductDetailsRedisKey(productId), product, multi);
                tasks.push(this.redisUtils.executeQueuedCommands(multi));
                tasks.push(this.mangoUtils.insert(product, this.enums.productCollectionName));
                tasks.push(this.productIndexingService.indexOrder(product));
                await promise.all(tasks);
            }
            return product;
        }catch(err){
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async updateProduct(req, res, productId, newProduct){
        try{
            let rawRequestProduct = ProductRequestProcessor.getRawRequestProduct(req, res);
            rawRequestProduct.productId = productId;
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            this.redisUtils.getSortedSetScoreByMember(this.redisKeys.getProductRedisKey(), productId, multi);
            this.redisUtils.get(this.redisKeys.getProductPermaLinkRediskey(rawRequestProduct.productPermalink), multi);
            let result = await this.redisUtils.executeQueuedCommands(multi);
            let productDetails = result[0];
            let isProductExists = !!result[1];
            let productIdLinkWithProductPermaLink = result[2];
            if(isProductExists){
                if(this.staticFunctions.isNotEmpty(productIdLinkWithProductPermaLink) && productIdLinkWithProductPermaLink !== productId){
                    throw Error(this.enums.PRODUCT_PERMALINK_ALREADY_EXIST);
                }else{
                    let tasks = [];
                    if(this.staticFunctions.isNotEmpty(newProduct)) rawRequestProduct = newProduct;
                    let updatedProduct = ProductService.getUpdatedProduct(rawRequestProduct, productDetails);
                    let isValidProduct = await this.productValidator.isValidProduct(updatedProduct);
                    if(!this.staticFunctions.checkIsSetOrNot(isValidProduct)){
                        throw Error(this.enums.INVALID_PRODUCT_DETAILS);
                    }
                    this.redisUtils.set(this.redisKeys.getProductPermaLinkRediskey(updatedProduct.productPermalink), productId, -1, multi);
                    this.redisUtils.setMultipleValuesInHash(this.redisKeys.getProductDetailsRedisKey(productId), updatedProduct, multi);
                    tasks.push(this.redisUtils.executeQueuedCommands(multi));
                    tasks.push(this.mangoUtils.updateDocument({productId: productId}, updatedProduct, this.enums.productCollectionName));
                    tasks.push(this.productIndexingService.updateProductIndexing(productDetails, updatedProduct));
                    let result = await promise.all(tasks);
                    return updatedProduct;
                }
            }else{
                throw Error(this.enums.PRODUCT_NOT_EXISTS);
            }
        }catch(err){
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async updateProductPublishedState(productId, publishedState){
        try{
            let tasks = [];
            if(this.staticFunctions.isEmpty(productId) || this.staticFunctions.isEmpty(publishedState)){
                throw Error('Error: Empty productId or publishedState');
            }
            tasks.push(this.redisUtils.setValueInHash(this.redisKeys.getProductDetailsRedisKey(productId), 'productPublished', publishedState));
            tasks.push(this.mangoUtils.updateDocument({productId: productId}, {productPublished: publishedState}, this.enums.productCollectionName));
            await promise.all(tasks);
        }catch(e){
            console.log('Error: updateProductPublishedState function');
            throw e;
        }
    }

    static async deleteProduct(req, res, productId){
        let tasks = [];
        let userId = (req.session.user && req.session.user.userId);
        let multi = this.redisUtils.queueSuccessiveCommands();
        this.redisUtils.removeToSet(this.redisKeys.getUserToUserProductsMapping(userId), productId, multi);
        this.redisUtils.delete(this.redisKeys.getProductPermaLinkRediskey(productId), multi);
        this.redisUtils.delete(this.redisKeys.getProductDetailsRedisKey(productId), multi);
        this.redisUtils.removeToSortedSet(this.redisKeys.getProductRedisKey(), productId, multi);
        tasks.push(this.mangoUtils.deleteDocument({productId: productId}, this.enums.productCollectionName));
        tasks.push(this.redisUtils.executeQueuedCommands(multi));
        await promise.all(tasks);
    }

    static getUpdatedProduct(rawRequestProduct, currentProduct){
        return Product.getProduct(rawRequestProduct, currentProduct);
    }

    static getProductID(userId, product){
        let objToGenerateProductID = this.staticFunctions.getCloneObject(product, ['productId', 'productStock', 'productAddedDate']);
        objToGenerateProductID.userId = userId;
        return crypto.createHash('md5').update(JSON.stringify(objToGenerateProductID)).digest('hex');
    }
}

module.exports = {
    dependencies: ProductService.injectStaticDependencies(),
    ProductService: ProductService
};
