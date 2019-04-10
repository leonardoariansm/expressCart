const Enums = require('../models/Enums');
const common = require('../../lib/common');
const StaticFunctions = require('../utilities/staticFunctions');

class CustomerExceptionTemplate{
    static injectStaticDependencies(){
        this.staticFcuntions = StaticFunctions;
        this.enums = Enums;
    }

    static customerCustomExceptionTemplate(req, res, err){
        req.session.messageType = this.enums.DANGER;
        req.session.message = err.message;
        switch(err.message){
            case this.enums.INVALID_CUSTOMER_DETAILS:
                // req.session.message = this.enums.INVALID_CUSTOMER_DETAILS;
                res.status(200).json({
                    err: this.enums.INVALID_CUSTOMER_DETAILS
                });
                break;
            case this.enums.CUSTOMER_ALREADY_EXIST:
                // req.session.message = this.enums.CUSTOMER_ALREADY_EXIST;
                res.status(200).json({
                    err: this.enums.CUSTOMER_ALREADY_EXIST
                });
                break;
            case this.enums.CUSTOMER_ID_EMPTY:
                // req.session.message = this.enums.CUSTOMER_ID_EMPTY;
                res.status(200).json({
                    err: this.enums.CUSTOMER_ID_EMPTY
                });
                break;
            case this.enums.CUSTOMER_NOT_EXIST:
                // req.session.message = this.enums.CUSTOMER_NOT_EXIST;
                res.status(200).json({
                    err: this.enums.CUSTOMER_NOT_EXIST
                });
                break;
            case this.enums.NONE_CUSTOMER_EXISTS:
                // req.session.message = this.enums.NONE_CUSTOMER_EXISTS;
                res.render('customers', {
                    title: 'Customers - List',
                    admin: true,
                    customers: [],
                    session: req.session,
                    helpers: req.handlebars.helpers,
                    message: common.clearSessionValue(req.session, 'message'),
                    messageType: common.clearSessionValue(req.session, 'messageType')
                });
                break;
            case this.enums.EMPTY_SEARCH_TERM:
                // req.session.message = this.enums.EMPTY_SEARCH_TERM;
                res.render('customers', {
                    title: 'Customers - List',
                    admin: true,
                    customers: [],
                    session: req.session,
                    helpers: req.handlebars.helpers,
                    message: common.clearSessionValue(req.session, 'message'),
                    messageType: common.clearSessionValue(req.session, 'messageType')
                });
                break;
            case this.enums.INVALID_PASSWORD:
                // req.session.message = this.enums.INVALID_PASSWORD;
                res.status(200).json({
                    err: this.enums.ACCESS_DENIED + this.enums.INVALID_PASSWORD
                });
                break;
            default:
                // req.session.message = this.enums.UNHANDLED_EXCEPTION;
                res.status(200).json({
                    err: this.enums.UNHANDLED_EXCEPTION
                });
        }
    }
}

module.exports = {
    dependencies: CustomerExceptionTemplate.injectStaticDependencies(),
    CustomerExceptionTemplate: CustomerExceptionTemplate
};
