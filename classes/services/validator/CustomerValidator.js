const promise = require('bluebird');
const StaticFunctions = require('../../utilities/staticFunctions');

class CustomerValidator{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
    }

    static async isValidCustomer(customer){
        let tasks = [];
        tasks.push(this.isValidEmail(customer));
        tasks.push(this.isValidName(customer));
        tasks.push(this.isValidAddress(customer));
        tasks.push(this.isValidCountry(customer));
        tasks.push(this.isValidState(customer));
        tasks.push(this.isValidPostCode(customer));
        tasks.push(this.isValidPhoneNumber(customer));
        tasks.push(this.isValidPassword(customer));
        let result = await promise.all(tasks);
        let isValidCustomer = true;
        for(let key in result){
            if(!result[key]){
                isValidCustomer = false;
                break;
            }
        }
        return isValidCustomer;
    }

    static async isValidEmail(customer){
        if(this.staticFunctions.isNotEmpty(customer.email))return true;
        return false;
    }

    static async isValidName(customer){
        if(this.staticFunctions.isNotEmpty(customer.firstName) && this.staticFunctions.isNotEmpty(customer.lastName))return true;
        return false;
    }

    static async isValidAddress(customer){
        if(this.staticFunctions.isNotEmpty(customer.address1))return true;
        return false;
    }

    static async isValidCountry(customer){
        if(this.staticFunctions.isNotEmpty(customer.country))return true;
        return false;
    }

    static async isValidState(customer){
        if(this.staticFunctions.isNotEmpty(customer.state))return true;
        return false;
    }

    static async isValidPostCode(customer){
        if(this.staticFunctions.isNotEmpty(customer.postcode))return true;
        return false;
    }

    static async isValidPhoneNumber(customer){
        if(this.staticFunctions.isNotEmpty(customer.phone))return true;
        return false;
    }

    static async isValidPassword(customer){
        if(this.staticFunctions.isNotEmpty(customer.password))return true;
        return false;
    }
}

module.exports = {
    dependencies: CustomerValidator.injectStaticDependencies(),
    CustomerValidator: CustomerValidator
};
