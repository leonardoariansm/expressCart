const express = require('express');
const common = require('../lib/common');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const url = require('url');
const router = express.Router();
const UserServices = require('../classes/services/UserServices');
const MangoUtils = require('../classes/utilities/MangoUtils');

router.get('/admin/users', common.restrict, async (req, res) => {
    let users = await UserServices.getAllUsers();
    res.render('users', {
        title: 'Users',
        users: users,
        admin: true,
        config: req.app.config,
        isAdmin: req.session.isAdmin,
        helpers: req.handlebars.helpers,
        session: req.session,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType')
    });
});

// edit user
router.get('/admin/user/edit/:id', common.restrict, (req, res) => {
    const db = req.app.db;
    db.users.findOne({_id: common.getId(req.params.id)}, (err, user) => {
        if(err){
            console.info(err.stack);
        }
        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.userEmail !== req.session.user && req.session.isAdmin === false){
            req.session.message = 'Access denied';
            req.session.messageType = 'danger';
            res.redirect('/Users/');
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
    });
});

// users new
router.get('/admin/user/new', common.restrict, (req, res) => {
    res.render('user_new', {
        title: 'User - New',
        admin: true,
        session: req.session,
        helpers: req.handlebars.helpers,
        message: common.clearSessionValue(req.session, 'message'),
        messageType: common.clearSessionValue(req.session, 'messageType'),
        config: req.app.config
    });
});

// delete user
router.get('/admin/user/delete/:id', common.restrict, (req, res) => {
    const db = req.app.db;
    if(req.session.isAdmin === true){
        db.users.remove({_id: common.getId(req.params.id)}, {}, (err, numRemoved) => {
            if(err){
                console.info(err.stack);
            }
            req.session.message = 'User deleted.';
            req.session.messageType = 'success';
            res.redirect('/admin/users');
        });
    }else{
        req.session.message = 'Access denied.';
        req.session.messageType = 'danger';
        res.redirect('/admin/users');
    }
});

// update a user
// router.post('/admin/user/update', common.restrict, async (req, res) => {
//     try{
//         await UserServices.UpdateUser();
//     }catch(err){
//         console.log(colors.red('Error in updating Product'));
//         console.log(err.stack);
//         throw err;
//     }
//     const db = req.app.db;
//
//     let isAdmin = req.body.user_admin === 'on';
//
//     // get the user we want to updatecac
//     db.users.findOne({_id: common.getId(req.body.userId)}, (err, user) => {
//         if(err){
//             console.info(err.stack);
//         }
//
//         // If the current user changing own account ensure isAdmin retains existing
//         if(user.userEmail === req.session.user){
//             isAdmin = user.isAdmin;
//         }
//
//         // if the user we want to edit is not the current logged in user and the current user is not
//         // an admin we render an access denied message
//         if(user.userEmail !== req.session.user && req.session.isAdmin === false){
//             req.session.message = 'Access denied';
//             req.session.messageType = 'danger';
//             res.redirect('/admin/users/');
//             return;
//         }
//
//         // create the update doc
//         let updateDoc = {};
//         updateDoc.isAdmin = isAdmin;
//         updateDoc.usersName = req.body.usersName;
//         if(req.body.userPassword){
//             updateDoc.userPassword = bcrypt.hashSync(req.body.userPassword);
//         }
//
//         db.users.update({_id: common.getId(req.body.userId)},
//             {
//                 $set: updateDoc
//             }, {multi: false}, (err, numReplaced) => {
//                 if(err){
//                     console.error(colors.red('Failed updating user: ' + err));
//                     req.session.message = 'Failed to update user';
//                     req.session.messageType = 'danger';
//                     res.redirect('/admin/user/edit/' + req.body.userId);
//                 }else{
//                     // show the view
//                     req.session.message = 'User account updated.';
//                     req.session.messageType = 'success';
//                     res.redirect('/admin/user/edit/' + req.body.userId);
//                 }
//             });
//     });
// });

// insert a user
router.post('/admin/user/insert', common.restrict, async (req, res) => {
    try{
        await UserServices.InsertProduct(req, res);
    }catch(err){
        console.log(colors.red('errors in inserting product'));
        console.log(colors.red(err.stack));
        throw err;
    }
});

module.exports = router;
