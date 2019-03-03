const common = require('../../lib/common');
const crypto = require('crypto');
const StaticFunctions = require('../utilities/staticFunctions');

class ProductRequestProcessor{
    static getRawRequestProduct(req, res, isGenerateProductId){
        let product = {
            productId: req.session.product && req.session.product.productId,
            productPermalink: req.body.frmProductPermalink,
            productTitle: req.body.frmProductTitle,
            productPrice: req.body.frmProductPrice,
            productPublished: req.body.frmProductPublished,
            productDescription: req.body.frmProductDescription,
            productTags: req.body.frmProductTags,
            productOptions: common.cleanHtml(req.body.frmProductOptions),
            productComment: common.checkboxBool(req.body.frmProductComment),
            productAddedDate: new Date(),
            productStock: req.body.frmProductStock ? parseInt(req.body.frmProductStock) : null
        };
        if(StaticFunctions.checkIsSetOrNot(isGenerateProductId) && StaticFunctions.isEmpty(product.productId)){
            product.productId = ProductRequestProcessor.getProductId(product);
        }
        return product;
    }

    static getProductId(product){
        return crypto.createHash('md5').update(JSON.stringify(product)).digest('hex');
    }
}

module.exports = ProductRequestProcessor;
