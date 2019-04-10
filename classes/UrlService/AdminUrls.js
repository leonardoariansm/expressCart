const config = require('config');

class AdminUrls{
    static getAdminUrl(){
        let protocol = config.get('admins.protocol');
        let host = config.get('admins.host');
        let port = config.get('admins.port');
        return protocol + '://' + host + ':' + port;
    }
    static getDefaultUrl(){
        let protocol = config.get('default.protocol');
        let host = config.get('default.host');
        let port = config.get('default.port');
        let path = config.get('default.path');
        return protocol + '://' + host + ':' + port + '/' + path;
    }

    static getUrlToAddNewAdmin(){
        return this.getAdminUrl() + '/' + config.get('admins.paths.addNewAdmin');
    }

    static getUrlToEditAdmin(AdminId){
        return this.getAdminUrl() + '/' + config.get('admins.paths.aAdmin') + '/' + AdminId.toString();
    }

    static getUrlToAllAdmins(){
        return this.getAdminUrl() + '/' + config.get('admins.path.allAdmin');
    }

    static getAdminSetUpUrl(){
        return this.getAdminUrl() + '/' + config.get('admins.paths.setup');
    }

    static getAdminLoginUrl(){
        return this.getAdminUrl() + '/' + config.get('admins.paths.login');
    }
}

module.exports = AdminUrls;
