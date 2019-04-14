const RedisKeys = require('../Redis/RedisKeys');
const RedisUtils = require('../Redis/RedisUtils');
const promise = require('bluebird');
const crypto = require('crypto');
const config = require('config');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const randtoken = require('rand-token');
const Enums = require('../models/Enums');
const MangoUtils = require('../utilities/MangoUtils');
const StaticFunctions = require('../utilities/staticFunctions');
const{CustomerValidator} = require('./validator/CustomerValidator');
const{CustomerRequestProcessor} = require('../RequestProcessor/CustomerRequestProcessor');
const{CustomerIndexingService} = require('./Indexing/CustomerIndexingService');

class CustomerService{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
        this.redisKeys = RedisKeys;
        this.redisUtils = RedisUtils;
        this.mangoUtils = MangoUtils;
        this.customerRequestProcessor = CustomerRequestProcessor;
        this.customerValidator = CustomerValidator;
        this.enums = Enums;
        this.customerIndexingService = CustomerIndexingService;
    }
    static getKeyValuesUserPairArray(Customers){
        return new promise((resolve, reject) => {
            let redisKeysValues = {};
            Customers.find({}).toArray((err, CustomersList) => {
                if(err){
                    console.error(colors.red(err.stack));
                    reject(err);
                }
                CustomersList.forEach((Customer) => {
                    let CustomerId = Customer.email;
                    redisKeysValues[RedisKeys.getCustomerDetailsRedisKeys(CustomerId)] = JSON.stringify(Customer);
                });
            });
            resolve(redisKeysValues);
        });
    }

    static async getTopCustomer(){
        let topNCustomers = config.get('customers.topNCustomers');
        let customerIds = await this.redisUtils.getSortedSetRangeByScoreReverse(this.redisKeys.getCustomerRedisKeys(), Date.now(), null, [0, topNCustomers]);
        let multi = this.redisUtils.queueSuccessiveCommands();
        if(customerIds.length === 0){
            throw Error(this.enums.NONE_CUSTOMER_EXISTS);
        }
        for(let customerId of customerIds){
            this.redisUtils.getAllValueFromHash(this.redisKeys.getCustomerDetailsKey(customerId), multi);
        }
        let result = await this.redisUtils.executeQueuedCommands(multi);
        return result;
    }

    static async insertCustomer(req, res){
        try{
            let currentTimeInMs = Date.now();
            let customer = await this.customerRequestProcessor.getRawRequestCustomer(req, res);
            customer.customerId = await this.getCustomerID(customer);
            let isValidCustomer = await this.customerValidator.isValidCustomer(customer);
            if(this.staticFunctions.checkIsSetOrNot(isValidCustomer) !== true){
                throw Error(this.enums.INVALID_CUSTOMER_DETAILS);
            }
            let customerScore = await this.redisUtils.getSortedSetScoreByMember(this.redisKeys.getCustomerRedisKeys(), customer.customerId);
            if(this.staticFunctions.isNotEmpty(customerScore)){
                throw Error(this.enums.CUSTOMER_ALREADY_EXIST);
            }
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.setValueInSortedSet(this.redisKeys.getCustomerRedisKeys(), currentTimeInMs, customer.customerId, multi);
            this.redisUtils.set(this.redisKeys.getCustomerIdAndEmailMappingKey(customer.email), customer.customerId, -1, multi);
            this.redisUtils.set(this.redisKeys.getCustomerIdAndPhoneNoMappingKey(customer.phone), customer.customerId, -1, multi);
            this.redisUtils.setMultipleValuesInHash(this.redisKeys.getCustomerDetailsKey(customer.customerId), customer, multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.insert(customer, this.enums.customerCollectionName));
            tasks.push(this.customerIndexingService.indexCustomer(customer));
            await promise.all(tasks);
            return customer;
        }catch(err){
            throw err;
        }
    }

    static async updateCustomerEmail(req, res, customerId, email){
        try{
            if(this.staticFunctions.isEmpty(email)){
                throw Error('Error customer Email empty');
            }
            let currentEmail = await this.redisUtils.getValueFromHash(this.redisKeys.getCustomerDetailsKey(customerId), 'email');
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.delete(this.redisKeys.getCustomerIdAndEmailMappingKey(currentEmail), multi);
            this.redisUtils.set(this.redisKeys.getCustomerIdAndEmailMappingKey(email), customerId, -1, multi);
            this.redisUtils.setValueInHash(this.redisKeys.getCustomerDetailsKey(customerId), 'email', email, multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.updateDocument({customerId: customerId}, {email: email}, this.enums.customerCollectionName));
            tasks.push(this.customerIndexingService.indexCustomerEmail(customerId, currentEmail, email));
            await promise.all(tasks);
            return true;
        }catch(err){
            throw err;
        }
    }

    static async updateCustomerPassword(req, res, email, password){
        try{
            if(this.staticFunctions.isEmpty(email) || this.staticFunctions.isEmpty(password)){
                throw Error('Error customer Email or password empty');
            }
            let customerId = await this.redisUtils.get(this.redisKeys.getCustomerIdAndEmailMappingKey(email));
            let tasks = [];
            tasks.push(this.redisUtils.setValueInHash(this.redisKeys.getCustomerDetailsKey(customerId), 'password', bcrypt.hashSync(password, 10)));
            tasks.push(this.mangoUtils.updateDocument({customerId: customerId}, {password: password}, this.enums.customerCollectionName));
            await promise.all(tasks);
            return true;
        }catch(err){
            throw err;
        }
    }

    static async getCustomerByCustomerId(customerId){
        try{
            if(this.staticFunctions.isEmpty(customerId)){
                throw Error(this.enums.CUSTOMER_ID_EMPTY);
            }
            let isCustomerExist = await this.redisUtils.getSortedSetScoreByMember(this.redisKeys.getCustomerRedisKeys(), customerId);
            if(isCustomerExist === null || isCustomerExist === undefined){
                throw Error(this.enums.CUSTOMER_NOT_EXIST);
            }
            let customer = await this.redisUtils.getAllValueFromHash(this.redisKeys.getCustomerDetailsKey(customerId));
            return customer;
        }catch(err){
            throw err;
        }
    }

    static async getCustomerByEmail(email){
        try{
            if(this.staticFunctions.isEmpty(email)){
                throw Error(this.enums.CUSTOMER_EMAIL_EMPTY);
            }
            let customerId = await this.redisUtils.get(this.redisKeys.getCustomerIdAndEmailMappingKey(email));
            let customer = await this.getCustomerByCustomerId(customerId);
            return customer;
        }catch(err){
            throw err;
        }
    }

    static async validateCustomerEmailAndPassword(email, password){
        try{
            let customer = await this.getCustomerByEmail(email);
            let isValid = await bcrypt.compare(password, customer.password);
            if(!isValid){
                throw Error(this.enums.INVALID_PASSWORD);
            }
            return customer;
        }catch(err){
            throw err;
        }
    }

    static async forgotAction(email){
        try{
            let tokenExpiry = Date.now();
            let tokenExpireTime = config.get('customers.tokenExpiryTime');
            let passwordToken = randtoken.generate(30);
            let customer = await this.getCustomerByEmail(email);
            let id = {customerId: customer.customerId};
            let doc = {resetToken: passwordToken, resetTokenExpiry: tokenExpiry};
            let tasks = [];
            tasks.push(this.redisUtils.set(this.redisKeys.getCustomerPasswordTokenKey(passwordToken), customer.email, tokenExpireTime));
            tasks.push(this.mangoUtils.updateDocument(id, doc, this.enums.customerCollectionName));
            // tasks.push(this.customerIndexingService.indexCustomer(customer));
            let result = await promise.all(tasks);
            customer.passwordToken = passwordToken;
            customer.tokenExpiry = tokenExpiry;
            return customer;
        }catch(err){
            throw err;
        }
    }

    static async isValidToken(token){
        try{
            let email = await this.redisUtils.get(this.redisKeys.getCustomerPasswordTokenKey(token));
            let isValidToken = this.staticFunctions.isNotEmpty(email);
            if(isValidToken === null || isValidToken === undefined){
                throw Error(this.enums.INVALID_TOKEN);
            }
            return email;
        }catch(e){
            console.log('Error: isValidToken function');
            throw e;
        }
    }

    static async getCustomerID(customer){
        return crypto.createHash('md5').update(customer.email).digest('hex');
    }
}

module.exports = {
    dependencies: CustomerService.injectStaticDependencies(),
    CustomerService: CustomerService
};
