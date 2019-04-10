class RedisKeys{
    static getCustomerDetailsRedisKeys(customerEmail){
        return'customer' + `:${customerEmail}`;
    }

    static getPageDetailsRedisKeys(pageId){
        return'page' + `:${pageId}`;
    }

    static getUserRedisKeys(){
        return'user';
    }

    static getUserToUserProductsMapping(userId){
        return this.getUserRedisKeys() + ':usrProd:' + userId;
    }

    static getUserEmailToUserIdMappingKey(email){
        return this.getUserRedisKeys() + ':usrEmail:' + email;
    }

    static getUserDetailsRedisKey(userId){
        return this.getUserRedisKeys() + ':userId:' + userId;
    }

    static getOrderRedisKeys(){
        return'order';
    }

    static getOrderToOrderProductMappingKey(orderId){
        return this.getOrderRedisKeys() + ':odProducts:' + orderId;
    }

    static getOrderDetailsRedisKeys(orderId){
        return this.getOrderRedisKeys() + ':odID:' + orderId;
    }

    static getOrderByOrderStatusRedisKey(orderStatus){
        return this.getOrderRedisKeys() + ':odSts:' + orderStatus;
    }

    static getOrderByOrderFirstNameKey(firstName){
        return this.getOrderRedisKeys() + ':odFName:' + firstName;
    }

    static getOrderByOrderLastNameKey(lastName){
        return this.getOrderRedisKeys() + ':odLName:' + lastName;
    }

    static getOrderByOrderEmailKey(email){
        return this.getOrderRedisKeys() + ':email:' + email;
    }

    static getOrderByOrderPostcodeKey(postCode){
        return this.getOrderRedisKeys() + ':psCode:' + postCode;
    }

    static getCustomerRedisKeys(){
        return'customer';
    }

    static getCustomerDetailsKey(customerId){
        return this.getCustomerRedisKeys() + ':cstId:' + customerId;
    }

    static getCustomerIdAndEmailMappingKey(email){
        return this.getCustomerRedisKeys() + ':email:' + email;
    }

    static getCustomerIdAndPhoneNoMappingKey(phoneNo){
        return this.getCustomerRedisKeys() + ':phoneNo:' + phoneNo;
    }

    static getCustomerPasswordTokenKey(token){
        return this.getCustomerRedisKeys() + ':tkn:' + token;
    }

    static getCustomerByFirstNameKey(firstName){
        return this.getCustomerRedisKeys() + ':fName:' + firstName;
    }

    static getCustomerByLastNameKey(lastName){
        return this.getCustomerRedisKeys() + ':lName:' + lastName;
    }

    static getCustomerByEmailKey(email){
        return this.getCustomerRedisKeys() + ':email:' + email;
    }

    static getCustomerByPhoneKey(phone){
        return this.getCustomerRedisKeys() + ':phone:' + phone;
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
        return this.getProductRedisKey() + ':ppl:' + productPermaLink;
    }

    static getProductByProductTitleKey(productTitle){
        return this.getProductRedisKey() + ':ptitle:' + productTitle;
    }

    static getProductByProductTagsKey(productTag){
        return this.getProductRedisKey() + ':pTags:' + productTag;
    }

    static getProductByProductDescriptionKey(productDescription){
        return this.getProductRedisKey() + ':pDes:' + productDescription;
    }

    static getProductToKeywordMappingKey(productKeyword){
        return this.getProductRedisKey() + ':pKwd:' + productKeyword;
    }

    static getMenuItemKey(){
        return'menuItms';
    }

    static getMenuItemDetailsKey(itemId){
        return this.getMenuItemKey() + ':itm:' + itemId;
    }

    static getMenuItemTitleToIdMappingKey(title){
        return'menuTitle:' + title;
    }
}

module.exports = RedisKeys;
