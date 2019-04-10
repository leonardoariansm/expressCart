let Enums = {
    productCollectionName: 'product',
    userCollectionName: 'user',
    orderCollectionName: 'order',
    customerCollectionName: 'customer',
    pageCollectionName: 'page',
    menuCollectionName: 'menu',

    // Product
    PRODUCT_NOT_EXISTS: 'PRODUCT_NOT_EXISTS',
    PRODUCT_PERMALINK_ALREADY_EXIST: 'PRODUCT_PERMALINK_ALREADY_EXIST',
    PRODUCT_PERMALINK_ALREADY_EXIST_MESSAGE: 'product permalink already exist pick a new one',
    PRODUCT_PERMALINK_EMPTY: 'PRODUCT_PERMALINK_EMPTY',
    PRODUCT_PERMALINK_EMPTY_MESSAGE: 'please input non empty permalink',
    PRODUCT_ID_INVALID: 'PRODUCT_ID_INVALID',
    PRODUCT_SUCCESSFULLY_SAVED: 'Successfully saved',
    PRODUCT_SUCCESSFULLY_INSERTED: 'product successfully inserted',
    PRODUCT_PERMALINK_SUCCESSFULLY_VALIDATED: 'product permalink successfully validated',
    PRODUCT_SUCCESSFULLY_DELETED: 'Product successfully deleted',
    ERROR_PRODUCT_DELETION: 'Error in Product deleting',
    INVALID_PRODUCT_DETAILS: 'product details not valid',
    INSUFFICIENT_PRODUCT_STOCK: 'product stock insufficient',

    // User
    USER_INSERTION_FAILED: 'Failed to insert user, possibly already exists: ',
    USER_EMAIL_ALREADY_IN_USE: 'A user with that email address already exists',
    USER_SUCCESSFULLY_SAVED: 'User SuccessFully saved',
    USER_SUCCESSFULLY_UPDATED: 'user successFully updated',
    INVALID_USER_ID: 'userId is not valid',
    INVALID_USER_DETAILS: 'user details not valid',
    USER_DETAILS_NOT_FOUND: 'user details not found try again',
    USER_UPDATION_FAILED: 'user updation failed',
    USER_SUCCESSFULLY_DELETED: 'user successfully deleted',
    USER_DELETION_FAILED: 'user deletion failed',
    USER_EMAIL_OR_PASSWORD_EMPTY: 'user email or password empty',
    ACCESS_DENIED: 'access denied',

    // order
    EMPTY_ORDER_STATUS: 'order status empty',
    INVALID_ORDER_STATUS: 'order status invalid',
    INVALID_ORDER_ID: 'invalid order id',

    // page
    INVALID_PAGE: 'invalid page',

    // cart
    CART_SUCCESSFULLY_UPDATED: 'Cart successfully updated',
    INVALID_CART_ITEM: 'cart item not present in cart',
    INVALID_ITEM_IN_CART: 'invalid item in cart',
    CART_EMPTY: 'There are no items in your cart. Please add some items before checking out',

    // customer
    INVALID_CUSTOMER_DETAILS: 'invalid customer details',
    CUSTOMER_EMAIL_EMPTY: 'customer email empty',
    CUSTOMER_ALREADY_EXIST: 'customer already exist',
    CUSTOMER_LOGGED_IN: 'Successfully logged in',
    CUSTOMER_ID_EMPTY: 'Empty customerId',
    CUSTOMER_NOT_EXIST: 'customer not exists',
    NONE_CUSTOMER_EXISTS: 'none customer exists',
    EMPTY_SEARCH_TERM: 'Empty search term',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    INVALID_TOKEN: 'INVALID_TOKEN',
    // messageTypes
    DANGER: 'danger',
    SUCCESS: 'success',

    // common
    UNHANDLED_EXCEPTION: 'unhandled exception',

    // routes
    productUpdateRoute: '/admin/product/update'
};

module.exports = Enums;
