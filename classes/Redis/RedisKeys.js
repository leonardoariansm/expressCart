class RedisKeys{
    static getCustomerDetailsRedisKeys(customerEmail){
        return'customer' + `:${customerEmail.trim().toLowerCase()}`;
    }

    static getPageDetailsRedisKeys(pageId){
        return'page' + `:${pageId.trim().toLowerCase()}`;
    }

    static getUserRedisKeys(){
        return'user';
    }

    static getUserToUserProductsMapping(userId){
        if(userId === null || userId === undefined)return this.getUserRedisKeys() + ':usrProd:';
        return this.getUserRedisKeys() + ':usrProd:' + userId.trim().toLowerCase();
    }

    static getUserEmailToUserIdMappingKey(email){
        return this.getUserRedisKeys() + ':usrEmail:' + email.trim().toLowerCase();
    }

    static getUserDetailsRedisKey(userId){
        return this.getUserRedisKeys() + ':userId:' + userId.trim().toLowerCase();
    }

    static getOrderRedisKeys(){
        return'order';
    }

    static getOrderToOrderProductMappingKey(orderId){
        return this.getOrderRedisKeys() + ':odProducts:' + orderId.trim().toLowerCase();
    }

    static getOrderDetailsRedisKeys(orderId){
        return this.getOrderRedisKeys() + ':odID:' + orderId.trim().toLowerCase();
    }

    static getOrderByOrderStatusRedisKey(orderStatus){
        return this.getOrderRedisKeys() + ':odSts:' + orderStatus.trim().toLowerCase();
    }

    static getOrderByOrderFirstNameKey(firstName){
        return this.getOrderRedisKeys() + ':odFName:' + firstName.trim().toLowerCase();
    }

    static getOrderByOrderLastNameKey(lastName){
        return this.getOrderRedisKeys() + ':odLName:' + lastName.trim().toLowerCase();
    }

    static getOrderByOrderEmailKey(email){
        return this.getOrderRedisKeys() + ':email:' + email.trim().toLowerCase();
    }

    static getOrderByOrderPostcodeKey(postCode){
        return this.getOrderRedisKeys() + ':psCode:' + postCode.trim().toLowerCase();
    }

    static getCustomerRedisKeys(){
        return'customer';
    }

    static getCustomerDetailsKey(customerId){
        return this.getCustomerRedisKeys() + ':cstId:' + customerId.trim().toLowerCase();
    }

    static getCustomerIdAndEmailMappingKey(email){
        return this.getCustomerRedisKeys() + ':email:' + email.trim().toLowerCase();
    }

    static getCustomerIdAndPhoneNoMappingKey(phoneNo){
        return this.getCustomerRedisKeys() + ':phoneNo:' + phoneNo.trim().toLowerCase();
    }

    static getCustomerPasswordTokenKey(token){
        return this.getCustomerRedisKeys() + ':tkn:' + token.trim().toLowerCase();
    }

    static getCustomerByFirstNameKey(firstName){
        return this.getCustomerRedisKeys() + ':fName:' + firstName.trim().toLowerCase();
    }

    static getCustomerByLastNameKey(lastName){
        return this.getCustomerRedisKeys() + ':lName:' + lastName.trim().toLowerCase();
    }

    static getCustomerByEmailKey(email){
        return this.getCustomerRedisKeys() + ':email:' + email.trim().toLowerCase();
    }

    static getCustomerByPhoneKey(phone){
        return this.getCustomerRedisKeys() + ':phone:' + phone.trim().toLowerCase();
    }

    static getPageRedisKeys(){
        return'page';
    }

    static getProductRedisKey(){
        return'product';
    }

    static getProductDetailsRedisKey(productId){
        return this.getProductRedisKey() + ':productId:' + productId.trim().toLowerCase();
    }

    static getProductPermaLinkRediskey(productPermaLink){
        return this.getProductRedisKey() + ':ppl:' + productPermaLink.trim().toLowerCase();
    }

    static getCategoryProductMappingKey(productCategory){
        return this.getProductRedisKey() + ':catG:' + productCategory.trim().toLowerCase();
    }

    static getProductByProductTitleKey(productTitle){
        return this.getProductRedisKey() + ':ptitle:' + productTitle.trim().toLowerCase();
    }

    static getProductByProductTagsKey(productTag){
        return this.getProductRedisKey() + ':pTags:' + productTag.trim().toLowerCase();
    }

    static getProductByProductDescriptionKey(productDescription){
        return this.getProductRedisKey() + ':pDes:' + productDescription.trim().toLowerCase();
    }

    static getProductToKeywordMappingKey(productKeyword){
        return this.getProductRedisKey() + ':pKwd:' + productKeyword.trim().toLowerCase();
    }

    static getMenuItemKey(){
        return'menuItms';
    }

    static getMenuItemDetailsKey(itemId){
        return this.getMenuItemKey() + ':itm:' + itemId.trim().toLowerCase();
    }

    static getMenuItemTitleToIdMappingKey(title){
        return'menuTitle:' + title.trim().toLowerCase();
    }
}

module.exports = RedisKeys;
