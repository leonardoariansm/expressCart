const config = require('config');

class UrlService{
    static getProductUrl(){
        let protocol = config.get('products.protocol');
        let host = config.get('products.host');
        let port = config.get('products.port');
        return protocol + '://' + host + ':' + port;
    }
    static getDefaultUrl(){
        let protocol = config.get('default.protocol');
        let host = config.get('default.host');
        let port = config.get('default.port');
        let path = config.get('default.path');
        return protocol + '://' + host + ':' + port + '/' + path;
    }

    static getUrlToAddNewProduct(){
        return UrlService.getProductUrl() + '/' + config.get('products.paths.addNewProduct');
    }

    static getUrlToEditProduct(productId){
        return UrlService.getProductUrl() + '/' + config.get('products.paths.editProduct') + '/' + productId.toString();
    }

    static getUrlToAllProducts(){
        return UrlService.getProductUrl() + '/' + config.get('products.path.allProduct');
    }
}

module.exports = UrlService;
