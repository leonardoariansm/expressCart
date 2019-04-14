let RedisKeys = require('../Redis/RedisKeys');
let promise = require('bluebird');
let Enums = require('../models/Enums');
let config = require('config');
let{ProductService} = require('./ProductService');
let StaticFunctions = require('../utilities/staticFunctions');

class PageServices{
    static injectStaticDependencies (){
        this.redisKeys = RedisKeys;
        this.staticFunctions = StaticFunctions;
        this.enums = Enums;
        this.productService = ProductService;
    }

    static async getPage (req, res, page, isPublicRoute){
        if(this.staticFunctions.isEmpty(page) || typeof page !== 'number'){
            throw Error(this.enums.INVALID_PAGE);
        }
        let skipProduct = Math.max(page - 1, 0) * config.get('products.productsPerPage');
        let products = await this.productService.getLatestAddedProduct(req, res, skipProduct, isPublicRoute);
        return products;
    }

    static async getAllPages(){

    }
}

module.exports = {
    dependencies: PageServices.injectStaticDependencies(),
    PageServices: PageServices
};
