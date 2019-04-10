const express = require('express');
const router = express.Router();
const colors = require('colors');
const async = require('async');
const _ = require('lodash');
const common = require('../lib/common');
const config = require('config');
const promise = require('bluebird');
const Enums = require('../classes/models/Enums');
const staticFunctions = require('../classes/utilities/staticFunctions');
const{ProductService} = require('../classes/services/ProductService');
const{OrderServices} = require('../classes/services/OrderServices');
const{PageServices} = require('../classes/services/PageServices');
const{AdminServices} = require('../classes/services/AdminServices');
const{ProductIndexingService} = require('../classes/services/Indexing/ProductIndexingService');

// These is the customer facing routes
router.get('/payment/:orderId', async (req, res, next) => {
    try{
        let config = req.app.config;
        let result = await promise.all([
            AdminServices.getMenu(req, res),
            OrderServices.getOrderDetails(req.params.orderId)
        ]);
        let order = result[1];
        let menu = result[0];
        // If stock management is turned on payment approved update stock level
        if(config.trackStock && order.orderStatus === 'Paid' && req.session.paymentApproved){
            order.orderProducts.forEach(async (product) => {
                const dbProduct = await ProductService.getProductByProductID(product.productId);
                let newStockLevel = dbProduct.productStock - product.quantity;
                if(newStockLevel < 1){
                    newStockLevel = 0;
                }
                product.productStock = newStockLevel;
                await ProductService.updateProduct(product.productId);
            });
        }
        common.clearSessionValue(req.session, 'totalCartItems');
        common.clearSessionValue(req.session, 'totalCartAmount');
        res.render(`${config.themeViews}/payment_complete`, {
            title: 'Payment complete',
            config: req.app.config,
            session: req.session,
            route: 'customer',
            pageCloseBtn: common.showCartCloseBtn('payment'),
            result: order,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            menu: common.sortMenu(menu)
        });
    }catch(e){
        console.log('Error: {/payment/:orderId} route');
        res.status(404).send({});
    }
});

router.get('/checkout', async (req, res, next) => {
    let themeViews = config.get('themeViews');
    // if there is no items in the cart then render a failure
    if(staticFunctions.isEmpty(req.session.cart)){
        req.session.message = Enums.CART_EMPTY;
        req.session.messageType = Enums.DANGER;
        res.redirect('/');
        return;
    }

    // render the checkout
    res.render(`${themeViews}/checkout`, {
        title: 'Checkout',
        session: req.session,
        pageCloseBtn: common.showCartCloseBtn('checkout'),
        checkout: 'hidden',
        page: 'checkout',
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        helpers: req.handlebars.helpers,
        showFooter: 'showFooter',
        route: 'customer',
        config: req.app.config
    });
});

router.get('/pay', async (req, res, next) => {
    const themeViews = config.get('themeViews');
    const paymentGateway = config.get('payment.paymentGateway');
    // if there is no items in the cart then render a failure
    if(!req.session.cart){
        req.session.message = Enums.CART_EMPTY;
        req.session.messageType = Enums.DANGER;
        res.redirect('/checkout');
        return;
    }

    // render the payment page
    res.render(`${themeViews}/pay`, {
        title: 'Pay',
        paymentConfig: common.getPaymentConfig(),
        pageCloseBtn: common.showCartCloseBtn('pay'),
        session: req.session,
        paymentPage: true,
        paymentGateway: paymentGateway,
        page: 'pay',
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        helpers: req.handlebars.helpers,
        showFooter: 'showFooter',
        route: 'customer',
        config: req.app.config
    });
});

router.get('/cartPartial', async (req, res) => {
    let themeViews = config.get('themeViews');
    res.render(`${themeViews}/cart`, {
        pageCloseBtn: common.showCartCloseBtn(req.query.path),
        page: req.query.path,
        layout: false,
        helpers: req.handlebars.helpers,
        session: req.session,
        route: 'customer',
        config: req.app.config
    });
});

// show an individual product
router.get('/product/:id', async (req, res) => {
    try{
        let cartTitle = config.get('cartTitle');
        let themeViews = config.get('themeViews');
        let productSearchId = req.params.id;
        if(staticFunctions.isEmpty(productSearchId)){
            throw Error(Enums.PRODUCT_ID_INVALID);
        }
        let result = await promise.all([
            ProductService.getProductByProductID(productSearchId),
            ProductService.getProductByProductPermalink(productSearchId),
            AdminServices.getMenu(req, res)
        ]);
        let product = (staticFunctions.isNotEmpty(result) && result.length > 1) ? (result[0] || result[1]) : null;
        let menu = result[2];
        if(staticFunctions.isEmpty(product)){
            throw Error(Enums.PRODUCT_ID_INVALID);
        }
        if(staticFunctions.isNotEmpty(req.query.json)){
            res.status(200).json(product);
            return;
        }

        common.getImages(product.productId, req, res, async (images) => {
            res.render(`${themeViews}/product`, {
                title: product.productTitle,
                result: product,
                productOptions: product.productOptions,
                images: images,
                productDescription: product.productDescription,
                metaDescription: cartTitle + ' - ' + product.productTitle,
                pageCloseBtn: common.showCartCloseBtn('product'),
                session: req.session,
                pageUrl: config.baseUrl + req.originalUrl,
                message: common.clearSessionValue(req.session, 'message'),
                messageType: common.clearSessionValue(req.session, 'messageType'),
                helpers: req.handlebars.helpers,
                showFooter: 'showFooter',
                menu: common.sortMenu(menu),
                route: 'customer',
                config: req.app.config
            });
        });
    }catch(err){
        switch(err.message){
            case Enums.PRODUCT_ID_INVALID:
                res.render('error', {title: 'Not found', message: 'Product not found', helpers: req.handlebars.helpers});
                break;
            default:
                console.log(err.stack);
        }
    }
});

// Updates a single product quantity
router.post('/product/updatecart', async (req, res, next) => {
    try{
        let cartItems = JSON.parse(req.body.items);
        let trackStock = config.get('trackStock');
        let tasks = [];
        for(let cartItem of cartItems){
            tasks.push(new promise(async (resolve, reject) => {
                let productQuantity = staticFunctions.isNotEmpty(cartItem.itemQuantity) ? parseInt(cartItem.itemQuantity) : 1;
                if(productQuantity === 0){
                    req.session.cart.splice(cartItem.cartIndex, 1);
                    resolve(1);
                }
                let product = await ProductService.getProductByProductID(cartItem.productId);
                if(staticFunctions.isEmpty(product)){
                    req.session.cart.splice(cartItem.cartIndex, 1);
                    resolve(1);
                }
                if(trackStock){
                    if(productQuantity > product.productStock){
                        reject(Enums.INSUFFICIENT_PRODUCT_STOCK);
                    }
                }
                let productPrice = parseFloat(product.productPrice).toFixed(2);
                if(req.session.cart[cartItem.cartIndex]){
                    if(staticFunctions.isNotEmpty(req.session.totalCartItems)) req.session.totalCartItems = parseInt(req.session.totalCartItems) - parseInt(req.session.cart[cartItem.cartIndex].quantity) + productQuantity;
                    else req.session.totalCartItems = productQuantity - parseInt(req.session.cart[cartItem.cartIndex].quantity);
                    if(staticFunctions.isNotEmpty(req.session.totalCartAmount)) req.session.totalCartAmount = parseInt(req.session.totalCartAmount) - parseInt(req.session.cart[cartItem.cartIndex].totalItemPrice) + productPrice * productQuantity;
                    else req.session.totalCartAmount = productPrice * productQuantity - parseInt(req.session.cart[cartItem.cartIndex].totalItemPrice);
                    req.session.cart[cartItem.cartIndex].quantity = productQuantity;
                    req.session.cart[cartItem.cartIndex].totalItemPrice = productPrice * productQuantity;
                }else{
                    reject(Enums.INVALID_CART_ITEM);
                }
                resolve(1);
            }));
        }
        await promise.all(tasks);
        return res.status(200).json({message: Enums.CART_SUCCESSFULLY_UPDATED, totalCartItems: Object.keys(req.session.cart).length});
    }catch(err){
        switch(err.message){
            case Enums.INSUFFICIENT_PRODUCT_STOCK:
                return res.status(400).json({message: Enums.INSUFFICIENT_PRODUCT_STOCK, totalCartItems: Object.keys(req.session.cart).length});
            case Enums.INVALID_CART_ITEM:
                return res.status(400).json({message: Enums.INVALID_CART_ITEM, totalCartItems: Object.keys(req.session.cart).length});
            default:
                return res.status(400).json({message: Enums.UNHANDLED_EXCEPTION, totalCartItems: Object.keys(req.session.cart).length});
        }
    }
});

// Remove single product from cart
router.post('/product/removefromcart', (req, res, next) => {
    // remove item from cart
    let cart = (staticFunctions.isNotEmpty(req.session.cart)) ? req.session.cart : [];
    let itemIndex = cart.findIndex((item) => {
        if(item.productId === req.body.cart_index){
            return true;
        }
        return false;
    });
    if(itemIndex > -1){
        if(staticFunctions.isNotEmpty(req.session.totalCartItems)) req.session.totalCartItems = parseInt(req.session.totalCartItems) - parseInt(req.session.cart[itemIndex].quantity);
        else{
            if(parseInt(req.session.cart[itemIndex].quantity > 0)){
                throw Error(Enums.INVALID_ITEM_IN_CART);
            }
            req.session.totalCartItems = 0;
        }
        if(staticFunctions.isNotEmpty(req.session.totalCartAmount)) req.session.totalCartAmount = parseInt(req.session.totalCartAmount) - parseInt(req.session.cart[itemIndex].totalItemPrice);
        else{
            if(parseInt(req.session.cart[itemIndex].totalItemPrice > 0)){
                throw Error(Enums.INVALID_ITEM_IN_CART);
            }
            req.session.totalCartItems = 0;
        }
        req.session.cart.splice(itemIndex, 1);
    }
    res.status(200).json({message: 'Product successfully removed', totalCartItems: Object.keys(req.session.cart).length});
});

// Totally empty the cart
router.post('/product/emptycart', (req, res, next) => {
    delete req.session.cart;
    delete req.session.orderId;
    delete req.session.totalCartItems;
    delete req.session.totalCartAmount;
    res.status(200).json({message: 'Cart successfully emptied', totalCartItems: 0});
});

// Add item to cart
router.post('/product/addtocart', async (req, res, next) => {
    try{
        let productId = req.body.productId;
        let productQuantity = req.body.productQuantity ? parseInt(req.body.productQuantity) : 1;
        let productComment = req.body.productComment ? req.body.productComment : null;
        let productOptions = req.body.productOptions;
        let trackStock = config.get('trackStock');

        // Don't allow negative quantity
        if(productQuantity < 0){
            productQuantity = 1;
        }

        // setup cart object if it doesn't exist
        if(!req.session.cart){
            req.session.cart = [];
        }

        let product = await ProductService.getProductByProductID(productId);
        if(staticFunctions.isEmpty(product)){
            throw Error(Enums.PRODUCT_ID_INVALID);
        }
        if(trackStock){
            if(productQuantity > product.productStock){
                throw Error(Enums.INSUFFICIENT_PRODUCT_STOCK);
            }
        }
        let productPrice = parseFloat(product.productPrice).toFixed(2);
        let options = {};
        if(staticFunctions.isNotEmpty(productOptions)){
            options = JSON.parse(req.body.productOptions);
        }
        let findDoc = {
            productId: req.body.productId,
            options: options
        };
        let cartIndex = req.session.cart.findIndex((cartItem) => {
            return cartItem.productId === findDoc.productId && JSON.stringify(cartItem.options) === JSON.stringify(findDoc.options);
        });
        if(cartIndex > -1){
            req.session.cart[cartIndex].quantity = parseFloat(req.session.cart[cartIndex].quantity) + productQuantity;
            req.session.cart[cartIndex].totalItemPrice = productPrice * parseInt(req.session.cart[cartIndex].quantity);
        }else{
            let productObj = {};
            productObj.productId = product.productId;
            productObj.title = product.productTitle;
            productObj.quantity = productQuantity;
            productObj.totalItemPrice = productPrice * productQuantity;
            productObj.options = options;
            productObj.productImage = product.productImage;
            productObj.productComment = productComment;
            if(product.productPermalink){
                productObj.link = product.productPermalink;
            }else{
                productObj.link = product.productId;
            }
            [].push.apply(req.session.cart, [productObj]);
        }
        if(staticFunctions.isNotEmpty(req.session.totalCartAmount)){
            req.session.totalCartAmount = parseFloat(req.session.totalCartAmount) + productPrice * productQuantity;
        }else req.session.totalCartAmount = productQuantity * productPrice;

        if(staticFunctions.isNotEmpty(req.session.totalCartItems)){
            req.session.totalCartItems = parseInt(req.session.totalCartItems) + productQuantity;
        }else req.session.totalCartItems = productQuantity;
        return res.status(200).json({message: 'Cart successfully updated', totalCartItems: req.session.totalCartItems});
    }catch(err){
        switch(err.message){
            case Enums.PRODUCT_ID_INVALID:
                return res.status(400).json({message: Enums.PRODUCT_ID_INVALID});
            case Enums.INSUFFICIENT_PRODUCT_STOCK:
                return res.status(400).json({message: Enums.INSUFFICIENT_PRODUCT_STOCK});
            default:
                console.error(colors.red('Error adding to cart', err));
                return res.status(400).json({message: Enums.UNHANDLED_EXCEPTION});
        }
    }
    });

// search products
router.get('/search/:searchTerm/:pageNum?', async (req, res) => {
    let searchTerm = req.params.searchTerm;
    let numberProducts = config.get('products.productsPerPage') ? config.get('products.productsPerPage') : 6;
    let pageNum = (!req.params.pageNum) ? 1 : req.params.pageNum;
    let products = [];
    let menu = {};
    try{
        let result = await Promise.all([
            ProductIndexingService.getFilteredProductByCriteria(searchTerm, numberProducts, pageNum),
            AdminServices.getMenu(req, res)
        ]);
        products = result[0];
        menu = result[1];
    }catch(err){
        console.log('Error in filtering products: ' + err);
    }
    if(req.query.json === 'true'){
        res.status(200).json(products);
        return;
    }
    res.render(`${req.app.config.themeViews}/index`, {
        title: 'Results',
        results: products,
        filtered: true,
        session: req.session,
        metaDescription: req.app.config.cartTitle + ' - Search term: ' + searchTerm,
        searchTerm: searchTerm,
        pageCloseBtn: common.showCartCloseBtn('search'),
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        productsPerPage: numberProducts,
        totalProductCount: products.length,
        pageNum: pageNum,
        paginateUrl: 'search',
        config: req.app.config,
        menu: common.sortMenu(menu),
        helpers: req.handlebars.helpers,
        route: 'customer',
        showFooter: 'showFooter'
    });
});

// search products
router.get('/category/:cat/:pageNum?', (req, res) => {
    let db = req.app.db;
    let searchTerm = req.params.cat;
    let productsIndex = req.app.productsIndex;
    let config = req.app.config;
    let numberProducts = config.productsPerPage ? config.productsPerPage : 6;

    let lunrIdArray = [];
    productsIndex.search(searchTerm).forEach((id) => {
        lunrIdArray.push(common.getId(id.ref));
    });

    let pageNum = 1;
    if(req.params.pageNum){
        pageNum = req.params.pageNum;
    }

    Promise.all([
        common.getData(req, pageNum, {_id: {$in: lunrIdArray}}),
        common.getMenu(db)
    ])
    .then(([results, menu]) => {
        const sortedMenu = common.sortMenu(menu);

        // If JSON query param return json instead
        if(req.query.json === 'true'){
            res.status(200).json(results.data);
            return;
        }

        res.render(`${config.themeViews}index`, {
            title: 'Category',
            results: results.data,
            filtered: true,
            session: req.session,
            searchTerm: searchTerm,
            metaDescription: req.app.config.cartTitle + ' - Category: ' + searchTerm,
            pageCloseBtn: common.showCartCloseBtn('category'),
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            productsPerPage: numberProducts,
            totalProductCount: results.totalProducts,
            pageNum: pageNum,
            menuLink: _.find(sortedMenu.items, (obj) => { return obj.link === searchTerm; }),
            paginateUrl: 'category',
            menu: sortedMenu,
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            route: 'customer',
            config: req.app.config
        });
    })
    .catch((err) => {
        console.error(colors.red('Error getting products for category', err));
    });
});

// return sitemap
// router.get('/sitemap.xml', (req, res, next) => {
//     let sm = require('sitemap');
//     let config = req.app.config;
//
//     common.addSitemapProducts(req, res, (err, products) => {
//         if(err){
//             console.error(colors.red('Error generating sitemap.xml', err));
//         }
//         let sitemap = sm.createSitemap(
//             {
//                 hostname: config.baseUrl,
//                 cacheTime: 600000,
//                 urls: [
//                     {url: '/', changefreq: 'weekly', priority: 1.0}
//                 ]
//             });
//
//         let currentUrls = sitemap.urls;
//         let mergedUrls = currentUrls.concat(products);
//         sitemap.urls = mergedUrls;
//         // render the sitemap
//         sitemap.toXML((err, xml) => {
//             if(err){
//                 return res.status(500).end();
//             }
//             res.header('Content-Type', 'application/xml');
//             res.send(xml);
//             return true;
//         });
//     });
// });

router.get('/page/:pageNum', async (req, res, next) => {
    try{
        let page = staticFunctions.isNotEmpty(req.params.pageNum) ? req.params.pageNum : 0;
        let result = await promise.all([
            PageServices.getPage(req, res, page, true),
            AdminServices.getMenu(req, res)
        ]);
        let products = result[0];
        let menu = result[1];
        let themeViews = config.get('themeViews');
        let cartTitle = config.get('cartTitle');
        let theme = config.get('theme');
        let productsPerPage = config.get('products.productsPerPage');
        if(req.query.json === 'true'){
            res.status(200).json(products);
            return;
        }
        res.render(`${themeViews}index`, {
            title: 'Shop',
            results: products,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            metaDescription: cartTitle + ' - Products page: ' + req.params.pageNum,
            pageCloseBtn: common.showCartCloseBtn('page'),
            productsPerPage: productsPerPage,
            totalProductCount: products.length,
            pageNum: req.params.pageNum,
            paginateUrl: 'page',
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            menu: common.sortMenu(menu),
            route: 'customer',
            config: req.app.config
        });
    }catch(err){
        switch(err.message){
            case Enums.INVALID_PAGE:
                res.status(404).render('error', {
                    title: '404 Error - Page not found',
                    message: '404 Error - Page not found',
                    helpers: req.handlebars.helpers,
                    showFooter: 'showFooter',
                    menu: common.sortMenu({}),
                    config: req.app.config
                });
                break;
            default:
                console.error(colors.red('Error getting products for page', err));
        }
    }
});

// The main entry point of the shop
router.get('/:page?', async (req, res, next) => {
    try{
        let page = staticFunctions.isNotEmpty(req.params.page) ? req.params.page : 0;
        if(page === 'admin'){
            next();
            return;
        }
        let result = await promise.all([
            PageServices.getPage(req, res, page, true),
            AdminServices.getMenu(req, res)
        ]);
        let products = result[0];
        let menu = result[1];
        let themeViews = config.get('themeViews');
        let cartTitle = config.get('cartTitle');
        let theme = config.get('theme');
        let productsPerPage = config.get('products.productsPerPage');
        if(req.query.json === 'true'){
            res.status(200).json(products);
            return;
        }
        res.render(`${themeViews}/index`, {
            title: `${cartTitle} - Shop`,
            theme: theme,
            results: products,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            pageCloseBtn: common.showCartCloseBtn('page'),
            productsPerPage: productsPerPage,
            totalProductCount: products.length,
            pageNum: page,
            paginateUrl: 'page',
            helpers: req.handlebars.helpers,
            showFooter: 'showFooter',
            menu: common.sortMenu(menu),
            route: 'customer',
            config: req.app.config
        });
    }catch(err){
        switch(err.message){
            case Enums.INVALID_PAGE:
                res.status(404).render('error', {
                    title: '404 Error - Page not found',
                    message: '404 Error - Page not found',
                    helpers: req.handlebars.helpers,
                    showFooter: 'showFooter',
                    menu: common.sortMenu({}),
                    route: 'customer',
                    config: req.app.config
                });
                break;
            default:
                console.error(colors.red('Error getting products for page', err));
        }
    }
});

module.exports = router;
