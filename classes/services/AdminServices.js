const RedisUtils = require('../Redis/RedisUtils');
const RedisKeys = require('../Redis/RedisKeys');
const StaticFunctions = require('../utilities/staticFunctions');
const Enums = require('../models/Enums');

class AdminServices{
    static async validatePermaLink(req, res){
        let currentLinkedProductId = await RedisUtils.get(RedisKeys.getProductPermaLinkRediskey(req.body.permalink));
        let productId = req.session.product && req.session.product.productId;
        if(StaticFunctions.isNotEmpty(currentLinkedProductId) && currentLinkedProductId !== productId){
            return{status: 400, message: Enums.PRODUCT_PERMALINK_ALREADY_EXIST};
        }
        return{status: 200, message: Enums.PRODUCT_PERMALINK_SUCCESSFULLY_VALIDATED};
    }
}

module.exports = AdminServices;
