class RedisKeys{
    static getUserDetailsRedisKeys(email){
        return'user' + `:${email}`;
    }

    static getOrderDetailsRedisKeys(orderId){
        return'order' + `:${orderId}`;
    }

    static getCustomerDetailsRedisKeys(customerEmail){
        return'customer' + `:${customerEmail}`;
    }

    static getPageDetailsRedisKeys(pageId){
        return'page' + `:${pageId}`;
    }

    static getUserRedisKeys(){
        return'user';
    }

    static getUserCountRedisKeys(){
        return'userCnt';
    }

    static getOrderRedisKeys(){
        return'order';
    }

    static getCustomerRedisKeys(){
        return'customer';
    }

    static getPageRedisKeys(){
        return'page';
    }

    static getProductRedisKey(){
        return'product';
    }

    static getProductDetailsRedisKey(productId){
        return this.getProductRedisKey() + ':productId:' + productId;
    }

    static getProductPermaLinkRediskey(productPermaLink){
        return RedisKeys.getProductRedisKey() + ':ppl:' + productPermaLink;
    }
}

module.exports = RedisKeys;
