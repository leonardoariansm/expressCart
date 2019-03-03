const express = require('express');
const common = require('../lib/common');
const colors = require('colors');
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const ProductService = require('../classes/services/ProductService');
const ProductRequestProcessor = require('../classes/RequestProcessor/ProductRequestProcessor');
const Enums = require('../classes/models/Enums');
const UrlServices = require('../classes/services/UrlService');

router.get('/admin/products', common.restrict, async (req, res, next) => {
    // undone
    try{
        let topProducts = await ProductService.getLatestAddedProduct();
        res.render('products', {
            title: 'Cart',
            top_results: topProducts,
            admin: true,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers
        });
    }catch(err){
        res.render('products', {
            title: 'Cart',
            top_results: {},
            admin: true,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers
        });
    }
});

router.get('/admin/products/filter/:search', (req, res, next) => {
    const db = req.app.db;
    let searchTerm = req.params.search;
    let productsIndex = req.app.productsIndex;

    let lunrIdArray = [];
    productsIndex.search(searchTerm).forEach((id) => {
        lunrIdArray.push(common.getId(id.ref));
    });

    // we search on the lunr indexes
    db.products.find({_id: {$in: lunrIdArray}}).toArray((err, results) => {
        if(err){
            console.error(colors.red('Error searching', err));
        }
        res.render('products', {
            title: 'Results',
            results: results,
            admin: true,
            config: req.app.config,
            session: req.session,
            searchTerm: searchTerm,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers
        });
    });
});

// insert form
router.get('/admin/product/new', common.restrict, common.checkAccess, (req, res) => {
    res.render('product_new', {
        title: 'New product',
        session: req.session,
        product: common.clearSessionValue(req.session, 'product'),
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        editor: true,
        admin: true,
        helpers: req.handlebars.helpers
    });
});

// insert new product form action
router.post('/admin/product/insert', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let{isProductExist, product, newProductId} = await ProductService.insertProduct(req, res);
        req.session.product = product;
        if(isProductExist){
            req.session.message = 'Permalink already exists. Pick a new one.';
            req.session.messageType = 'danger';
            // redirect to insert
            res.redirect('/admin/insert');
        }
        req.session.message = 'New product successfully created';
        req.session.messageType = 'success';

        // redirect to new doc
        res.redirect('/admin/product/edit/' + newProductId);
    }catch(err){
        console.log(colors.red('Error inserting document: ' + err));

        // keep the current stuff
        req.session.message = 'Error: Inserting product';
        req.session.messageType = 'danger';
        req.session.product = ProductRequestProcessor.getRawRequestProduct(req, res);
        // redirect to insert
        res.redirect('/admin/product/new');
    }
});

// render the editor
router.get('/admin/product/edit/:id', common.restrict, common.checkAccess, (req, res) => {
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
            helpers: req.handlebars.helpers
        });
    });
});

// Update an existing product form action
router.post('/admin/product/update', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let product = await ProductService.updateProduct(req, res);
        let redirectUrl = UrlServices.getUrlToEditProduct(product.productId);
        req.session.message = Enums.PRODUCT_SUCCESSFULLY_SAVED;
        req.session.messageType = Enums.SUCCESS;
        req.session.product = product;
        res.redirect(redirectUrl);
    }catch(err){
        let redirectUrl = UrlServices.getUrlToEditProduct(req.session.productId);
        switch(err.message){
            case Enums.PRODUCT_NOT_IN_REDIS:
                req.session.message = Enums.PRODUCT_ID_INVALID;
                req.session.product = common.clearSessionValue(req.session, 'product');
                redirectUrl = UrlServices.getUrlToAddNewProduct();
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
router.get('/admin/product/delete/:id', common.restrict, common.checkAccess, ProductService.validateProductId, async (req, res) => {
    try{
        // image deleting logic not written
        await ProductService.deleteProduct(req, res);
        req.session.message = Enums.PRODUCT_SUCCESSFULLY_DELETED;
        req.session.messageType = Enums.SUCCESS;
        common.clearSessionValue(req.session, 'product');
        res.redirect(UrlServices.getUrlToAllProducts());
    }catch(err){
        req.session.message = Enums.ERROR_PRODUCT_DELETION;
        req.session.messageType = Enums.DANGER;
        res.redirect(UrlServices.getUrlToAllProducts());
        throw err;
    }
});

// update the published state based on an ajax call from the frontend
router.post('/admin/product/published_state', common.restrict, common.checkAccess, (req, res) => {
    const db = req.app.db;

    db.products.update({_id: common.getId(req.body.id)}, {$set: {productPublished: req.body.state}}, {multi: false}, (err, numReplaced) => {
        if(err){
            console.error(colors.red('Failed to update the published state: ' + err));
            res.status(400).json('Published state not updated');
        }else{
            res.status(200).json('Published state updated');
        }
    });
});

// set as main product image
router.post('/admin/product/setasmainimage', common.restrict, common.checkAccess, async (req, res) => {
    try{
        // image saving logic not present
        await ProductService.updateProduct(req, res);
        res.status(200).json({message: 'Main image successfully set'});
    }catch(err){
        res.status(400).json({message: 'Unable to set as main image. Please try again.'});
    }
});

// deletes a product image
router.post('/admin/product/deleteimage', common.restrict, common.checkAccess, (req, res) => {
    const db = req.app.db;

    // get the productImage from the db
    db.products.findOne({_id: common.getId(req.body.product_id)}, (err, product) => {
        if(err){
            console.info(err.stack);
        }
        if(req.body.productImage === product.productImage){
            // set the produt_image to null
            db.products.update({_id: common.getId(req.body.product_id)}, {$set: {productImage: null}}, {multi: false}, (err, numReplaced) => {
                if(err){
                    console.info(err.stack);
                }
                // remove the image from disk
                fs.unlink(path.join('public', req.body.productImage), (err) => {
                    if(err){
                        res.status(400).json({message: 'Image not removed, please try again.'});
                    }else{
                        res.status(200).json({message: 'Image successfully deleted'});
                    }
                });
            });
        }else{
            // remove the image from disk
            fs.unlink(path.join('public', req.body.productImage), (err) => {
                if(err){
                    res.status(400).json({message: 'Image not removed, please try again.'});
                }else{
                    res.status(200).json({message: 'Image successfully deleted'});
                }
            });
        }
    });
});

module.exports = router;
