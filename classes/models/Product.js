const common = require('../../lib/common');
const StaticFunctions = require('../utilities/staticFunctions');

class Product{

    static injectStaticDependencies() {
        this.staticFunctions = StaticFunctions;
        this.redisUtils
    }

    static getProduct(rawRequestProduct, currentProduct){
        let product = {
                productId: rawRequestProduct.productId,
                productPermalink: StaticFunctions.getNonEmptyValue([rawRequestProduct.productPermalink, currentProduct.productPermalink]),
                productTitle: StaticFunctions.getNonEmptyValue([rawRequestProduct.productTitle, currentProduct.productTitle]),
                productPrice: parseInt(StaticFunctions.getNonEmptyValue([rawRequestProduct.productPrice, currentProduct.productPrice])),
                productPublished: StaticFunctions.getNonEmptyValue([rawRequestProduct.productPublished, currentProduct.productPublished]),
                productDescription: StaticFunctions.getNonEmptyValue([rawRequestProduct.productDescription, currentProduct.productDescription]),
                productTags: StaticFunctions.getNonEmptyValue([rawRequestProduct.productTags, currentProduct.productTags]),
                productOptions: StaticFunctions.getNonEmptyValue([common.cleanHtml(rawRequestProduct.productOptions), currentProduct.productOptions]),
                productComment: StaticFunctions.getNonEmptyValue([common.checkboxBool(rawRequestProduct.productComment), currentProduct.productComment]),
                productAddedDate: StaticFunctions.getNonEmptyValue([currentProduct.productAddedDate, new Date()]),
                productStock: StaticFunctions.getNonEmptyValue([(rawRequestProduct.productStock ? parseInt(rawRequestProduct.frmProductStock) : null), currentProduct.productStock]),
                productImage: StaticFunctions.getNonEmptyValue([rawRequestProduct.productImage, currentProduct.productImage])
        };
        return product;
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
}

module.exports = Product;
