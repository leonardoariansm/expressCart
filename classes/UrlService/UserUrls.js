const config = require('config');

class UserUrls{
    static getUserUrl(){
        let protocol = config.get('users.protocol');
        let host = config.get('users.host');
        let port = config.get('users.port');
        return protocol + '://' + host + ':' + port;
    }
    static getDefaultUrl(){
        let protocol = config.get('default.protocol');
        let host = config.get('default.host');
        let port = config.get('default.port');
        let path = config.get('default.path');
        return protocol + '://' + host + ':' + port + '/' + path;
    }

    static getUrlToAddNewUser(){
        return this.getUserUrl() + '/' + config.get('users.paths.addNewUser');
    }

    static getUrlToEditUser(UserId){
        return this.getUserUrl() + '/' + config.get('users.paths.editUser') + '/' + UserId.toString();
    }

    static getUrlToAllUsers(){
        return this.getUserUrl() + '/' + config.get('users.paths.allUser');
    }

    static getUrlToDeleteUser(UserId){
        return this.getUserUrl() + '/' + config.get('users.paths.deleteUrl') + '/' + UserId.toString();
    }
}

module.exports = UserUrls;
