const express = require('express');
const router = express.Router();
const colors = require('colors');
const randtoken = require('rand-token');
const bcrypt = require('bcryptjs');
const common = require('../lib/common');
const Enums = require('../classes/models/Enums');
const staticFunctions = require('../classes/utilities/staticFunctions');
const{CustomerExceptionTemplate} = require('../classes/CustomExceptionTemplate/CustomerExceptionTemplate');
const{CustomerService} = require('../classes/services/CustomerService');
const{CustomerIndexingService} = require('../classes/services/Indexing/CustomerIndexingService');

// insert a customer
router.post('/customer/create', async (req, res) => {
    try{
        let customer = await CustomerService.insertCustomer(req, res);
        req.session.customer = customer;
        res.status(200).json({
            message: Enums.CUSTOMER_LOGGED_IN,
            customer: customer
        });
    }catch(err){
        CustomerExceptionTemplate.customerCustomExceptionTemplate(req, res, err);
    }
});

// render the customer view
router.get('/admin/customer/view/:id?', common.restrict, async (req, res) => {
    try{
        let customerId = req.params.id;
        let customer = await CustomerService.getCustomerByCustomerId(customerId);
        res.render('customer', {
            route: 'customer',
            title: 'View customer',
            result: customer,
            admin: true,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            editor: true,
            helpers: req.handlebars.helpers
        });
    }catch(err){
        CustomerExceptionTemplate.customerCustomExceptionTemplate(req, res, err);
    }
});

// customers list
router.get('/admin/customers', common.restrict, common.checkAccess, async (req, res) => {
    try{
        const customers = await CustomerService.getTopCustomer();
        res.render('customers', {
            title: 'Customers - List',
            admin: true,
            customers: customers,
            session: req.session,
            helpers: req.handlebars.helpers,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            route: 'customer'
        });
    }catch(err){
        CustomerExceptionTemplate.customerCustomExceptionTemplate(req, res, err);
    }
});

// Filtered customers list
router.get('/admin/customers/filter/:search', common.restrict, async (req, res, next) => {
    let searchTerm = req.params.search;
    try{
        let customers = await CustomerIndexingService.getFilteredCustomers(searchTerm);
        res.render('customers', {
            title: 'Customer results',
            customers: customers,
            admin: true,
            session: req.session,
            searchTerm: searchTerm,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            route: 'customer',
            helpers: req.handlebars.helpers
        });
    }catch(err){
        console.log('Error: /admin/customers/filter/:search route');
        res.render('customers', {
            title: 'Customer results',
            customers: [],
            admin: true,
            session: req.session,
            searchTerm: searchTerm,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            route: 'customer',
            helpers: req.handlebars.helpers
        });
    }
});

// login the customer and check the password
router.post('/customer/login_action', async (req, res) => {
    try{
        let email = req.body.loginEmail;
        let password = req.body.loginPassword;
        let customer = await CustomerService.validateCustomerEmailAndPassword(email, password);
        req.session.customer = customer;
        res.status(200).json({
            message: 'Successfully logged in',
            customer: customer
        });
    }catch(err){
        CustomerExceptionTemplate.customerCustomExceptionTemplate(req, res, err);
    }
});

router.get('/customer/login', async (req, res) => {
    delete req.session.user;
    delete req.session.customer;
    res.render('login', {
        title: 'Login',
        session: req.session,
        referringUrl: req.header('Referer'),
        forwardUrl: '/customer/login_action',
        route: 'customer',
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        helpers: req.handlebars.helpers,
        showFooter: 'showFooter',
        config: req.app.config
    });
});

router.get('/customer/sign_up', async (req, res) => {
    res.render('signUp', {
        title: 'sign-up',
        route: 'customer',
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        helpers: req.handlebars.helpers,
        showFooter: 'showFooter',
        config: req.app.config
    });
});

// customer forgotten password
router.get('/customer/forgotten', (req, res) => {
    res.render('forgotten', {
        title: 'Forgotten',
        route: 'customer',
        forgotType: 'customer',
        helpers: req.handlebars.helpers,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        showFooter: 'showFooter',
        config: req.app.config
    });
});

// forgotten password
router.post('/customer/forgotten_action', async (req, res) => {
    let responseSent = false;
    try{
        let email = req.body.email;
        let configSettings = req.app.config;
        let customer = await CustomerService.forgotAction(email);
        let isSuccessFullySendEmail = await staticFunctions.sendEmail({
            to: req.body.email,
            subject: 'Forgotten password request',
            body: `You are receiving this because you (or someone else) have requested the reset of the password for your user account.\n\n
                        Please click on the following link, or paste this into your browser to complete the process:\n\n
                        ${configSettings.baseUrl}/customer/reset/${customer.passwordToken}\n\n
                        If you did not request this, please ignore this email and your password will remain unchanged.\n`
        });
        req.session.message = 'An email has been sent to ' + req.body.email + ' with further instructions';
        req.session.messageType = 'success';
        return res.redirect('/customer/forgotten');
    }catch(err){
        console.log('Error: /customer/forgotten_action route');
        req.session.message = 'Account does not exist';
        req.session.messageType = 'danger';
        res.redirect('/customer/forgotten');
    }
});

// reset password form
router.get('/customer/reset/:token', async (req, res) => {
    try{
        let configSettings = req.app.config;
        let token = req.params.token;
        await CustomerService.isValidToken(token);
        res.render('reset', {
            title: 'Reset password',
            token: req.params.token,
            route: 'customer',
            config: configSettings,
            message: common.clearSessionValue(req.session, 'message'),
            message_type: common.clearSessionValue(req.session, 'message_type'),
            show_footer: 'show_footer',
            helpers: req.handlebars.helpers
        });
    }catch(err){
        req.session.message = 'Password reset token is invalid or has expired';
        req.session.message_type = 'danger';
        res.redirect('/forgot');
    }
});
// reset password action
router.post('/customer/reset/:token', async (req, res) => {
    try{
        let token = req.params.token;
        let email = await CustomerService.isValidToken(token);
        let isPasswordSuccessfullyUpdated = await CustomerService.updateCustomerPassword(req, res, email, req.body.password);
        if(isPasswordSuccessfullyUpdated){
            req.session.message = 'Password successfully updated';
            req.session.messageType = 'success';
            res.redirect('/customer/login');
            /* sendEmail function not written */
            staticFunctions.sendEmail({
                to: email,
                subject: 'Password successfully reset',
                body: 'This is a confirmation that the password for your account ' + email + ' has just been changed successfully.\n'
            });
        }else{
            throw Error('Error: isPasswordSuccessfullyUpdated false');
        }
    }catch(err){
        req.session.message = 'Password reset token is invalid or has expired';
        req.session.message_type = 'danger';
        res.redirect('/customer/forgotten');
    }
});

router.get('/customer/logout', (req, res) => {
    req.session.customer = null;
    res.redirect('/');
});
// logout the customer
router.post('/customer/logout', (req, res) => {
    req.session.customer = null;
    res.status(200).json({});
});

module.exports = router;
