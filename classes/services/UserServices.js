const promise = require('bluebird');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const url = require('url');
const MangoUtils = require('../utilities/MangoUtils');
const RedisUtils = require('../Redis/RedisUtils');
const RedisKeys = require('../Redis/RedisKeys');
const LunrFullTextSearching = require('./LunrFullTextSearching');
const StaticFunctions = require('../utilities/staticFunctions');

class UserServices{
    static getKeyValuesUserPairArray(users){
        return new promise((resolve, reject) => {
            let redisKeysValues = {};
            users.find({}).toArray((err, usersList) => {
                if(err){
                    console.error(colors.red(err.stack));
                    reject(err);
                }
                usersList.forEach((user) => {
                    let userEmail = user.userEmail;
                    redisKeysValues[RedisKeys.getUserDetailsRedisKeys(userEmail)] = JSON.stringify(user);
                });
            });
            resolve(redisKeysValues);
        });
    }

    static async getAllUsers(){
        let result = [];
        let users = await RedisUtils.getAllValueFromHash(RedisKeys.getUserRedisKeys());
        for(let userKey in users){
            result.push(JSON.parse(users[userKey]));
        }
        return result;
    }

    static async getUserPresentCount(){
        return RedisUtils.getKeyCount(RedisKeys.getUserCountRedisKeys());
    }

    static async validateLoginRequest(req, res){
        try{
            let userEmail = req.body.email;
            let userDetails = await RedisUtils.getValueFromHash(RedisKeys.getUserRedisKeys(), RedisKeys.getUserDetailsRedisKeys(userEmail));
            userDetails = JSON.parse(userDetails);
            return new promise((resolve, reject) => {
                if(StaticFunctions.isNotEmpty(userDetails)){
                    bcrypt.compare(req.body.password, userDetails.userPassword)
                        .then((result) => {
                            resolve({isValidLoginRequest: result, message: 'Login successful', userDetails: userDetails});
                        })
                        .catch((err) => {
                            reject(err);
                        });
                }else{
                    resolve({isValidLoginRequest: false, message: 'A user with that email does not exist.', userDetails: userDetails});
                }
            });
        }catch(err){
            console.error(colors.red(err.stack));
            return new promise((resolve, reject) => {
               resolve({isValidLoginRequest: false, message: 'A user with that email does not exist.', userDetails: null});
            });
        }
    }

    static async InsertProduct(req, res){
        let that = this;
        try{
            let results = await promise.all([that.getUserPresentCount(), RedisUtils.exists(RedisKeys.getUserRedisKeys(), RedisKeys.getUserDetailsRedisKeys(req.body.userEmail))]);
            let numOfUsers = (results.length >= 1 && StaticFunctions.isNotEmpty(results[0])) ? results[0] : 0;
            let exists = (results.length >= 2 && StaticFunctions.isNotEmpty(results[1])) ? results[1] : false;
            let isAdmin = StaticFunctions.isNotEmpty(numOfUsers) ? (!((numOfUsers > 0))) : false;
            let doc = {
                usersName: req.body.usersName,
                userEmail: req.body.userEmail,
                userPassword: bcrypt.hashSync(req.body.userPassword, 10),
                isAdmin: isAdmin
            };
            if(exists){
                console.error(colors.red('Failed to insert user, possibly already exists: '));
                req.session.message = 'A user with that email address already exists';
                req.session.messageType = 'danger';
                res.redirect('/admin/user/new');
                return;
            }
            let data = await promise.all([MangoUtils.insert(doc, 'users'), RedisUtils.setValueInHash(RedisKeys.getUserRedisKeys(), RedisKeys.getUserDetailsRedisKeys(doc.userEmail), JSON.stringify(doc))]);
            let urlParts = url.parse(req.header('Referer'));
            if(StaticFunctions.isNotEmpty(data[0]) && data[0].sessionMessageType === 'success'){
                if(urlParts.path === '/admin/setup'){
                    req.session.message = data[0].sessionMessage;
                    req.session.messageType = data[0].sessionMessageType;
                    res.redirect('/admin/login');
                    return;
                }
                if(numOfUsers === 0){
                    await RedisUtils.setKeyCount(RedisKeys.getUserCountRedisKeys(), 1);
                }else await RedisUtils.incrementKey(RedisKeys.getUserCountRedisKeys());
                res.redirect(data[0].redirectUrl);
            }else{
                console.log(colors.red(data[0].error));
                req.session.message = data[0].sessionMessage;
                req.session.messageType = data[0].sessionMessageType;
                res.redirect(data[0].redirectUrl);
            }
            return;
        }catch(err){
            console.log(colors.red('Error in inserting Product'));
            throw err;
        }
    }

    // static async UpdateUser(req, res){
    //     try{
    //         let exists = await RedisUtils.exists(RedisKeys.getUserRedisKeys(), RedisKeys.getUserDetailsRedisKeys(req.body.userEmail));
    //         // why this Admin calculate this way
    //         let isAdmin = req.body.user_admin === 'on';
    //         if(exists){
    //             let tasks = [];
    //             let doc = {
    //                 usersName: req.body.usersName,
    //                 userEmail: req.body.userEmail,
    //                 userPassword: bcrypt.hashSync(req.body.userPassword, 10),
    //                 isAdmin: isAdmin
    //             };
    //             tasks.push(RedisUtils.getValueFromHash(RedisKeys.getUserRedisKeys(), RedisKeys.getUserDetailsRedisKeys(req.body.userEmail)));
    //             tasks.push(MangoUtils.updateProduct(req.body.userEmail, doc));
    //         }else{
    //
    //         }
    //     }catch(err){
    //
    //     }
    // }
}

module.exports = UserServices;
