const common = require('../../lib/common');
const crypto = require('crypto');
const StaticFunctions = require('../utilities/staticFunctions');

class ProductRequestProcessor{
    static async injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
    }

    static getRawRequestProduct(req, res){
        let product = {
            productId: req.body.frmProductId,
            productPermalink: req.body.frmProductPermalink,
            productTitle: req.body.frmProductTitle,
            productPrice: parseInt(req.body.frmProductPrice),
            productPublished: req.body.frmProductPublished,
            productDescription: req.body.frmProductDescription,
            productTags: req.body.frmProductTags,
            productOptions: common.cleanHtml(req.body.frmProductOptions),
            productComment: common.checkboxBool(req.body.frmProductComment),
            productAddedDate: new Date(),
            productStock: req.body.frmProductStock ? parseInt(req.body.frmProductStock) : 0,
            productImage: req.body.frmProductImage
        };
        return product;
    }

    static getUpdatedProduct(rawRequestProduct, currentProduct){
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

    static async getRawRequestSearchCriteria(searchTerm, numOfProducts, pageNum){
        try{
            let searchCriteria = {};
            let keywords = this.staticFunctions.getPhrases(searchTerm, ' ');
            searchCriteria.productDescription = keywords;
            searchCriteria.productTags = keywords;
            searchCriteria.productTitle = keywords;
            searchCriteria.numOfProducts = numOfProducts;
            searchCriteria.pageNum = pageNum;
            return searchCriteria;
        }catch(e){
            console.log(`Error: getRawRequestSearchCriteria ${e.message}`);
            throw e;
        }
    }
}

module.exports = {
    dependencies: ProductRequestProcessor.injectStaticDependencies(),
    ProductRequestProcessor: ProductRequestProcessor
};
