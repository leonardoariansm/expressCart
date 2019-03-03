let Enums = {
    productCollectionName: 'product',
    userCollectionName: 'user',
    orderCollectionName: 'order',
    customerCollectionName: 'customer',
    pageCollectionName: 'page',

    // Errors
    PRODUCT_NOT_IN_REDIS: 'PRODUCT_NOT_IN_REDIS',
    PRODUCT_PERMALINK_ALREADY_EXIST: 'PRODUCT_PERMALINK_ALREADY_EXIST',
    PRODUCT_PERMALINK_ALREADY_EXIST_MESSAGE: 'product permalink already exist pick a new one',
    PRODUCT_PERMALINK_EMPTY: 'PRODUCT_PERMALINK_EMPTY',
    PRODUCT_PERMALINK_EMPTY_MESSAGE: 'please input non empty permalink',
    PRODUCT_ID_INVALID: 'PRODUCT_ID_INVALID',
    PRODUCT_SUCCESSFULLY_SAVED: 'Successfully saved',
    PRODUCT_PERMALINK_SUCCESSFULLY_VALIDATED: 'product permalink successfully validated',
    PRODUCT_SUCCESSFULLY_DELETED: 'Product successfully deleted',
    ERROR_PRODUCT_DELETION: 'Error in Product deleting',

    // messageTypes
    DANGER: 'danger',
    SUCCESS: 'success',

    // routes
    productUpdateRoute: '/admin/product/update'
};

module.exports = Enums;
