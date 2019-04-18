const{IndexingService} = require('./IndexingService');
const promise = require('bluebird');
const config = require('config');
const colors = require('colors');
const elasticlunr = require('elasticlunr');
const{ProductRequestProcessor} = require('../../RequestProcessor/ProductRequestProcessor');

class ProductIndexingService extends IndexingService{
    static injectStaticDependencies(){
        super.injectStaticDependencies.call(this);
        this.maxWordAllowed = config.get('products.indexingWords');
        this.productRequestProcessor = ProductRequestProcessor;
        this.productsIndex = null;
    }

    static async getProductLunrIndex(){
        try{
            let numOfProducts = config.get('admins.numOfProducts');
            let products = await this.productDataStores.getLatestAddedProduct(0, true, null, numOfProducts, true);
            if(this.staticFunctions.isEmpty(products))return null;
            const productsIndex = elasticlunr(function (){
                this.addField('productTitle');
                this.addField('productTags');
                this.setRef('id');
            });
            for(let product of products){
                let doc = {
                    'id': product.productId,
                    'productTitle': product.productTitle,
                    'productTags': product.productTags
                };
                productsIndex.addDoc(doc);
            }
            this.productsIndex = productsIndex;
            return productsIndex;
        }catch(err){
            console.log(`Error getProductLunrIndex function: ${err.message}`);
            throw err;
        }
    }

    static async updateProductLunrIndexing(product){
        try{
            let doc = {
                'id': product.productId,
                'productTitle': product.productTitle,
                'productTags': product.productTags
            };
            await this.productsIndex.update(doc);
        }catch(err){
            console.log(`Error updateProductLunrIndexing function: ${err.message}`);
            throw err;
        }
    }

    static async deleteProductLunrIndexing(product){
        try{
            let doc = {
                'id': product.productId,
                'productTitle': product.productTitle,
                'productTags': product.productTags
            };
            await this.productsIndex.removeDoc(doc);
        }catch(err){
            console.log(`Error deleteProductLunrIndexing function: ${err.message}`);
            throw err;
        }
    }

    static async indexOrder(product){
        let multi = this.redisUtils.queueSuccessiveCommands();
        await promise.all([
            this.productTitleIndexing(product, {}, multi),
            this.productTagsIndexing(product, {}, multi),
            this.updateProductLunrIndexing(product)
            // this.productDescriptionIndexing(product, {}, multi)
        ]);
        await this.redisUtils.executeQueuedCommands(multi);
        console.log(colors.cyan('- Product indexing complete'));
    }

    static async productTitleIndexing(product, currentProduct, multi){
        let result = await promise.all([
            this.staticFunctions.getKeywords(currentProduct.productTitle, ' '),
            this.staticFunctions.getKeywords(product.productTitle, ' ')
        ]);
        let currentProductTitleWords = new Set(result[0]);
        let updatedProductTitleWords = new Set(result[1]);
        let keywordDelSet = [];
        for(let kwd of currentProductTitleWords){
            if(updatedProductTitleWords.has(kwd)){
                updatedProductTitleWords.delete(kwd);
            }else keywordDelSet.push(kwd);
        }
        let indexingKeyword = [...updatedProductTitleWords];
        for(let key = 0; key < keywordDelSet.length; key++){
            this.redisUtils.removeToSet(this.redisKeys.getProductByProductTitleKey(keywordDelSet[key].trim().toLowerCase()), product.productId, multi);
        }
        for(let key = 0; key < indexingKeyword.length; key++){
            this.redisUtils.addToSet(this.redisKeys.getProductByProductTitleKey(indexingKeyword[key].trim().toLowerCase()), product.productId, multi);
        }
    }

    static async productTagsIndexing(product, currentProduct, multi){
        let result = await promise.all([
            this.staticFunctions.getKeywords(currentProduct.productTags, ','),
            this.staticFunctions.getKeywords(product.productTags, ',')
        ]);
        let currentProductTagsWords = new Set(result[0]);
        let updatedProductTagsWords = new Set(result[1]);
        let keywordDelSet = [];
        for(let kwd of currentProductTagsWords){
            if(updatedProductTagsWords.has(kwd)){
                updatedProductTagsWords.delete(kwd);
            }else keywordDelSet.push(kwd);
        }
        let indexingKeyword = [...updatedProductTagsWords];
        for(let key = 0; key < keywordDelSet.length; key++){
            this.redisUtils.removeToSet(this.redisKeys.getProductByProductTagsKey(keywordDelSet[key].trim().toLowerCase()), product.productId, multi);
        }
        for(let key = 0; key < indexingKeyword.length; key++){
            this.redisUtils.addToSet(this.redisKeys.getProductByProductTagsKey(indexingKeyword[key].trim().toLowerCase()), product.productId, multi);
        }
    }

    static async productDescriptionIndexing(product, currentProduct, multi){
        let result = await promise.all([
            this.staticFunctions.getKeywords(currentProduct.productDescription, ' '),
            this.staticFunctions.getKeywords(product.productDescription, ' ')
        ]);
        let currentProductDescriptionWords = new Set(result[0]);
        let updatedProductDescriptionWords = new Set(result[1]);
        let keywordDelSet = [];
        for(let kwd of currentProductDescriptionWords){
            if(updatedProductDescriptionWords.has(kwd)){
                updatedProductDescriptionWords.delete(kwd);
            }else keywordDelSet.push(kwd);
        }
        let indexingKeyword = [...updatedProductDescriptionWords];
        for(let key = 0; key < keywordDelSet.length; key++){
            this.redisUtils.removeToSet(this.redisKeys.getProductByProductDescriptionKey(keywordDelSet[key].trim().toLowerCase()), product.productId, multi);
        }
        for(let key = 0; key < indexingKeyword.length; key++){
            this.redisUtils.addToSet(this.redisKeys.getProductByProductDescriptionKey(indexingKeyword[key].trim().toLowerCase()), product.productId, multi);
        }
    }

    static async updateProductIndexing(currentProduct, newProduct){
        let tasks = [];
        let multi = this.redisUtils.queueSuccessiveCommands();
        if(currentProduct.productTitle !== newProduct.productTitle){
            tasks.push(this.productTitleIndexing(newProduct, currentProduct, multi));
        }
        if(currentProduct.productTags !== newProduct.productTags){
            tasks.push(this.productTagsIndexing(newProduct, currentProduct, multi));
        }
        if(currentProduct.productDescription !== newProduct.productDescription){
            // tasks.push(this.productDescriptionIndexing(newProduct, currentProduct, multi));
        }
        tasks.push(this.updateProductLunrIndexing(newProduct));
        await promise.all(tasks);
        let result = await this.redisUtils.executeQueuedCommands(multi);
        console.log(colors.cyan('- Updated Product indexing complete'));
        return result;
    }

    static async deleteProductIndexing(product){
        try{
            await promise.all([
                this.updateProductIndexing(product, {}),
                this.deleteProductLunrIndexing(product)
            ]);
        }catch(e){
            console.log(`Error deleteProductIndexing function: ${e.message}`);
            throw e;
        }
    }

    static async performProductTitleOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let productTitleWords = searchCriteria.productTitle;
        let productTitleWordsKeys = [];
        for(let key = 0; key < Math.min(this.maxWordAllowed, productTitleWords.length); key++){
            productTitleWordsKeys.push(this.redisKeys.getProductByProductTitleKey(productTitleWords[key]));
        }
        let productTitleKey = that.redisKeys.getProductByProductTitleKey(searchCriteria.productTitle);
        await this.redisUtils.setInterAndStore(productTitleKey, productTitleWordsKeys);
        context.UnionSet.push(productTitleKey);
        return context;
    }

    static async performProductTagOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let productTagsWords = searchCriteria.productTags;
        let productTagsWordsKeys = [];
        for(let key = 0; key < Math.min(this.maxWordAllowed, productTagsWords.length); key++){
            productTagsWordsKeys.push(this.redisKeys.getProductByProductTagsKey(productTagsWords[key]));
        }
        let productTagsKey = that.redisKeys.getProductByProductTagsKey(searchCriteria.productTags);
        await this.redisUtils.setUnionAndStore(productTagsKey, productTagsWordsKeys);
        context.UnionSet.push(productTagsKey);
        return context;
    }

    static async performProductDescriptionOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let productDescriptionWords = searchCriteria.productDescription;
        let productDescriptionWordsKeys = [];
        for(let key = 0; key < Math.min(this.maxWordAllowed, productDescriptionWords.length); key++){
            productDescriptionWordsKeys.push(this.redisKeys.getProductByProductDescriptionKey(productDescriptionWords[key]));
        }
        let productDescriptionKey = that.redisKeys.getProductByProductDescriptionKey(searchCriteria.productTags);
        await this.redisUtils.setUnionAndStore(productDescriptionKey, productDescriptionWordsKeys);
        context.UnionSet.push(productDescriptionKey);
        return context;
    }

    static async performPageNumOperation(searchCriteria){
        let that = this;
        let pageNum = searchCriteria.pageNum;
        let context = {};
        let pageNumFilterKey = 'pageNumFilterKey:' + pageNum;
        context.keyType = 'intersect';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        if(this.staticFunctions.isNotEmpty(pageNum) && !isNaN(parseInt(pageNum))){
            let productsPerPage = config.get('products.productsPerPage');
            let skipProduct = Math.max(parseInt(pageNum) - 1, 0) * config.get('products.productsPerPage');
            let currentTimeInMs = Date.now();
            let productIds = await this.redisUtils.getSortedSetRangeByScoreReverse(this.redisKeys.getProductRedisKey(), currentTimeInMs, null, [skipProduct, productsPerPage]);
            await this.redisUtils.addToSet(pageNumFilterKey, productIds);
            this.redisUtils.expireKey(pageNumFilterKey, 300);
            context.intersectionSet.push(pageNumFilterKey);
        }
        return context;
    }

    static async performProductLunrOperation(searchCriteria){
        try{
            let searchTerm = searchCriteria.searchTerm;
            let productsDocs = this.productsIndex.search(searchTerm, {});
            if(!productsDocs && productsDocs.length === 0)return[];
            let productIds = [];
            for(let productDoc of productsDocs){
                productIds.push(productDoc.ref);
            }
            return productIds;
        }catch(err){
            console.log(`Error performProductLunrOperation function: ${err.message}`);
            throw err;
        }
    }

    static async getOperationsRedisKeys(searchCriteria){
        let pendingPromise = [];
        pendingPromise.push(this.performProductTitleOperation(searchCriteria));
        pendingPromise.push(this.performProductTagOperation(searchCriteria));
        // pendingPromise.push(this.performProductDescriptionOperation(searchCriteria));
        pendingPromise.push(this.performPageNumOperation(searchCriteria));
        let result = await promise.all(pendingPromise);
        return result;
    }

    static async getFilteredProductByCriteria(searchTerm, numOfProducts, pageNum, isSearchTermCategory){
        let searchCriteria = await this.productRequestProcessor.getRawRequestSearchCriteria(searchTerm, numOfProducts, pageNum, isSearchTermCategory);
        if(this.staticFunctions.isEmpty(searchCriteria)){
            return[];
        }
        if(this.staticFunctions.isNotEmpty(isSearchTermCategory) && ['true', true].includes(isSearchTermCategory)){
            return await this.getCategoryProducts(searchCriteria.category);
        }
        let operationRedisKeys = await this.getOperationsRedisKeys(searchCriteria);
        let intersectSet = [];
        let diffSet = [];
        let delSet = [];
        let unionSet = [];
        let multi = this.redisUtils.queueSuccessiveCommands();
        for(let key of operationRedisKeys){
            if(key.skipped !== true){
                intersectSet = intersectSet.concat(key.intersectionSet);
                diffSet = diffSet.concat(key.differenceSet);
                unionSet = unionSet.concat(key.UnionSet);
                if(key.isTempKey) delSet.push(key.keyName);
            }
        }
        let finalKey = 'prodGenericFilterKey:';
        this.redisUtils.setUnionAndStore(finalKey, unionSet, multi);
        this.redisUtils.setInterAndStore(finalKey, intersectSet, multi);
        this.redisUtils.setDifferenceAndStore(finalKey, diffSet, multi);
        this.redisUtils.expireKey(finalKey, 300, multi);
        for(let delKey of delSet){
            this.redisUtils.expireKey(delKey, 10, multi);
        }
        await this.redisUtils.executeQueuedCommands(multi);
        let result = await promise.all([
            this.redisUtils.getAllSetMembers(finalKey),
            this.performProductLunrOperation(searchCriteria)
        ]);
        let productIds = this.staticFunctions.getUnique(result[0], result[1]);
        let products = await this.getProductsByProductIDs(productIds);
        if(this.staticFunctions.isNotEmpty(products) && !isNaN(parseInt(numOfProducts))){
            products.slice(0, searchCriteria.numOfProducts);
        }
        return products;
    }

    static async getCategoryProducts (category, numOfProducts){
        try{
            let productIds = await this.productDataStores.getCategoryProductIds(category);
            let products = await this.getProductsByProductIDs(productIds);
            if(this.staticFunctions.isNotEmpty(products) && !isNaN(parseInt(numOfProducts))){
                products.slice(0, numOfProducts);
            }
            return products;
        }catch(e){
            console.log(`Error getCategoryProducts function: ${e.message}`);
            throw e;
        }
    }

    static async getProductsByProductIDs(productIds){
        try{
            if(this.staticFunctions.isEmpty(productIds)){
                throw Error(this.enums.PRODUCT_ID_INVALID);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let productId of productIds){
                this.redisUtils.getAllValueFromHash(this.redisKeys.getProductDetailsRedisKey(productId), multi);
            }
            return await this.redisUtils.executeQueuedCommands(multi);
        }catch(e){
            console.log(`Error getProductsByProductIDs function: ${e.message}`);
            throw e;
        }
    }
}

module.exports = {
    dependencies: ProductIndexingService.injectStaticDependencies(),
    ProductIndexingService: ProductIndexingService
};
