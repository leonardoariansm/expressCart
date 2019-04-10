const{IndexingService} = require('./IndexingService');
const promise = require('bluebird');
const config = require('config');
const colors = require('colors');

class CustomerIndexingService extends IndexingService{
    static injectStaticDependencies(){
        super.injectStaticDependencies(this);
    }

    static async indexCustomer(customer){
        try{
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            if(customer.firstName)this.redisUtils.addToSet(this.redisKeys.getCustomerByFirstNameKey(customer.firstName.trim().toLowerCase()), customer.customerId, multi);
            if(customer.lastName)this.redisUtils.addToSet(this.redisKeys.getCustomerByLastNameKey(customer.lastName.trim().toLowerCase()), customer.customerId, multi);
            if(customer.email)this.redisUtils.addToSet(this.redisKeys.getCustomerByEmailKey(customer.email.trim().toLowerCase()), customer.customerId, multi);
            if(customer.phone)this.redisUtils.addToSet(this.redisKeys.getCustomerByPhoneKey(customer.phone).trim().toLowerCase(), customer.customerId, multi);
            await this.redisUtils.executeQueuedCommands(multi);
            console.log(colors.cyan('- Order indexing complete'));
        }catch(e){
            console.log('Error: indexCustomer function');
        }
    }

    static async indexCustomerEmail(customerId, currentEmail, email){
        try{
            let currentCustomerEmail = this.staticFunctions.isNotEmpty(currentEmail) ? currentEmail : await this.redisUtils.getValueFromHash(this.redisKeys.getCustomerDetailsKey(customerId), 'email');
            await this.redisUtils.removeToSet(this.redisKeys.getCustomerByEmailKey(currentCustomerEmail.trim().toLowerCase()), customerId);
            if(email)await this.redisUtils.addToSet(this.redisKeys.getCustomerByEmailKey(email.trim().toLowerCase()), customerId);
        }catch(e){
            console.log('Error: indexCustomerEmail function');
            throw e;
        }
    }

    static async performCustomerFirstNameOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let customersByCustomerFirstNameKey = that.redisKeys.getCustomerByFirstNameKey(searchCriteria.firstName.trim().toLowerCase());
        context.UnionSet.push(customersByCustomerFirstNameKey);
        return context;
    }

    static async performCustomerLastNameOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let customerByCustomerLastNameKey = that.redisKeys.getCustomerByLastNameKey(searchCriteria.lastName.trim().toLowerCase());
        context.UnionSet.push(customerByCustomerLastNameKey);
        return context;
    }

    static async performCustomerEmailOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let customerByCustomerEmailKey = that.redisKeys.getCustomerByEmailKey(searchCriteria.orderEmail.trim().toLowerCase());
        context.UnionSet.push(customerByCustomerEmailKey);
        return context;
    }

    static async performCustomerPhoneOperation(searchCriteria){
        let that = this;
        let context = {};
        context.keyType = 'union';
        context.isTempKey = false;
        context.intersectionSet = [];
        context.differenceSet = [];
        context.UnionSet = [];
        let customerByCustomerPostcodeKey = that.redisKeys.getCustomerByPhoneKey(searchCriteria.orderPostcode.trim().toLowerCase());
        context.UnionSet.push(customerByCustomerPostcodeKey);
        return context;
    }

    static async getOperationsRedisKeys(searchCriteria){
        let pendingPromise = [];
        pendingPromise.push(this.performCustomerFirstNameOperation(searchCriteria));
        pendingPromise.push(this.performCustomerLastNameOperation(searchCriteria));
        pendingPromise.push(this.performCustomerEmailOperation(searchCriteria));
        pendingPromise.push(this.performCustomerPhoneOperation(searchCriteria));
        let result = await promise.all(pendingPromise);
        return result;
    }

    static async getFilteredCustomers(searchTerm){
        try{
            if(this.staticFunctions.isEmpty(searchTerm))return null;
            let searchCriteria = {};
            searchCriteria.orderPostcode = searchTerm;
            searchCriteria.orderEmail = searchTerm;
            searchCriteria.lastName = searchTerm;
            searchCriteria.firstName = searchTerm;
            let operationRedisKeys = await this.getOperationsRedisKeys(searchCriteria);
            let intersectSet = [];
            let diffSet = [];
            let delSet = [];
            let unionSet = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let key of operationRedisKeys){
                if(key.skipped !== true){
                    intersectSet = intersectSet.concat(key.intersectionSet);
                    diffSet = diffSet.concat(key.differenceSet);
                    unionSet = unionSet.concat(key.UnionSet);
                    if(key.isTempKey) delSet.push(key.keyName);
                }
            }
            let finalKey = 'cstGenericFilterKey:';
            this.redisUtils.setUnionAndStore(finalKey, unionSet, multi);
            this.redisUtils.setInterAndStore(finalKey, intersectSet, multi);
            this.redisUtils.setDifferenceAndStore(finalKey, diffSet, multi);
            this.redisUtils.expireKey(finalKey, 300, multi);
            for(let delKey of delSet){
                this.redisUtils.expireKey(delKey, 10, multi);
            }
            await this.redisUtils.executeQueuedCommands(multi);
            let customerIds = await this.redisUtils.getAllSetMembers(finalKey);
            let customer = await this.getCustomerByCustomerIds(customerIds);
            return customer;
        }catch(e){
            console.log('Error: getFilteredCustomers function');
            throw e;
        }
    }

    static async getCustomerByCustomerIds(customerIds){
        try{
            if(this.staticFunctions.isEmpty(customerIds)){
                throw Error(this.enums.CUSTOMER_ID_EMPTY);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let customerId of customerIds){
                this.redisUtils.getAllValueFromHash(this.redisKeys.getCustomerDetailsKey(customerId), multi);
            }
            let customer = await this.redisUtils.executeQueuedCommands(multi);
            return customer;
        }catch(err){
            throw err;
        }
    }
}

module.exports = {
    dependencies: CustomerIndexingService.injectStaticDependencies(),
    CustomerIndexingService: CustomerIndexingService
};
