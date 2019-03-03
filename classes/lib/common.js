// "use strict";
// const colors = require('colors');
// const lunr = require('lunr');
// const all = Promise.all;
// const config = require('config');
// const staticFunctions = require('../utilities/staticFunctions');
//
// class Common {
//
//     static restrict(req, res, next) {
//         Common.checkLogin(req, res, next);
//     }
//
//     static checkLogin(req, res, next) {
//         // if (req.session.needsSetup === true){
//         //     res.redirect('/admin/setup');
//         //     return;
//         // }
//         // if (req.session.user){
//         //     next();
//         //     return;
//         // }
//         // res.redirect('/admin/login');
//         next();
//     }
//
//
//     static checkAccess(req, res, next) {
//         return true;
//     }
//
//     static runIndexing(app) {
//         console.info(colors.yellow('Setting up indexes..'));
//         return all([
//             Common.indexProducts(app),
//             Common.indexOrders(app),
//             Common.indexCustomers(app)
//         ])
//         .catch((err) => {
//             process.exit(2);
//         });
//     }
//
//     static indexProducts(app) {
//         //lunr with proper understanding
//         return new Promise((resolve, reject) => {
//             //understand the meaning
//             app.db.products.find({}).toArray((err, productList)=>{
//                 if (err) {
//                     console.error(colors.red(err.stack));
//                     reject(err);
//                 }
//                 const productsIndex = lunr(()=>{
//                     const lunrIndex = this;
//                     lunrIndex.field('productTitle', {boost: 10});
//                     lunrIndex.field('productTags', {boost: 5});
//                     lunrIndex.field('productDescription');
//
//                     productList.forEach((product) => {
//                        let doc = {
//                            "productTitle": product.productTitle,
//                            "productTags": product.productTags,
//                            "productDescription": product.productDescription,
//                            "id": product._id
//                        };
//                        lunrIndex.add(doc);
//                     });
//                 });
//                 app.productsIndex = productsIndex;
//                 console.log(colors.cyan('- Product indexing complete'));
//                 resolve();
//             });
//         });
//     }
//
//     static indexOrders(app) {
//         return new Promise((resolve, reject) => {
//             app.db.orders.find({}).toArray((err,ordersList)=> {
//                 if (err) {
//                     console.error(colors.red(err.stack));
//                     reject(err);
//                 }
//                 const ordersIndex = lunr(()=>{
//                     const lunrIndex = this;
//                     lunrIndex.field('orderEmail', {boost: 10});
//                     lunrIndex.field('orderLastname', {boost: 5});
//                     lunrIndex.field('orderPostcode');
//
//                     ordersList.forEach((order) => {
//                         let doc = {
//                             "orderLastname": order.orderLastname,
//                             "orderEmail": order.orderEmail,
//                             "orderPostcode": order.orderPostcode,
//                             "id": order._id
//                         };
//                         lunrIndex.add(doc);
//                     });
//                 });
//                 app.ordersIndex = ordersIndex;
//                 console.log(colors.cyan('- Order indexing complete'));
//                 resolve();
//             });
//         });
//     }
//
//     static indexCustomers(app) {
//         return new Promise((resolve, reject) => {
//             app.db.customers.find({}).toArray((err,customerList)=>{
//                 if (err) {
//                     console.error(colors.red(err.stack));
//                     reject(err);
//                 }
//                 const ordersIndex = lunr(()=>{
//                     const lunrIndex = this;
//                     lunrIndex.field('email', {boost: 10});
//                     lunrIndex.field('name', {boost: 5});
//                     lunrIndex.field('phone');
//
//                     ordersList.forEach((customer) => {
//                         let doc = {
//                             "email": customer.email,
//                             "name": `${customer.firstName} ${customer.lastName}`,
//                             "phone": customer.phone,
//                             "id": customer._id
//                         };
//                         lunrIndex.add(doc);
//                     });
//                 });
//                 app.customersIndex = customersIndex;
//                 console.log(colors.cyan('- Customer indexing complete'));
//                 resolve();
//             });
//         });
//     }
//
//     static async getData(req, page, query) {
//         try {
//             const db = req.app.db;
//             const numOfProductPerPage = config.get('products.productsPerPage');
//             let skipProducts = 0;
//             if (page > 1) {
//                 skipProducts = (page-1)*numOfProductPerPage;
//             }
//             if(staticFunctions.isEmpty(query)){
//                 query = {};
//             }
//             query['productPublished'] = 'true';
//             const result = await all ([
//                 db.products.find(query).skip(skipProducts).limit(parseInt(numOfProductPerPage)).toArray(),
//                 db.products.count(query)
//             ]);
//             const returnData = {data: result[0], totalProducts: result[1]};
//             return returnData;
//         }
//         catch(err) {
//             throw new Error('Error retrieving products');
//         }
//     }
//
//     static async getMenu(db) {
//         return db.menu.findOne({});
//     }
//
//     static newMenu (req, res) {
//
//     }
// }
//
// module.exports = Common;
