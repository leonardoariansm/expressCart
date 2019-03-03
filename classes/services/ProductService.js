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
const UrlService = require('./UrlService');
const ProductRequestProcessor = require('../RequestProcessor/ProductRequestProcessor');

class ProductService{
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
        return LunrFullTextSearching.creatLunrIndexing(fieldsBoostWise, productsDocument);
    }

    static async getLatestAddedProduct(){
        try{
            let productsPerPage = config.get('products.productsPerPage');
            let productIds = await RedisUtils.getAllSetMembers(RedisKeys.getProductRedisKey());
            let topProducts = [];
            let multi = RedisUtils.queueSuccessiveCommands();
            for(let productId of productIds){
                RedisUtils.getAllValueFromHash(RedisKeys.getProductDetailsRedisKey(productId), multi);
            }
            let result = await RedisUtils.executeQueuedCommands(multi);
            return result;
        }catch(err){
            console.log('Error in getting orderDetails');
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async insertProduct(req, res){
        try{
            let product = ProductRequestProcessor.getRawRequestProduct(req, res, true);
            let productId = product.productId;
            let tasks = [];
            let multi = RedisUtils.queueSuccessiveCommands();
            let isProductExist = await RedisUtils.isSetMember(RedisKeys.getProductRedisKey(), productId);
            if(StaticFunctions.isEmpty(isProductExist) || !isProductExist){
                RedisUtils.addToSet(RedisKeys.getProductRedisKey(), [productId], multi);
                RedisUtils.setMultipleValuesInHash(RedisKeys.getProductDetailsRedisKey(productId), product, multi);
                RedisUtils.set(RedisKeys.getProductPermaLinkRediskey(product.productPermalink), productId);
                tasks.push(RedisUtils.executeQueuedCommands(multi));
                tasks.push(MangoUtils.insert(product, Enums.productCollectionName));
                // not push for lunr indexing
                let results = await promise.all(tasks);
                return{isProductExist: isProductExist, product: product, newProductId: productId};
            }
            return{isProductExist: isProductExist, results: product, newProductId: productId};
        }catch(err){
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async updateProduct(req, res){
        try{
            let rawRequestProduct = ProductRequestProcessor.getRawRequestProduct(req, res);
            let productId = rawRequestProduct.productId;
            if(StaticFunctions.isEmpty(productId)){
                throw Error(Enums.PRODUCT_ID_INVALID);
            }
            let multi = RedisUtils.queueSuccessiveCommands();
            RedisUtils.getAllValueFromHash(RedisKeys.getProductDetailsRedisKey(productId), multi);
            RedisUtils.isSetMember(RedisKeys.getProductRedisKey(), productId, multi);
            RedisUtils.get(RedisKeys.getProductPermaLinkRediskey(rawRequestProduct.productPermalink), multi);
            let currentProductDetailsResult = await RedisUtils.executeQueuedCommands(multi);
            let currentProductDetails = currentProductDetailsResult[0];
            let isProductExists = currentProductDetailsResult[1];
            let currentProductIdLinkWithProductPermaLink = currentProductDetailsResult[2];
            let isProductPermaLinkExist = (StaticFunctions.isNotEmpty(rawRequestProduct.productPermalink) && currentProductIdLinkWithProductPermaLink !== rawRequestProduct.productId);
            if(isProductExists || !isProductPermaLinkExist){
                let tasks = [];
                let updatedProduct = ProductService.getUpdatedProduct(rawRequestProduct, currentProductDetails);
                if(StaticFunctions.isNotEmpty(req.session.product) && req.session.product.productId !== productId){
                    tasks.push(RedisUtils.delete(RedisKeys.getProductDetailsRedisKey(req.session.product.productId)));
                    // Mango delete left;
                }
                tasks.push(RedisUtils.set(RedisKeys.getProductPermaLinkRediskey(updatedProduct.productPermalink), productId));
                tasks.push(RedisUtils.setMultipleValuesInHash(RedisKeys.getPageDetailsRedisKeys(productId), updatedProduct));
                tasks.push(MangoUtils.updateDocument(productId, updatedProduct, Enums.productCollectionName));
                let result = await promise.all(tasks);
                return updatedProduct;
            }
            let errMsg = (!isProductExists) ? Enums.PRODUCT_NOT_IN_REDIS : Enums.PRODUCT_PERMALINK_ALREADY_EXIST;
            throw Error(errMsg);
        }catch(err){
            req.session.product = Product.getProduct(ProductRequestProcessor.getRawRequestProduct(req, res), req.session.product);
            console.log(colors.red(err.stack));
            throw err;
        }
    }

    static async deleteProduct(req, res){
        let tasks = [];
        let productId = req.params.id || (req.session.product && req.session.product.productId);
        tasks.push(MangoUtils.deleteDocument(productId, Enums.productCollectionName));
        tasks.push(RedisUtils.getAllValueFromHash(RedisKeys.getProductDetailsRedisKey(productId)));
        let result = await promise.all(tasks);
        let product = result[1];
        let multi = RedisUtils.queueSuccessiveCommands();
        RedisUtils.delete(RedisKeys.getProductPermaLinkRediskey(productId), multi);
        RedisUtils.delete(RedisKeys.getProductDetailsRedisKey(productId), multi);
        RedisUtils.removeToSet(RedisKeys.getProductRedisKey(), multi);
        return RedisUtils.executeQueuedCommands(multi);
    }

    static getUpdatedProduct(rawRequestProduct, currentProduct){
        return Product.getProduct(rawRequestProduct, currentProduct);
    }

    static validateProductId(req, res, next){
        let productId = req.params.id || (req.session.product && req.session.product.productId);
        if(StaticFunctions.isEmpty(productId)){
            res.redirect(UrlService.getUrlToAllProducts());
        }else{
            next();
        }
    }
}

module.exports = ProductService;
