const bcrypt = require('bcryptjs');

class CustomerRequestProcessor{
    static injectStaticDependencies(){

    }

    static async getRawRequestCustomer(req, res){
        let customer = {
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            address1: req.body.address1,
            address2: req.body.address2,
            country: req.body.country,
            state: req.body.state,
            postcode: req.body.postcode,
            phone: req.body.phone,
            password: bcrypt.hashSync(req.body.password, 10),
            created: new Date()
        };
        return customer;
    }
}

module.exports = {
    dependencies: CustomerRequestProcessor.injectStaticDependencies(),
    CustomerRequestProcessor: CustomerRequestProcessor
};
