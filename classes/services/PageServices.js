let RedisKeys = require('../Redis/RedisKeys');
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
        if(this.staticFunctions.isEmpty(page)){
            throw Error(this.enums.INVALID_PAGE);
        }
        page = isNaN(parseInt(page)) ? 0 : parseInt(page);
        let skipProduct = Math.max(page, 0) * config.get('products.productsPerPage');
        return await this.productService.getLatestAddedProduct(req, res, skipProduct, isPublicRoute);
    }

    static async getAllPages(){

    }
}

module.exports = {
    dependencies: PageServices.injectStaticDependencies(),
    PageServices: PageServices
};
