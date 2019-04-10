const RedisUtils = require('../Redis/RedisUtils');
const RedisKeys = require('../Redis/RedisKeys');
const crypto = require('crypto');
const StaticFunctions = require('../utilities/staticFunctions');
const Enums = require('../models/Enums');
const promise = require('bluebird');
const MangoUtils = require('../utilities/MangoUtils');
const{AdminValidator} = require('./validator/AdminValidator');
const{AdminRequestProcessor} = require('../RequestProcessor/AdminRequestProcessor');

class AdminServices{
    static async injectStaticDependencies(){
        this.redisUtils = RedisUtils;
        this.redisKeys = RedisKeys;
        this.staticFuntions = StaticFunctions;
        this.adminRequestProcessor = AdminRequestProcessor;
        this.mangoUtils = MangoUtils;
        this.enums = Enums;
        this.adminValidator = AdminValidator;
    }

    static async validatePermaLink(req, res){
        let currentLinkedProductId = await this.redisUtils.get(this.redisKeys.getProductPermaLinkRediskey(req.body.permalink));
        let productId = req.session.product && req.session.product.productId;
        if(StaticFunctions.isNotEmpty(currentLinkedProductId) && currentLinkedProductId !== productId){
            return{status: 400, message: Enums.PRODUCT_PERMALINK_ALREADY_EXIST};
        }
        return{status: 200, message: Enums.PRODUCT_PERMALINK_SUCCESSFULLY_VALIDATED};
    }

    static async insertMenuItem(req, res, menuItem){
        try{
            let newMenuItem = this.adminRequestProcessor.getRawRequestMenuItem(req, res);
            newMenuItem.itemId = this.getMenuItemID(newMenuItem);
            if(this.staticFuntions.isNotEmpty(menuItem)) newMenuItem = menuItem;
            let isValidMenuItem = await this.adminValidator.validateMenuItem(newMenuItem);
            let isExist = await this.redisUtils.get(this.redisKeys.getMenuItemTitleToIdMappingKey(newMenuItem.title));
            if(isValidMenuItem !== true || this.staticFuntions.isNotEmpty(isExist)){
                return false;
            }
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.set(this.redisKeys.getMenuItemTitleToIdMappingKey(newMenuItem.title), newMenuItem.itemId, -1, multi);
            this.redisUtils.setValueInSortedSet(this.redisKeys.getMenuItemKey(), Date.now(), newMenuItem.itemId, multi);
            this.redisUtils.setMultipleValuesInHash(this.redisKeys.getMenuItemDetailsKey(newMenuItem.itemId), newMenuItem, multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.insert(newMenuItem, this.enums.menuCollectionName));
            await promise.all(tasks);
            return true;
        }catch(err){
            console.log('Error creating new menu', err);
            throw err;
        }
    }

    static async getMenu(req, res){
        try{
            let menu = {};
            let menuItemIds = [];
            let menuItemsScoreAndIds = await this.redisUtils.getSortedSetRangeAndScoreByScore(this.redisKeys.getMenuItemKey(), Date.now(), null);
            if(this.staticFuntions.isEmpty(menuItemsScoreAndIds)){
                return null;
            }
            for(let k = 0; k < menuItemsScoreAndIds.length; k += 2){
                menuItemIds.push(menuItemsScoreAndIds[k]);
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            for(let key in menuItemIds){
                this.redisUtils.getAllValueFromHash(this.redisKeys.getMenuItemDetailsKey(menuItemIds[key]), multi);
            }
            let items = await this.redisUtils.executeQueuedCommands(multi);
            if(this.staticFuntions.isEmpty(items))return menu;
            menu.items = items;
            return menu;
        }catch(e){
            return null;
        }
    }

    static async updateMenuItems(req, res){
        try{
            let menuItem = this.adminRequestProcessor.getRawRequestMenuItem(req, res);
            let currentTitle = req.body.navId;
            if(this.staticFuntions.isEmpty(currentTitle))return false;
            let menuItemId = await this.redisUtils.get(this.redisKeys.getMenuItemTitleToIdMappingKey(currentTitle));
            menuItem.itemId = menuItemId;
            if(this.staticFuntions.isEmpty(menuItemId))return false;
            let currentMenuItem = await this.redisUtils.getAllValueFromHash(this.redisKeys.getMenuItemDetailsKey(menuItemId));
            let updatedMenuItem = this.getUpdatedMenuItem(menuItem, currentMenuItem);
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.delete(this.redisKeys.getMenuItemTitleToIdMappingKey(currentMenuItem.title), multi);
            this.redisUtils.set(this.redisKeys.getMenuItemTitleToIdMappingKey(updatedMenuItem.title), updatedMenuItem.itemId, -1, multi);
            this.redisUtils.setMultipleValuesInHash(this.redisKeys.getMenuItemDetailsKey(menuItemId), updatedMenuItem, multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.updateDocument({itemId: menuItemId}, updatedMenuItem, this.enums.menuCollectionName));
            await promise.all(tasks);
            return true;
        }catch(err){
            console.log('error in updating menu');
            return false;
        }
    }

    static async deleteMenuItem(itemId){
        try{
            if(this.staticFuntions.isEmpty(itemId))return true;
            let tasks = [];
            let multi = this.redisUtils.queueSuccessiveCommands();
            let menuItem = await this.redisUtils.getAllValueFromHash(this.redisKeys.getMenuItemDetailsKey(itemId));
            if(this.staticFuntions.isEmpty(menuItem))return true;
            this.redisUtils.delete(this.redisKeys.getMenuItemTitleToIdMappingKey(menuItem.title), multi);
            this.redisUtils.removeToSortedSet(this.redisKeys.getMenuItemKey(), menuItem.itemId, multi);
            this.redisUtils.delete(this.redisKeys.getMenuItemDetailsKey(menuItem.itemId), multi);
            tasks.push(this.redisUtils.executeQueuedCommands(multi));
            tasks.push(this.mangoUtils.deleteDocument({itemId: menuItem.itemId}, this.enums.menuCollectionName));
            promise.all(tasks);
            return true;
        }catch(err){
            console.log('Error in deleting object');
            return false;
        }
    }

    static async getMenuItemIdByRank(rank){
        try{
            if(this.staticFuntions.isEmpty(rank))return null;
            let itemId = await this.redisUtils.getSortedSetRangeAndScoreByScore(this.redisKeys.getMenuItemKey(), null, null, [rank, 1]);
            if(this.staticFuntions.isEmpty(itemId))return null;
            return itemId[0];
        }catch(err){
            return null;
        }
    }

    static async updateOrderOfMenu(req, res){
        try{
            let menu = await this.getMenu(req, res);
            let menuItems = menu.items;
            if(this.staticFuntions.isEmpty(menuItems))return false;
            let navIds = req.body.navId;
            if(this.staticFuntions.isEmpty(navIds))return false;
            let titleToMenuItemIdMapping = {};
            for(let key in menuItems){
                titleToMenuItemIdMapping[menuItems[key].title] = menuItems[key].itemId;
            }
            let multi = this.redisUtils.queueSuccessiveCommands();
            this.redisUtils.delete(this.redisKeys.getMenuItemKey(), multi);
            for(let key in navIds){
                this.redisUtils.setValueInSortedSet(this.redisKeys.getMenuItemKey(), key, titleToMenuItemIdMapping[navIds[key]], multi);
            }
            await this.redisUtils.executeQueuedCommands(multi);
            return true;
        }catch(err){
            throw err;
        }
    }

    static getUpdatedMenuItem(menuItem, currentMenuItem){
        for(let key in menuItem){
            if(menuItem.hasOwnProperty(key) && this.staticFuntions.isEmpty(menuItem[key])){
                menuItem[key] = currentMenuItem[key];
            }
        }
        return menuItem;
    }

    static getMenuItemID(newMenuItem){
        return crypto.createHash('md5').update(newMenuItem.title).digest('hex');
    }
}

module.exports = {
    dependencies: AdminServices.injectStaticDependencies(),
    AdminServices: AdminServices
};
