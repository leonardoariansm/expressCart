const config = require('config');
const colors = require('colors');
const mongodbUri = require('mongodb-uri');
const promise = require('bluebird');
const mangoClient = require('mongodb').MongoClient;
const constants = require('./Constants');
const Enums = require('../models/Enums');
const StaticFunctions = require('../utilities/staticFunctions');

let dbInstance = null;

class MangoUtils{
    static connectMangoDb(mangodbConnectionString, constants){
        return promise.resolve(() => {
            if(dbInstance === null){
                mangoClient.connect(mangodbConnectionString, (err, client) => {
                    if(err){
                        console.log(colors.red('Error connecting to MongoDB: ' + err));
                        process.exit(2);
                    }
                    let dbObjUri = mongodbUri.parse(mangodbConnectionString);
                    if(process.env.NODE_ENV === constants.LIVE){
                        dbInstance = client.db(dbObjUri.database);
                    }else{
                        dbInstance = client.db('testing');
                    }
                });
            }
            return dbInstance;
        });
    }

    static async getMangoDbInstance (){
        try{
            if(StaticFunctions.isNotEmpty(dbInstance))return dbInstance;
            let mangodbConnectionString = config.get('DataBase.databaseConnectionString');
            let dbConnectFunction = await MangoUtils.connectMangoDb(mangodbConnectionString, constants);
            let maxRetry = constants.MAX_RETRY_MANGO_CONNECTION;
            let dbConnection = new promise((resolve, reject) => {
                let interval = setInterval(() => {
                    if(maxRetry < 0){
                        clearInterval(interval);
                        throw Error('Connection Error');
                    }
                    if(dbConnectFunction() !== null){
                        resolve(dbConnectFunction());
                        clearInterval(interval);
                    }
                    maxRetry--;
                }, 1000);
            });
            return await dbConnection;
        }catch(err){
            colors.red(err.stack);
            throw err;
        }
    }

    static async insert(document, collectionName){
        let that = this;
        let collection = that.getDbCollection(collectionName);
        let result = await new promise((resolve, reject) => {
            if(collection !== null && collection !== undefined){
                collection.insert(document, (err, doc) => {
                    if(err){
                        if(doc){
                            resolve({
                                error: 'Failed to insert user: ' + err,
                                sessionMessage: 'User exists',
                                sessionMessageType: 'danger',
                                redirectUrl: '/admin/user/edit/' + doc._id
                            });
                            return;
                        }
                        resolve({
                            error: 'Failed to insert user: ' + err,
                            sessionMessage: 'New user creation failed',
                            sessionMessageType: 'danger',
                            redirectUrl: '/admin/user/new'
                        });
                    }
                });
                resolve({
                    error: null,
                    sessionMessage: 'User account inserted',
                    sessionMessageType: 'success',
                    redirectUrl: '/admin/users'
                });
            }else{
                reject(null);
            }
        });
        return result;
    }

    static getDbCollection(collectionName){
        let collection = null;
        switch(collectionName){
            case Enums.userCollectionName:
                collection = dbInstance.users;
                break;
            case Enums.customerCollectionName:
                collection = dbInstance.customers;
                break;
            case Enums.productCollectionName:
                collection = dbInstance.products;
                break;
            case Enums.orderCollectionName:
                collection = dbInstance.orders;
                break;
            case Enums.pageCollectionName:
                collection = dbInstance.pages;
                break;
        }
        return collection;
    }

    static async updateDocument(id, document, collectionName){
        let that = this;
        let dbCollection = that.getDbCollection(collectionName);
        return new promise((resolve, reject) => {
            dbCollection.update({productId: id}, {$set: document}, {multi: false}, (err, product) => {
                if(err){
                    console.info(err.stack);
                    reject(err);
                }
                resolve(1);
            });
        });
    }

    static async deleteDocument(id, collectionName){
        let that = this;
        let dbCollection = that.getDbCollection(collectionName);
        return new promise((resolve, reject) => {
            dbCollection.remove({productId: id}, (err, numRemoved) => {
                if(err){
                    console.info(err.stack);
                    reject(err);
                }
                resolve(numRemoved);
            });
        });
    }
}

module.exports = MangoUtils;
