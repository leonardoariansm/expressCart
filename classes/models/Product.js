const common = require('../../lib/common');
const StaticFunctions = require('../utilities/staticFunctions');

class Product{
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
                productStock: StaticFunctions.getNonEmptyValue([rawRequestProduct.productStock ? parseInt(rawRequestProduct.frmProductStock) : null, currentProduct.productStock])
        };
        return product;
    }
}

module.exports = Product;
