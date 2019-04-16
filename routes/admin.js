const express = require('express');
const common = require('../lib/common');
const escape = require('html-entities').AllHtmlEntities;
const colors = require('colors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const glob = require('glob');
const config = require('config');
const mime = require('mime-type/with-db');
const router = express.Router();
const{UserServices} = require('../classes/services/UserServices');
const StaticFunctions = require('../classes/utilities/staticFunctions');
const{AdminServices} = require('../classes/services/AdminServices');
const{PageServices} = require('../classes/services/PageServices');
const{FileService} = require('../classes/services/FileServices');

const configSettings = config.get('settings');

// Admin section
router.get('/admin', common.restrict, (req, res, next) => {
    res.redirect('/admin/products');
});

// logout
router.get('/admin/logout', (req, res) => {
    req.session.user = null;
    req.session.message = null;
    req.session.messageType = null;
    res.redirect('/');
});

// login form
router.get('/admin/login', async (req, res) => {
    try{
        delete req.session.user;
        delete req.session.customer;
        let numOfUsers = await UserServices.getUserPresentCount();
        if(StaticFunctions.isNotEmpty(numOfUsers) && numOfUsers > 0){
            req.session.needsSetup = false;
            res.render('login', {
                title: 'Login',
                referringUrl: req.header('Referer'),
                route: 'admin',
                message: common.clearSessionValue(req.session, 'message'),
                messageType: common.clearSessionValue(req.session, 'messageType'),
                helpers: req.handlebars.helpers,
                showFooter: 'showFooter',
                config: configSettings
            });
        }else{
            req.session.needsSetup = true;
            res.redirect('/admin/setup');
        }
    }catch(err){
        req.session.needsSetup = true;
        res.redirect('/admin/setup');
    }
});

// login the user and check the password
router.post('/admin/login_action', async (req, res) => {
    try{
        let result = await UserServices.validateLoginRequest(req, res);
        let isValidLoginRequest = result.isValidLoginRequest;
        let message = result.message;
        let userDetails = result.userDetails;
        if(StaticFunctions.isNotEmpty(isValidLoginRequest) && isValidLoginRequest === true){
            req.session.user = userDetails;
            res.status(200).json(message);
        }else{
            req.session.messageType = 'danger';
            req.session.message = result.message;
            res.status(200).json(message);
        }
    }catch(e){
        console.log('Error: /admin/login_action route');
        res.status(200).json({});
    }
});

// setup form is shown when there are no users setup in the DB
router.get('/admin/setup', async (req, res) => {
    try{
        let userCount = await UserServices.getUserPresentCount();
        if(userCount === 0){
            req.session.needsSetup = true;
            res.render('setup', {
                title: 'Setup',
                helpers: req.handlebars.helpers,
                message: common.clearSessionValue(req.session, 'message'),
                messageType: common.clearSessionValue(req.session, 'messageType'),
                showFooter: 'showFooter',
                route: 'admin',
                config: configSettings
            });
        }else{
            res.redirect('/admin/login');
        }
    }catch(err){
        console.error(colors.red('Error getting users for setup', err));
    }
});

// insert a user
router.post('/admin/setup_action', async (req, res) => {
    try{
        let userCount = await UserServices.getUserPresentCount();
        if(userCount === 0){
            await UserServices.insertUser(req, res);
            req.session.message = 'User account inserted';
            req.session.messageType = 'success';
            res.redirect('/admin/login');
        }else res.redirect('/admin/login');
    }catch(err){
        console.error(colors.red('Failed to insert user: ' + err));
        req.session.message = 'Setup failed';
        req.session.messageType = 'danger';
        res.redirect('/admin/setup');
    }
});

// settings update
// router.get('/admin/settings', common.restrict, (req, res) => {
//     res.render('settings', {
//         title: 'Cart settings',
//         session: req.session,
//         admin: true,
//         themes: common.getThemes(),
//         message: common.clearSessionValue(req.session, 'message'),
//         messageType: common.clearSessionValue(req.session, 'messageType'),
//         helpers: req.handlebars.helpers,
//         config: configSettings,
//         footerHtml: typeof configSettings.footerHtml !== 'undefined' ? escape.decode(configSettings.footerHtml) : null,
//         googleAnalytics: typeof configSettings.googleAnalytics !== 'undefined' ? escape.decode(configSettings.googleAnalytics) : null
//     });
// });
//
// // settings update
// router.post('/admin/settings/update', common.restrict, common.checkAccess, (req, res) => {
//     // Not done
//     let result = common.updateConfig(req.body);
//     if(result === true){
//         res.status(200).json({message: 'Settings successfully updated'});
//         res.configDirty = true;
//         return;
//     }
//     res.status(400).json({message: 'Permission denied'});
// });
//
// // settings update
// router.post('/admin/settings/option/remove', common.restrict, common.checkAccess, (req, res) => {
//     const db = req.app.db;
//     db.products.findOne({_id: common.getId(req.body.productId)}, (err, product) => {
//         if(err){
//             console.info(err.stack);
//         }
//         if(product && product.productOptions){
//             let optJson = JSON.parse(product.productOptions);
//             delete optJson[req.body.optName];
//
//             db.products.update({_id: common.getId(req.body.productId)}, {$set: {productOptions: JSON.stringify(optJson)}}, (err, numReplaced) => {
//                 if(err){
//                     console.info(err.stack);
//                 }
//                 if(numReplaced.result.nModified === 1){
//                     res.status(200).json({message: 'Option successfully removed'});
//                 }else{
//                     res.status(400).json({message: 'Failed to remove option. Please try again.'});
//                 }
//             });
//         }else{
//             res.status(400).json({message: 'Product not found. Try saving before removing.'});
//         }
//     });
// });

// settings update
router.get('/admin/settings/menu', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let menu = await AdminServices.getMenu();
        res.render('settings_menu', {
            title: 'Cart menu',
            session: req.session,
            admin: true,
            route: 'admin',
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: configSettings,
            menu: menu
        });
    }catch(err){
        console.log('error in menu loading');
        res.render('settings_menu', {
            title: 'Cart menu',
            session: req.session,
            admin: true,
            route: 'admin',
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            helpers: req.handlebars.helpers,
            config: configSettings,
            menu: []
        });
    }
});

// settings page list
// router.get('/admin/settings/pages', common.restrict, (req, res) => {
//     try{
//         let pages = PageServices.getAllPages();
//     }catch(e){
//
//     }
//     const db = req.app.db;
//     db.pages.find({}).toArray(async (err, pages) => {
//         if(err){
//             console.info(err.stack);
//         }
//
//         res.render('settings_pages', {
//             title: 'Static pages',
//             pages: pages,
//             session: req.session,
//             admin: true,
//             message: common.clearSessionValue(req.session, 'message'),
//             messageType: common.clearSessionValue(req.session, 'messageType'),
//             helpers: req.handlebars.helpers,
//             config: req.app.config,
//             menu: common.sortMenu(await common.getMenu())
//         });
//     });
// });
//
// // settings pages new
// router.get('/admin/settings/pages/new', common.restrict, common.checkAccess, async (req, res) => {
//     res.render('settings_page_edit', {
//         title: 'Static pages',
//         session: req.session,
//         admin: true,
//         button_text: 'Create',
//         message: common.clearSessionValue(req.session, 'message'),
//         messageType: common.clearSessionValue(req.session, 'messageType'),
//         helpers: req.handlebars.helpers,
//         config: configSettings,
//         menu: common.sortMenu(await common.getMenu())
//     });
// });
//
// // settings pages editor
// router.get('/admin/settings/pages/edit/:page', common.restrict, common.checkAccess, (req, res) => {
//     const db = req.app.db;
//     db.pages.findOne({_id: common.getId(req.params.page)}, async (err, page) => {
//         if(err){
//             console.info(err.stack);
//         }
//         // page found
//         const menu = common.sortMenu(await common.getMenu(db));
//         if(page){
//             res.render('settings_page_edit', {
//                 title: 'Static pages',
//                 page: page,
//                 button_text: 'Update',
//                 session: req.session,
//                 admin: true,
//                 message: common.clearSessionValue(req.session, 'message'),
//                 messageType: common.clearSessionValue(req.session, 'messageType'),
//                 helpers: req.handlebars.helpers,
//                 config: req.app.config,
//                 menu
//             });
//         }else{
//             // 404 it!
//             res.status(404).render('error', {
//                 title: '404 Error - Page not found',
//                 config: req.app.config,
//                 message: '404 Error - Page not found',
//                 helpers: req.handlebars.helpers,
//                 showFooter: 'showFooter',
//                 menu
//             });
//         }
//     });
// });
//
// // settings update page
// router.post('/admin/settings/pages/update', common.restrict, common.checkAccess, (req, res) => {
//     const db = req.app.db;
//
//     let doc = {
//         pageName: req.body.pageName,
//         pageSlug: req.body.pageSlug,
//         pageEnabled: req.body.pageEnabled,
//         pageContent: req.body.pageContent
//     };
//
//     if(req.body.page_id){
//         // existing page
//         db.pages.findOne({_id: common.getId(req.body.page_id)}, (err, page) => {
//             if(err){
//                 console.info(err.stack);
//             }
//             if(page){
//                 db.pages.update({_id: common.getId(req.body.page_id)}, {$set: doc}, {}, (err, numReplaced) => {
//                     if(err){
//                         console.info(err.stack);
//                     }
//                     res.status(200).json({message: 'Page updated successfully', page_id: req.body.page_id});
//                 });
//             }else{
//                 res.status(400).json({message: 'Page not found'});
//             }
//         });
//     }else{
//         // insert page
//         db.pages.insert(doc, (err, newDoc) => {
//             if(err){
//                 res.status(400).json({message: 'Error creating page. Please try again.'});
//             }else{
//                 res.status(200).json({message: 'New page successfully created', page_id: newDoc._id});
//             }
//         });
//     }
// });
//
// // settings delete page
// router.get('/admin/settings/pages/delete/:page', common.restrict, common.checkAccess, (req, res) => {
//     const db = req.app.db;
//     db.pages.remove({_id: common.getId(req.params.page)}, {}, (err, numRemoved) => {
//         if(err){
//             req.session.message = 'Error deleting page. Please try again.';
//             req.session.messageType = 'danger';
//             res.redirect('/admin/settings/pages');
//             return;
//         }
//         req.session.message = 'Page successfully deleted';
//         req.session.messageType = 'success';
//         res.redirect('/admin/settings/pages');
//     });
// });

// new menu item
router.post('/admin/settings/menu/new', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let isInserted = await AdminServices.insertMenuItem(req, res);
        if(isInserted === false){
            req.session.message = 'Failed creating menu.';
            req.session.messageType = 'danger';
        }
    }catch(err){
        req.session.message = 'Failed creating menu.';
        req.session.messageType = 'danger';
    }
    res.redirect('/admin/settings/menu');
});

// update existing menu item
router.post('/admin/settings/menu/update', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let isUpdated = await AdminServices.updateMenuItems(req, res);
        if(isUpdated === false){
            req.session.message = 'Failed updating menu.';
            req.session.messageType = 'danger';
        }
    }catch(err){
        req.session.message = 'Failed updating menu.';
        req.session.messageType = 'danger';
    }
    res.redirect('/admin/settings/menu');
});

// delete menu item
router.get('/admin/settings/menu/delete/:menuid', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let menuItemRank = req.params.menuid;
        let itemId = await AdminServices.getMenuItemIdByRank(menuItemRank);
        let result = await AdminServices.deleteMenuItem(itemId);
        if(result === false){
            req.session.message = 'Failed deleting menu.';
            req.session.messageType = 'danger';
        }
    }catch(err){
        req.session.message = 'Failed deleting menu.';
        req.session.messageType = 'danger';
    }
    res.redirect('/admin/settings/menu');
});

// We call this via a Ajax call to save the order from the sortable list
router.post('/admin/settings/menu/save_order', common.restrict, common.checkAccess, async (req, res) => {
    try{
        let result = await AdminServices.updateOrderOfMenu();
        if(result === false){
            res.status(400).json({message: 'Failed saving menu order'});
            return;
        }
        res.status(200);
    }catch(err){
        res.status(400).json({message: 'Failed saving menu order'});
    }
});

// validate the permalink
router.post('/admin/api/validate_permalink', async (req, res) => {
    // if doc id is provided it checks for permalink in any products other that one provided,
    // else it just checks for any products with that permalink
    try{
        let validateResult = await AdminServices.validatePermaLink(req, res);
        res.status(validateResult.status).send(validateResult.message);
    }catch(err){
        console.log(colors.red(err.message));
        console.log(colors.red(err.static));
        throw err;
    }
});

// upload the file
let upload = multer({dest: 'public/uploads/'});
router.post('/admin/file/upload', common.restrict, common.checkAccess, upload.single('upload_file'), async (req, res, next) => {
    let file = req.file;
    try{
        if(req.file){
            let result = await FileService.uploadFile(req, res, file);
            if(result){
                req.session.message = 'File uploaded successfully';
                req.session.messageType = 'success';
                res.redirect('/admin/product/edit/' + req.body.productId);
            }else{
                req.session.message = 'File uploaded successfully';
                req.session.messageType = 'success';
                res.redirect('/admin/product/edit/' + req.body.productId);
            }
        }else{
            // delete the temp file.
            fs.unlinkSync(file.path);

            // Redirect to error
            req.session.message = 'File upload error. Please select a file.';
            req.session.messageType = 'danger';
            res.redirect('/admin/product/edit/' + req.body.productId);
        }
    }catch(e){
        req.session.message = 'File upload error. Please select a file.';
        req.session.messageType = 'danger';
        res.redirect('/admin/product/edit/' + req.body.productId);
    }
});

router.post('/admin/testEmail', common.restrict, (req, res) => {
    let config = configSettings;
    // TODO: Should fix this to properly handle result
    common.sendEmail(config.emailAddress, 'expressCart test email', 'Your email settings are working');
    res.status(200).json({message: 'Test email sent'});
});

// delete a file via ajax request
router.post('/admin/file/delete', common.restrict, common.checkAccess, async (req, res) => {
    req.session.message = null;
    req.session.messageType = null;

    try{
        let result = await FileService.removeFile(req, res);
        if(result){
            res.writeHead(200, {'Content-Type': 'application/text'});
            res.end('File deleted successfully');
            return;
        }
        console.error(colors.red('File delete error'));
        res.writeHead(200, {'Content-Type': 'application/text'});
        res.end('Failed to delete file');
    }catch(e){
        console.error(colors.red('File delete error'));
        res.writeHead(200, {'Content-Type': 'application/text'});
        res.end('Failed to delete file');
    }
});

router.get('/admin/files', common.restrict, async (req, res) => {
    // loop files in /public/uploads/
    try{
        let result = await FileService.getAllFiles();
        res.render('files', {
            title: 'Files',
            files: result.fileList,
            admin: true,
            dirs: result.dirList,
            session: req.session,
            config: configSettings,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            route: 'admin'
        });
    }catch(e){
        res.render('files', {
            title: 'Files',
            files: [],
            admin: true,
            dirs: [],
            session: req.session,
            config: configSettings,
            message: common.clearSessionValue(req.session, 'message'),
            messageType: common.clearSessionValue(req.session, 'messageType'),
            route: 'admin'
        });
    }
});

module.exports = router;
