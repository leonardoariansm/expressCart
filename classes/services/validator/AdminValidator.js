const promise = require('bluebird');
const StaticFunctions = require('../../utilities/staticFunctions');

class AdminValidator{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
    }

    static async validateMenuItem(menuItem){
        let tasks = [];
        tasks.push(this.validateTitle(menuItem));
        tasks.push(this.validateLink(menuItem));
        tasks.push(this.validateID(menuItem));
        let result = await promise.all(tasks);
        let isValidMenuItem = true;
        for(let key in result){
            if(!result[key]){
                isValidMenuItem = false;
                break;
            }
        }
        return isValidMenuItem;
    }

    static async validateID(menuItem){
        return this.staticFunctions.isNotEmpty(menuItem.itemId);
    }

    static async validateTitle(menuItem){
        return this.staticFunctions.isNotEmpty(menuItem.title);
    }

    static async validateLink(menuItem){
        return this.staticFunctions.isNotEmpty(menuItem.link);
    }
}

module.exports = {
    dependencies: AdminValidator.injectStaticDependencies(),
    AdminValidator: AdminValidator
};
