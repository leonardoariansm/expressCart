const promise = require('bluebird');
const StaticFunctions = require('../../utilities/staticFunctions');

class UserValidator{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
    }

    static async isValidUserRequest(user){
        let tasks = [];
        let isValid = false;
        tasks.push(this.isValidUserEmail(user));
        tasks.push(this.isValidUserPassword(user));
        tasks.push(this.isValidUserName(user));
        let result = await promise.all(tasks);
        if(this.staticFunctions.isNotEmpty(result) && result.length >= 3){
            isValid = !!(this.staticFunctions.checkIsSetOrNot(result[0]) && this.staticFunctions.checkIsSetOrNot(result[1]) && this.staticFunctions.checkIsSetOrNot(result[2]));
        }
        return isValid;
    }

    static async isValidUserEmail(user){
        return true;
    }

    static async isValidUserPassword(user){
        return true;
    }

    static async isValidUserName(user){
        return true;
    }
}

module.exports = {
    dependencies: UserValidator.injectStaticDependencies(),
    UserValidator: UserValidator
};
