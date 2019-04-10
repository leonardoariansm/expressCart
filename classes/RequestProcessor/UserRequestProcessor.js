const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Enums = require('../models/Enums');
const StaticFunctions = require('../utilities/staticFunctions');

class UserRequestProcessor{
    static getRawRequestUser(req, res){
        let user = {
            userId: req.body.userId,
            usersName: req.body.usersName,
            userEmail: req.body.userEmail,
            userPassword: (StaticFunctions.isNotEmpty(req.body.userPassword)) ? bcrypt.hashSync(req.body.userPassword, 10) : null,
            isAdmin: req.body.user_admin === 'on'
        };
        return user;
    }

    static getRawRequestUserId(req, res){
        return req.body.userId;
    }
}

module.exports = UserRequestProcessor;
