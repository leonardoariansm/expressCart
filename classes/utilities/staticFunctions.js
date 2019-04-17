'use strict';
const colors = require('colors');
const config = require('config');
const nodemailer = require('nodemailer');

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
        if((typeof value === 'number' && !isNaN(value)) || typeof value === 'boolean' || typeof value === 'string'){
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

    static getCloneObject(obj, notNeededObjProperty){
        let cloneObj = {};
        for(let key in obj){
            if(obj.hasOwnProperty(key) && !(this.isNotEmpty(notNeededObjProperty) && notNeededObjProperty.includes(key))){
                cloneObj[key] = obj[key];
            }
        }
        return cloneObj;
    }

    static getRandomInt(min, max){
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static checkIsSetOrNot(value){
        if(staticFunctions.isEmpty(value))return false;
        if(!(['true', 'false', '1', '0', true, false, 0, 1].includes(value))){
           return false;
        }
        return(!!JSON.parse(value));
    }

    static getNonEmptyValue(values){
        for(let value of values){
            if(this.isNotEmpty(value))return value;
        }
        return null;
    }

    static async sendEmail(emailOptions){
        let to = emailOptions.to;
        let subject = emailOptions.subject;
        let body = emailOptions.body;
        let config = this.getConfig();

        let emailSettings = {
            service: 'gmail',
            auth: {
                user: config.emailUser,
                pass: config.emailPassword
            }
            // host: config.emailHost,
            // port: config.emailPort,
            // secure: config.emailSecure,
            // auth: {
            //     user: config.emailUser,
            //     pass: config.emailPassword
            // }
        };

        // outlook needs this setting
        // if(config.emailHost === 'smtp-mail.outlook.com'){
        //     emailSettings.tls = {ciphers: 'SSLv3'};
        // }

        let transporter = nodemailer.createTransport(emailSettings);

        let mailOptions = {
            from: config.emailAddress, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            html: body// html body
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if(error){
                return console.error(colors.red(error));
            }
            return true;
        });
    }

    static getConfig(){
        return config.get('settings');
    }

    static getPhrases(searchTerm, delimeter){
        delimeter = this.isEmpty(delimeter) ? ' ' : delimeter;
        if(this.isEmpty(searchTerm))return[];
        let keywords = [];
        searchTerm.split(delimeter).forEach(keyword => {
            keywords.push(keyword.trim().toLowerCase());
        });
        let phrases = [...keywords];
        let prevKeyword = keywords[0];
        for(let key in keywords){
            if(key > 0){
                phrases.push(prevKeyword + ' ' + keywords[key]);
                prevKeyword += ' ' + keywords[key];
            }
        }
        return phrases;
    }

    static getKeywords(searchTerm, delimeter){
        delimeter = this.isEmpty(delimeter) ? ' ' : delimeter;
        if(this.isEmpty(searchTerm))return[];
        let keywords = [];
        searchTerm.split(delimeter).forEach(keyword => {
            keywords.push(keyword.trim().toLowerCase());
        });
        return keywords;
    }

    static getUnique(array1, array2){
        if(this.isEmpty(array1))return array2;
        else if(this.isEmpty(array2))return array1;
        let set1 = new Set(array1);
        let set2 = new Set(array2);
        let union = new Set([...set1, ...set2]);
        return[...union];
    }
}

module.exports = staticFunctions;
