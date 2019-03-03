'use strict';

class staticFunctions{
    static convertToString(msg){
        if(typeof msg === 'string'){
            return msg;
        }
        return JSON.stringify(msg);
    }

    static convertToBool(msg){
        if(msg === 'true'){
            return true;
        }
        return false;
    }

    static isEmpty(value){
        if(value === undefined || value === null){
            return true;
        }
        if((typeof value === 'number' && !isNaN(value)) || typeof value === 'boolean'){
            return false;
        }
        let count = 0;
        for(let key in value){
            if(value.hasOwnProperty(key)){
                count++;
            }
        }
        return count === 0;
    }

    static isNotEmpty(value){
        return!(staticFunctions.isEmpty(value));
    }

    static isInputAnArray(value){
        return Array.isArray(value);
    }

    static isInputNotAnArray(value){
        return!(Array.isArray(value));
    }

    static isNumber(value){
        return(typeof value === 'number' && !isNaN(value));
    }

    static getCloneObject(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    static getRandomInt(min, max){
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static checkIsSetOrNot(value){
        if(staticFunctions.isEmpty(value))return false;
        if(!(['true', 'false', '1', '0', true, false, 0, 1].includes(value))){
           return false;
        }
        return!!JSON.parse(value);
    }

    static getNonEmptyValue(values){
        for(let value of values){
            if(staticFunctions.isNotEmpty(value))return value;
        }
        return null;
    }
}

module.exports = staticFunctions;
