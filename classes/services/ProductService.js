const promise = require('bluebird');
const crypto = require('crypto');
const config = require('config');
const StaticFunctions = require('../utilities/staticFunctions');
const Enums = require('../models/Enums');
const{ProductDataStores} = require('../DataStores/ProductDataStores');
const{ProductValidator} = require('./validator/ProductValidator');
const{ProductRequestProcessor} = require('../RequestProcessor/ProductRequestProcessor');
const{ProductIndexingService} = require('./Indexing/ProductIndexingService');
const{FileService} = require('./FileServices');

class ProductService{
    static injectStaticDependencies(){
        this.productDataStores = ProductDataStores;
        this.staticFunctions = StaticFunctions;
        this.enums = Enums;
        this.productRequestProcessor = ProductRequestProcessor;
        this.productValidator = ProductValidator;
        this.productIndexingService = ProductIndexingService;
        this.fileService = FileService;
    }

    static async getLatestAddedProduct(req, res, skipProduct, isPublicRoute){
        try{
            let userId = (req.session.user && req.session.user.userId);
            let isAdmin = (req.session.user && req.session.user.isAdmin);
            let isAdminRoute = req.originalUrl.includes('admin');
            let productsPerPage = config.get('products.productsPerPage');
            let numOfProducts = isAdminRoute ? config.get('admins.numOfProducts') : productsPerPage;
            skipProduct = !isNaN(parseInt(skipProduct)) ? skipProduct : 0;
            if([true, 'true'].includes(isAdmin)){
                skipProduct = 0;
                numOfProducts = !isNaN(parseInt(numOfProducts)) ? parseInt(numOfProducts) : 100;
            }else numOfProducts = productsPerPage;
            return await this.productDataStores.getLatestAddedProduct(skipProduct, isPublicRoute, userId, numOfProducts, isAdmin);
        }catch(err){
            console.log(`Error getLatestAddedProduct function: ${err.message}`);
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
            let result = await promise.all([
                this.productDataStores.getProductIdByProductPermalink(product.productPermalink),
                this.productDataStores.getProductScore(productId)
            ]);
            let isProductPermaLinkExist = !!result[0];
            let isProductExist = !!result[1];
            if(isProductPermaLinkExist){
                throw Error(this.enums.PRODUCT_PERMALINK_ALREADY_EXIST);
            }
            if(isProductExist){
                let currentProduct = await this.productDataStores.getProductByProductID(productId);
                currentProduct.productStock = (isNaN(parseInt(currentProduct.productStock)) ? 0 : parseInt(currentProduct.productStock)) + product.productStock;
                await this.productDataStores.setProductProperty(productId, {productStock: currentProduct.productStock});
            }else{
                await promise.all([
                    this.productIndexingService.indexOrder(product),
                    this.productDataStores.setProductDetails(productId, product, userId)
                ]);
            }
            return product;
        }catch(err){
            console.log(`Error: insertProduct function ${err.message}`);
            throw err;
        }
    }

    static async updateProduct(req, res, productId, newProduct){
        try{
            let rawRequestProduct = this.productRequestProcessor.getRawRequestProduct(req, res);
            rawRequestProduct.productId = productId;
            let results = await promise.all([
                this.productDataStores.getProductByProductID(productId),
                this.productDataStores.getProductIdByProductPermalink(rawRequestProduct.productPermalink)
            ]);
            let productDetails = results[0];
            let isProductExists = (this.staticFunctions.isNotEmpty(productDetails));
            let productIdLinkWithProductPermaLink = results[1];
            if(isProductExists){
                if(this.staticFunctions.isNotEmpty(productIdLinkWithProductPermaLink) && productIdLinkWithProductPermaLink !== productId){
                    throw Error(this.enums.PRODUCT_PERMALINK_ALREADY_EXIST);
                }else{
                    if(this.staticFunctions.isNotEmpty(newProduct)) rawRequestProduct = newProduct;
                    let updatedProduct = this.getUpdatedProduct(rawRequestProduct, productDetails);
                    let isValidProduct = await this.productValidator.isValidProduct(updatedProduct);
                    if(!this.staticFunctions.checkIsSetOrNot(isValidProduct)){
                        throw Error(this.enums.INVALID_PRODUCT_DETAILS);
                    }
                    await promise.all([
                        this.productIndexingService.updateProductIndexing(productDetails, updatedProduct),
                        this.productDataStores.setProductDetails(productId, updatedProduct)
                    ]);
                    return updatedProduct;
                }
            }else{
                throw Error(this.enums.PRODUCT_NOT_EXISTS);
            }
        }catch(err){
            console.log(`Error: updateProduct function ${err.message}`);
            throw err;
        }
    }

    static async updateProductPublishedState(productId, publishedState){
        try{
            await this.productDataStores.updateProductPublishedState(productId, publishedState);
        }catch(e){
            console.log('Error: updateProductPublishedState function');
            throw e;
        }
    }

    static async deleteProduct(req, res, productId){
        try{
            let product = await this.productDataStores.getProductByProductID(productId);
            await promise.all([
                this.fileService.removeFile(req, res, product.productImage),
                this.productDataStores.deleteProduct(req, res, productId, product),
                this.productIndexingService.deleteProductIndexing(product)
            ]);
        }catch(e){
            console.log(`Error deleteProduct function: ${e.message}`);
            throw e;
        }
    }

    static async setProductImage(req, res){
        let productId = null;
        let productImage = null;
        let rawRequestProduct = null;
        try{
            rawRequestProduct = this.productRequestProcessor.getRawRequestProduct(req, res);
            if(this.staticFunctions.isEmpty(rawRequestProduct.productId)){
                throw this.enums.PRODUCT_ID_INVALID;
            }
            if(this.staticFunctions.isEmpty(rawRequestProduct.productImage)){
                throw this.enums.PRODUCT_IMAGE_EMPTY;
            }
            productId = rawRequestProduct.productId;
            productImage = rawRequestProduct.productImage;
            let productScore = await this.productDataStores.getProductScore(productId);
            if(this.staticFunctions.isEmpty(productScore)){
                throw this.enums.PRODUCT_NOT_EXISTS;
            }
            await this.productDataStores.setProductProperty(productId, {'productImage': productImage});
        }catch(e){
            console.log(`Error setProductImage function: ${e.message}`);
            throw e;
        }
    }

    static async deleteProductImage(req, res){
        let productId = null;
        let rawRequestProduct = null;
        let productImage = null;
        try{
            rawRequestProduct = this.productRequestProcessor.getRawRequestProduct(req, res);
            if(this.staticFunctions.isEmpty(rawRequestProduct.productId)){
                throw this.enums.PRODUCT_ID_INVALID;
            }
            if(this.staticFunctions.isEmpty(rawRequestProduct.productImage)){
                throw this.enums.PRODUCT_IMAGE_EMPTY;
            }
            productId = rawRequestProduct.productId;
            productImage = rawRequestProduct.productImage;
            let productScore = await this.productDataStores.getProductScore(productId);
            if(this.staticFunctions.isEmpty(productScore)){
                throw this.enums.PRODUCT_NOT_EXISTS;
            }
            let currentProductImage = this.productDataStores.getProductProperty(productId, 'productImage');
            if(currentProductImage === productImage){
                await promise.all([
                    this.fileService.removeFile(req, res),
                    this.productDataStores.setProductProperty(productId, {'productImage': productImage})
                ]);
            }else{
                await this.fileService.removeFile(req, res);
            }
        }catch(e){
            console.log(`Error deleteProductImage function: ${e.message}`);
            throw e;
        }
    }

    static getUpdatedProduct(rawRequestProduct, currentProduct){
        return this.productRequestProcessor.getUpdatedProduct(rawRequestProduct, currentProduct);
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
