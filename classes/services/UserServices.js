const promise = require('bluebird');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const MangoUtils = require('../utilities/MangoUtils');
const RedisUtils = require('../Redis/RedisUtils');
const RedisKeys = require('../Redis/RedisKeys');
const Enums = require('../models/Enums');
const crypto = require('crypto');
const StaticFunctions = require('../utilities/staticFunctions');
const{UserValidator} = require('./validator/UserValidator');
const UserRequestProcessor = require('../RequestProcessor/UserRequestProcessor');

class UserServices{
    static injectStaticDependencies(){
        this.mangoUtils = MangoUtils;
        this.redisUtils = RedisUtils;
        this.redisKeys = RedisKeys;
        this.enums = Enums;
        // this.lunrFullTextSearching = LunrFullTextSearching;
        this.staticFunctions = StaticFunctions;
        this.userRequestProcessor = UserRequestProcessor;
        this.userValidator = UserValidator;
    }
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
                    redisKeysValues[this.redisKeys.getUserDetailsRedisKey(userEmail)] = JSON.stringify(user);
                });
            });
            resolve(redisKeysValues);
        });
    }

    static async getAllUsers(){
        let topUserIds = await this.redisUtils.getAllSetMembers(this.redisKeys.getUserRedisKeys());
        let multi = this.redisUtils.queueSuccessiveCommands();
        for(let userId of topUserIds){
            this.redisUtils.getAllValueFromHash(this.redisKeys.getUserDetailsRedisKey(userId), multi);
        }
        let users = await this.redisUtils.executeQueuedCommands(multi);
        return users;
    }

    static async getUserPresentCount(){
        return this.redisUtils.getSetSize(this.redisKeys.getUserRedisKeys());
    }

    static async getUserByEmail(email){
        try{
            if(this.staticFunctions.isEmpty(email)){
                throw Error('Error: Empty user Email');
            }
            let userId = await this.redisUtils.get(this.redisKeys.getUserEmailToUserIdMappingKey(email));
            let user = await this.redisUtils.getAllValueFromHash(this.redisKeys.getUserDetailsRedisKey(userId));
            return user;
        }catch(e){
            console.log('Error: getUserByEmail function');
            throw e;
        }
    }

    static async validateLoginRequest(req, res){
        try{
            let userDetails = await this.getUserByEmail(req.body.email);
            let isValid = await bcrypt.compare(req.body.password, userDetails.userPassword);
            if(this.staticFunctions.checkIsSetOrNot(isValid) === true){
                return{
                    isValidLoginRequest: true,
                    message: 'Login successful',
                    userDetails: userDetails
                };
            }
            return{
                isValidLoginRequest: false,
                message: 'A user with that email and password does not exist.',
                userDetails: userDetails
            };
        }catch(err){
            console.error(colors.red(err.stack));
            return new promise((resolve, reject) => {
                resolve({
                    isValidLoginRequest: false,
                    message: 'A user with that email does not exist.',
                    userDetails: null
                });
            });
        }
    }

    static async insertUser(req, res){
        let that = this;
        try{
            let rawRequestUser = this.userRequestProcessor.getRawRequestUser(req, res);
            let isValidUserDetails = this.userValidator.isValidUserRequest(rawRequestUser);
            if(!isValidUserDetails){
                throw Error(this.enums.INVALID_USER_DETAILS);
            }
            rawRequestUser.userId = await this.getUserId(rawRequestUser);
            let results = await promise.all([that.getUserPresentCount(), this.redisUtils.isSetMember(this.redisKeys.getUserRedisKeys(), rawRequestUser.userId)]);
            let numOfUsers = (results.length >= 1 && this.staticFunctions.isNotEmpty(results[0])) ? results[0] : 0;
            let exists = (results.length >= 2 && this.staticFunctions.isNotEmpty(results[1])) ? results[1] : false;
            rawRequestUser.isAdmin = !!((rawRequestUser.isAdmin || numOfUsers === 0));
            if(!exists){
                let tasks = [];
                let multi = this.redisUtils.queueSuccessiveCommands();
                this.redisUtils.set(this.redisKeys.getUserEmailToUserIdMappingKey(rawRequestUser.userEmail), rawRequestUser.userId, -1, multi);
                this.redisUtils.addToSet(this.redisKeys.getUserRedisKeys(), rawRequestUser.userId, multi);
                this.redisUtils.setMultipleValuesInHash(this.redisKeys.getUserDetailsRedisKey(rawRequestUser.userId), rawRequestUser, multi);
                tasks.push(this.mangoUtils.insert(rawRequestUser, this.enums.userCollectionName));
                tasks.push(this.redisUtils.executeQueuedCommands(multi));
                await promise.all(tasks);
            }
            return{
                isExist: exists,
                user: rawRequestUser
            };
        }catch(err){
            console.log(colors.red(this.enums.UNHANDLED_EXCEPTION));
            throw err;
        }
    }

    static async updateUser(req, res, userId){
        try{
            let rawRequestUser = this.userRequestProcessor.getRawRequestUser(req, res);
            rawRequestUser.userId = userId;
            let isExist = this.redisUtils.isSetMember(this.redisKeys.getUserRedisKeys(), rawRequestUser.userId);
            if(isExist){
                let currentUser = await this.redisUtils.getAllValueFromHash(this.redisKeys.getUserDetailsRedisKey(rawRequestUser.userId));
                let updatedUser = this.getUpdatedUserRecord(rawRequestUser, currentUser);
                let isValidUserDetails = await this.userValidator.isValidUserRequest(updatedUser);
                if(!isValidUserDetails){
                    throw Error(this.enums.INVALID_USER_DETAILS);
                }
                let multi = this.redisUtils.queueSuccessiveCommands();
                if(currentUser.userEmail !== updatedUser.userEmail){
                    this.redisUtils.delete(this.redisKeys.getUserEmailToUserIdMappingKey(currentUser.userEmail), multi);
                    this.redisUtils.set(this.redisKeys.getUserEmailToUserIdMappingKey(rawRequestUser.userEmail), rawRequestUser.userId, -1, multi);
                }
                this.redisUtils.setMultipleValuesInHash(this.redisKeys.getUserDetailsRedisKey(updatedUser.userId), updatedUser, multi);
                let tasks = [];
                tasks.push(this.mangoUtils.updateDocument({userId: updatedUser.userId}, updatedUser, Enums.userCollectionName));
                tasks.push(this.redisUtils.executeQueuedCommands(multi));
                await promise.all(tasks);
            }
            return{
                isExist: isExist,
                user: rawRequestUser
            };
        }catch(err){
            throw err;
        }
    }

    static async getUser(userId){
        try{
            let user;
            let isExist = await this.redisUtils.isSetMember(this.redisKeys.getUserRedisKeys(), userId);
            if(isExist){
                user = await this.redisUtils.getAllValueFromHash(this.redisKeys.getUserDetailsRedisKey(userId));
            }
            return{
                isExist: isExist,
                user: user
            };
        }catch(err){
            throw err;
        }
    }

    static getUpdatedUserRecord(rawRequestUser, currentUser){
        let user = {
            userId: this.staticFunctions.getNonEmptyValue([rawRequestUser.userId, currentUser.userId]),
            usersName: this.staticFunctions.getNonEmptyValue([rawRequestUser.usersName, currentUser.usersName]),
            userEmail: this.staticFunctions.getNonEmptyValue([rawRequestUser.userEmail, currentUser.userEmail]),
            userPassword: this.staticFunctions.getNonEmptyValue([rawRequestUser.userPassword, currentUser.userPassword]),
            isAdmin: this.staticFunctions.getNonEmptyValue([rawRequestUser.isAdmin, currentUser.isAdmin])
        };
        return user;
    }

    static async deleteUser(userId){
        try{
            let isExist = await this.redisUtils.isSetMember(this.redisKeys.getUserRedisKeys(), userId);
            if(isExist){
                let tasks = [];
                tasks.push(this.redisUtils.removeToSet(this.redisKeys.getUserRedisKeys(), userId));
                tasks.push(this.redisUtils.delete(this.redisKeys.getUserDetailsRedisKey(userId)));
                tasks.push(this.mangoUtils.deleteDocument(userId, this.enums.userCollectionName));
                await promise.all(tasks);
            }
            return isExist;
        }catch(err){
            throw err;
        }
    }

    static async getUserId(user){
        return this.staticFunctions.isNotEmpty(user.userEmail) ? crypto.createHash('md5').update(user.userEmail).digest('hex') : '';
    }
}

module.exports = {
    dependencies: UserServices.injectStaticDependencies(),
    UserServices: UserServices
};
