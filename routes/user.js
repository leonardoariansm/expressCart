const express = require('express');
const common = require('../lib/common');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const url = require('url');
const router = express.Router();
const Enums = require('../classes/models/Enums');
const AdminUrls = require('../classes/UrlService/AdminUrls');
const UserUrls = require('../classes/UrlService/UserUrls');
const StaticFunction = require('../classes/utilities/staticFunctions');
const{UserServices} = require('../classes/services/UserServices');
const MangoUtils = require('../classes/utilities/MangoUtils');

router.get('/admin/users', common.restrict, common.checkAccess, async (req, res) => {
    let users = await UserServices.getAllUsers();
    res.render('users', {
        title: 'Users',
        users: users,
        admin: true,
        route: 'admin',
        config: req.app.config,
        isAdmin: req.session.user.isAdmin,
        helpers: req.handlebars.helpers,
        session: req.session,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType')
    });
});

// edit user
router.get('/admin/user/edit/:id', common.restrict, async (req, res) => {
    try{
        let userId = req.params.id;
        let{isExist, user} = await UserServices.getUser(userId);
        if(!isExist){
            req.session.message = Enums.INVALID_USER_ID;
            req.session.messageType = Enums.DANGER;
            res.redirect(UserUrls.getUrlToAllUsers());
            return;
        }
        let sessionUserId = (req.session.user && req.session.user.userId);
        let sessionUserIsAdmin = (req.session.user && req.session.user.isAdmin);
        if(user.userId !== sessionUserId && StaticFunction.checkIsSetOrNot(sessionUserIsAdmin) === false){
            req.session.message = Enums.ACCESS_DENIED;
            req.session.messageType = Enums.DANGER;
            res.redirect(UserUrls.getUrlToAllUsers());
            return;
        }
        res.render('user_edit', {
            title: 'User edit',
            user: user,
            admin: true,
            route: 'admin',
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }catch(err){
        req.session.message = Enums.USER_DETAILS_NOT_FOUND;
        req.session.messageType = Enums.DANGER;
        res.redirect(UserUrls.getUrlToAllUsers());
    }
});

// users new
router.get('/admin/user/new', common.restrict, common.checkAccess, (req, res) => {
    res.render('user_new', {
        title: 'User - New',
        admin: true,
        route: 'admin',
        session: req.session,
        helpers: req.handlebars.helpers,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        config: req.app.config
    });
});

// delete user
router.get('/admin/user/delete/:id', common.restrict, async (req, res) => {
    try{
        let sessionUserId = (req.session.user && req.session.user.userId);
        let sessionUserIsAdmin = (req.session.user && req.session.user.isAdmin);
        let userId = req.params.id;
        if(userId !== sessionUserId && sessionUserIsAdmin === false){
            req.session.message = Enums.ACCESS_DENIED;
            req.session.messageType = Enums.DANGER;
            res.redirect(UserUrls.getUrlToAllUsers());
            return;
        }
        let isExist = await UserServices.deleteUser(userId);
        if(isExist){
            req.session.message = Enums.USER_SUCCESSFULLY_DELETED;
            req.session.messageType = Enums.SUCCESS;
            res.redirect(UserUrls.getUrlToAllUsers());
            return;
        }
        req.session.message = Enums.INVALID_USER_ID;
        req.session.messageType = Enums.DANGER;
        res.redirect(UserUrls.getUrlToAllUsers());
    }catch(err){
        req.session.message = Enums.USER_DELETION_FAILED;
        req.session.messageType = Enums.DANGER;
        if(StaticFunction.isNotEmpty(req.param.id)){
            res.redirect(UserUrls.getUrlToDeleteUser(req.param.id));
        }
        throw Error(Enums.INVALID_USER_ID);
    }
});

// update a user
router.post('/admin/user/update', common.restrict, async (req, res) => {
    try{
        let sessionUserId = (req.session.user && req.session.user.userId);
        let sessionUserIsAdmin = StaticFunction.checkIsSetOrNot(req.session.user && req.session.user.isAdmin);
        let userId = req.body.userId;
        if(userId !== sessionUserId && sessionUserIsAdmin !== true){
            req.session.message = Enums.ACCESS_DENIED;
            req.session.messageType = Enums.DANGER;
            res.redirect(UserUrls.getUrlToAllUsers());
            return;
        }
        let{isExist, user} = await UserServices.updateUser(req, res, userId);
        req.session.message = Enums.USER_SUCCESSFULLY_UPDATED;
        req.session.messageType = Enums.SUCCESS;
        if(!isExist){
            req.session.message = Enums.INVALID_USER_ID;
            req.session.messageType = Enums.DANGER;
            res.redirect(UserUrls.getUrlToAllUsers());
            return;
        }
        res.render('user_edit', {
            title: 'User edit',
            user: user,
            admin: true,
            session: req.session,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: req.app.config
        });
    }catch(err){
        req.session.message = Enums.USER_UPDATION_FAILED;
        req.session.messageType = Enums.DANGER;
        res.redirect(UserUrls.getUrlToAllUsers());
    }
});

// insert a user
router.post('/admin/user/insert', common.restrict, async (req, res) => {
    try{
        let{isExist, user} = await UserServices.insertUser(req, res);
        let urlPath = url.parse(!StaticFunction.isNotEmpty(req.headers['Referer']) ? '' : req.headers['Referer']);
        let redirectUrl = urlPath === AdminUrls.getAdminSetUpUrl() ? AdminUrls.getAdminLoginUrl() : UserUrls.getUrlToAllUsers();
        req.session.message = Enums.USER_SUCCESSFULLY_SAVED;
        req.session.messageType = Enums.SUCCESS;
        if(isExist){
            req.session.message = Enums.USER_EMAIL_ALREADY_IN_USE;
            req.session.messageType = Enums.DANGER;
            redirectUrl = UserUrls.getUrlToEditUser(user.userId);
        }
        res.redirect(redirectUrl);
    }catch(err){
        req.session.message = err.message;
        req.session.messageType = Enums.DANGER;
        res.redirect(UserUrls.getUrlToAddNewUser());
    }
});

module.exports = router;
