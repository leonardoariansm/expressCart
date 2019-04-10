const StaticFunctions = require('../utilities/staticFunctions');
const crypto = require('crypto');

class OrderRequestProcessor{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
    }
    static getRawRequestOrder(req, res, order){
        if(this.staticFunctions.isNotEmpty(order)){
            order.orderId = this.getOrderID(order);
            return order;
        }
        return null;
    }

    static getOrderID(order){
        return crypto.createHash('md5').update(JSON.stringify(order)).digest('hex');
    }
}

module.exports = {
    dependencies: OrderRequestProcessor.injectStaticDependencies(),
    OrderRequestProcessor: OrderRequestProcessor
};
