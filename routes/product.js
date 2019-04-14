const express = require('express');
const common = require('../lib/common');
const Promise = require('bluebird');
const colors = require('colors');
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const StaticFunctions = require('../classes/utilities/staticFunctions');
const{ProductService} = require('../classes/services/ProductService');
const{ProductRequestProcessor} = require('../classes/RequestProcessor/ProductRequestProcessor');
const Enums = require('../classes/models/Enums');
const ProductUrls = require('../classes/UrlService/ProductUrls');
const{ProductIndexingService} = require('../classes/services/Indexing/ProductIndexingService');
const{AdminServices} = require('../classes/services/AdminServices');

router.get('/admin/products', common.restrict, async (req, res, next) => {
    // undone
    try{
        let topProducts = await ProductService.getLatestAddedProduct(req, res);
        res.render('products', {
            title: 'Cart',
            top_results: topProducts,
            admin: true,
            route: 'admin',
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }catch(err){
        res.render('products', {
            title: 'Cart',
            top_results: {},
            admin: true,
            route: 'admin',
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }
});

router.get('/admin/products/filter/:search', async (req, res, next) => {
    let searchTerm = req.params.search;
    let products = [];
    let menu = {};
    try{
        let result = await Promise.all([
            ProductIndexingService.getFilteredProductByCriteria(searchTerm),
            AdminServices.getMenu(req, res)
        ]);
        products = result[0];
        menu = await common.sortMenu(result[1]);
    }catch(e){
        console.error('Error in product filtering: ' + e);
    }
    res.render('products', {
        title: 'Results',
        results: products,
        admin: true,
        config: req.app.config,
        session: req.session,
        searchTerm: searchTerm,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        helpers: req.handlebars.helpers,
        menu: menu
    });
});

// insert form
router.get('/admin/product/new', common.restrict, (req, res) => {
    res.render('product_new', {
        title: 'New product',
        session: req.session,
        product: common.clearSessionValue(req.session, 'product'),
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        editor: true,
        admin: true,
        helpers: req.handlebars.helpers,
        config: req.app.config
    });
});

// insert new product form action
router.post('/admin/product/insert', common.restrict, async (req, res) => {
    try{
        let product = await ProductService.insertProduct(req, res);
        req.session.product = product;
        req.session.message = Enums.PRODUCT_SUCCESSFULLY_INSERTED;
        req.session.messageType = Enums.SUCCESS;
        res.redirect(`/admin/product/edit/${product.productId}`);
    }catch(err){
        switch(err.message){
            case Enums.INVALID_PRODUCT_DETAILS:
                req.session.message = Enums.INVALID_PRODUCT_DETAILS;
                break;
            case Enums.PRODUCT_PERMALINK_ALREADY_EXIST:
                req.session.message = Enums.PRODUCT_PERMALINK_ALREADY_EXIST;
                break;
            default:
                req.session.message = Enums.UNHANDLED_EXCEPTION;
        }
        req.session.messageType = Enums.DANGER;
        req.session.product = ProductRequestProcessor.getRawRequestProduct(req, res);
        // redirect to insert
        res.redirect('/admin/product/new');
    }
});

// render the editor
router.get('/admin/product/edit/:id', common.restrict, (req, res) => {
    common.getImages(req.params.id, req, res, (images, product) => {
        let options = {};
        req.session.product = product;
        if(product.productOptions){
            options = product.productOptions;
        }
        res.render('product_edit', {
            title: 'Edit product',
            result: product,
            images: images,
            options: options,
            admin: true,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            editor: true,
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    });
});

// Update an existing product form action
router.post('/admin/product/update', common.restrict, async (req, res) => {
    let redirectUrl = `/admin/product/edit/${req.session.product.productId}`;
    try{
        let productId = req.body.frmProductId;
        let product = await ProductService.updateProduct(req, res, productId);
        req.session.message = Enums.PRODUCT_SUCCESSFULLY_SAVED;
        req.session.messageType = Enums.SUCCESS;
        req.session.product = common.clearSessionValue(req.session, 'product');
        res.redirect(redirectUrl);
    }catch(err){
        switch(err.message){
            case Enums.INVALID_PRODUCT_DETAILS:
                req.session.message = Enums.INVALID_PRODUCT_DETAILS;
                break;
            case Enums.PRODUCT_NOT_EXISTS:
                req.session.message = Enums.PRODUCT_ID_INVALID;
                req.session.product = common.clearSessionValue(req.session, 'product');
                redirectUrl = '/admin/product/new';
                break;
            case Enums.PRODUCT_PERMALINK_ALREADY_EXIST:
                req.session.message = Enums.PRODUCT_PERMALINK_ALREADY_EXIST_MESSAGE;
                break;
            case Enums.PRODUCT_PERMALINK_EMPTY:
                req.session.message = Enums.PRODUCT_PERMALINK_EMPTY_MESSAGE;
                break;
        }
        req.session.messageType = Enums.DANGER;
        res.redirect(redirectUrl);
    }
});

// delete product
router.get('/admin/product/delete/:id', common.restrict, async (req, res) => {
    try{
        // image deleting logic not written
        let productId = req.params.id;
        await ProductService.deleteProduct(req, res, productId);
        req.session.message = Enums.PRODUCT_SUCCESSFULLY_DELETED;
        req.session.messageType = Enums.SUCCESS;
        common.clearSessionValue(req.session, 'product');
        res.redirect('/admin/products');
    }catch(err){
        req.session.message = Enums.ERROR_PRODUCT_DELETION;
        req.session.messageType = Enums.DANGER;
        res.redirect('/admin/products');
        throw err;
    }
});

// update the published state based on an ajax call from the frontend
router.post('/admin/product/published_state', common.restrict, async (req, res) => {
    try{
        await ProductService.updateProductPublishedState(req.body.id, req.body.state);
        req.session.messageType = 'success';
        req.session.message = 'Product Published State Updated';
        res.status(200).json('Published state updated');
    }catch(e){
        console.error(colors.red('Failed to update the published state: ' + e));
        req.session.messageType = 'danger';
        req.session.message = 'Failed to update the published state';
        res.status(200).json('Published state not updated');
    }
});

// set as main product image
router.post('/admin/product/setasmainimage', common.restrict, common.checkAccess, async (req, res) => {
    try{
        await ProductService.setProductImage(req, res);
        res.status(200).json({message: 'Main image successfully set'});
    }catch(err){
        switch(err.message){
            case Enums.PRODUCT_ID_INVALID:
                res.redirect('/admin/product/new');
                break;
            default:
                res.status(400).json({message: 'Unable to set as main image. Please try again.'});
        }
    }
});

// deletes a product image
router.post('/admin/product/deleteimage', common.restrict, common.checkAccess, async (req, res) => {
    try{
        await ProductService.deleteProductImage(req, res);
        res.status(200).json({message: 'Image successfully deleted'});
    }catch(err){
        res.status(400).json({message: 'Image not removed, please try again.'});
    }
});

module.exports = router;
