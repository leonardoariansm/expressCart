const promise = require('bluebird');
const StaticFucntions = require('../../utilities/staticFunctions');

class ProductValidator{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFucntions;
    }

    static async isValidProduct(product){
        let tasks = [];
        tasks.push(this.isValidProductID(product));
        tasks.push(this.isValidProductPermalink(product));
        tasks.push(this.isValidProductTitle(product));
        tasks.push(this.isValidProductPrice(product));
        tasks.push(this.isValidProductPublishedState(product));
        tasks.push(this.isValidProductDescription(product));
        tasks.push(this.isValidProductTags(product));
        tasks.push(this.isValidProductOptions(product));
        tasks.push(this.isValidProductComments(product));
        tasks.push(this.isValidProductStock(product));
        tasks.push(this.isValidProductAddedDate(product));
        let result = await promise.all(tasks);
        let isValidRequest = true;
        for(let key in result){
            if(!result[key]){
                isValidRequest = false;
                break;
            }
        }
        return isValidRequest;
    }

    static async isValidProductID(product){
        return this.staticFunctions.isNotEmpty(product.productId);
    }

    static async isValidProductPermalink(product){
        return this.staticFunctions.isNotEmpty(product.productPermalink);
    }

    static async isValidProductTitle(product){
        return this.staticFunctions.isNotEmpty(product.productTitle);
    }

    static async isValidProductPrice(product){
        return(this.staticFunctions.isNotEmpty(product.productPrice) && (typeof product.productPrice === 'number') && product.productPrice > 0);
    }

    static async isValidProductPublishedState(product){
        return this.staticFunctions.isNotEmpty(product.productPublished);
    }

    static async isValidProductDescription(product){
        return this.staticFunctions.isNotEmpty(product.productDescription);
    }

    static async isValidProductTags(product){
        return true;
    }

    static async isValidProductOptions(prodcut){
        return true;
    }

    static async isValidProductComments(product){
        return true;
    }

    static async isValidProductStock(product){
        return true;
        // return(this.staticFunctions.isNotEmpty(product.productStock) && (typeof product.productPrice === 'number') && product.productPrice > 0);
    }

    static async isValidProductAddedDate(product){
        return true;
    }
}

module.exports = {
    dependencies: ProductValidator.injectStaticDependencies(),
    ProductValidator: ProductValidator
};
