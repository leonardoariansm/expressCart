const express = require('express');
const common = require('../lib/common');
const router = express.Router();
const Enums = require('../classes/models/Enums');
const StaticFunctions = require('../classes/utilities/staticFunctions');
const{OrderServices} = require('../classes/services/OrderServices');
const{OrderIndexingService} = require('../classes/services/Indexing/OrderIndexingService');

// Show orders
router.get('/admin/orders', common.restrict, common.checkAccess, async (req, res, next) => {
    try{
        let latestOrders = await OrderServices.getLatestOrders();
        res.render('orders', {
            title: 'Cart',
            orders: latestOrders,
            admin: true,
            route: 'admin',
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }catch(err){
        console.log(err.stack);
    }
});

// Admin section
router.get('/admin/orders/bystatus/:orderstatus', common.restrict, async (req, res, next) => {
    try{
        let orderStatus = req.params.orderstatus;
        if(StaticFunctions.isEmpty(orderStatus)){
            res.redirect('/admin/orders');
            return;
        }
        let topOrderByOrderStatus = await OrderServices.getOrderByOrderStatus(orderStatus);
        res.render('orders', {
            title: 'Cart',
            orders: topOrderByOrderStatus,
            admin: true,
            filteredOrders: true,
            filteredStatus: orderStatus,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }catch(err){
        console.info(err.stack);
    }
});

// render the editor
router.get('/admin/order/view/:id', common.restrict, async (req, res) => {
    try{
        let orderId = req.params.id;
        if(StaticFunctions.isEmpty(orderId)){
            throw Error(Enums.INVALID_ORDER_ID);
        }
        let order = await OrderServices.getOrderDetails(orderId);
        res.render('order', {
            title: 'View order',
            result: order,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            editor: true,
            admin: true,
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }catch(err){
        console.log('Error: /admin/order/view/:id route');
        res.status(404).send({});
    }
});

// Admin section
router.get('/admin/orders/filter/:search', common.restrict, async (req, res, next) => {
    let searchTerm = req.params.search;
    let orders = await OrderIndexingService.getFilteredOrders(searchTerm);
    res.render('orders', {
        title: 'Order results',
        orders: orders,
        admin: true,
        config: req.app.config,
        session: req.session,
        searchTerm: searchTerm,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        helpers: req.handlebars.helpers
    });
});

// order product
router.get('/admin/order/delete/:id', common.restrict, async (req, res) => {
    try{
        let orderId = req.params.id;
        if(StaticFunctions.isEmpty(orderId)){
            throw Error(Enums.INVALID_ORDER_ID);
        }
        await OrderServices.deleteOrder(orderId);
    }catch(err){
        console.info(err.stack);
    }
});

// update order status
router.post('/admin/order/statusupdate', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let status = req.body.status;
        let orderId = req.body.order_id;
        if(StaticFunctions.isEmpty(status)){
            throw Error(Enums.INVALID_ORDER_STATUS);
        }
        if(StaticFunctions.isEmpty(orderId)){
            throw Error(Enums.INVALID_ORDER_ID);
        }
        await OrderServices.updateOrderStatus(orderId, status);
        res.status(200).json({message: 'Status successfully updated'});
    }catch(err){
        switch(err.message){
            case Enums.INVALID_ORDER_ID:
                req.session.message = Enums.INVALID_ORDER_ID;
                break;
            case Enums.INVALID_ORDER_STATUS:
                req.session.message = Enums.INVALID_ORDER_STATUS;
                break;
            default:
                req.session.message = Enums.UNHANDLED_EXCEPTION;
        }
        req.session.messageType = Enums.DANGER;
        res.redirect('/admin/orders');
    }
});

module.exports = router;
