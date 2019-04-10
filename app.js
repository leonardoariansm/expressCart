const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const config = require('config');
const moment = require('moment');
const numeral = require('numeral');
const helmet = require('helmet');
const logger = require('morgan');
const colors = require('colors');
let session = require('express-session');
let RedisStore = require('connect-redis')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const MangoUtils = require('./classes/utilities/MangoUtils');
const RedisUtils = require('./classes/Redis/RedisUtils');
const{IndexingService} = require('./classes/services/Indexing/IndexingService');
let handlebars = require('express-handlebars');
// require the routes
const index = require('./routes/index');
const admin = require('./routes/admin');
const product = require('./routes/product');
const customer = require('./routes/customer');
const order = require('./routes/order');
const user = require('./routes/user');
const stripe = require('./routes/payments/stripe');

app.set('views', path.join(__dirname, '/views'));
app.engine('hbs', handlebars({
    extname: 'hbs',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    defaultLayout: 'layout.hbs',
    partialsDir: [ path.join(__dirname, 'views') ]
}));
app.set('view engine', 'hbs');
app.config = config.get('settings');

// helpers for the handlebar templating platform
handlebars = handlebars.create({
    helpers: {
        perRowClass: function(numProducts){
            if(parseInt(numProducts) === 1){
                return'col-md-12 col-xl-12 col m12 xl12 product-item';
            }
            if(parseInt(numProducts) === 2){
                return'col-md-6 col-xl-6 col m6 xl6 product-item';
            }
            if(parseInt(numProducts) === 3){
                return'col-md-4 col-xl-4 col m4 xl4 product-item';
            }
            if(parseInt(numProducts) === 4){
                return'col-md-3 col-xl-3 col m3 xl3 product-item';
            }

            return'col-md-6 col-xl-6 col m6 xl6 product-item';
        },
        menuMatch: function(title, search){
            if(!title || !search){
                return'';
            }
            if(title.toLowerCase().startsWith(search.toLowerCase())){
                return'class="navActive"';
            }
            return'';
        },
        getTheme: function(view){
            return`themes/${'Cloth'}/${view}`;
        },
        formatAmount: function(amt){
            if(amt){
                return numeral(amt).format('0.00');
            }
            return'0.00';
        },
        amountNoDecimal: function(amt){
            if(amt){
                return handlebars.helpers.formatAmount(amt).replace('.', '');
            }
            return handlebars.helpers.formatAmount(amt);
        },
        getStatusColor: function (status){
            switch(status){
            case'Paid':
                return'success';
            case'Approved':
                return'success';
            case'Approved - Processing':
                return'success';
            case'Failed':
                return'danger';
            case'Completed':
                return'success';
            case'Shipped':
                return'success';
            case'Pending':
                return'warning';
            default:
                return'danger';
            }
        },
        checkProductOptions: function (opts){
            if(opts){
                return'true';
            }
            return'false';
        },
        currencySymbol: function(value){
            if(typeof value === 'undefined' || value === ''){
                return'$';
            }
            return value;
        },
        objectLength: function(obj){
            if(obj){
                return Object.keys(obj).length;
            }
            return 0;
        },
        checkedState: function (state){
            if(state === 'true' || state === true){
                return'checked';
            }
            return'';
        },
        selectState: function (state, value){
            if(state === value){
                return'selected';
            }
            return'';
        },
        isNull: function (value, options){
            if(typeof value === 'undefined' || value === ''){
                return options.fn(this);
            }
            return options.inverse(this);
        },
        toLower: function (value){
            if(value){
                return value.toLowerCase();
            }
            return null;
        },
        formatDate: function (date, format){
            return moment(date).format(format);
        },
        ifCond: function (v1, operator, v2, options){
            switch(operator){
            case'==':
                return(v1 === v2) ? options.fn(this) : options.inverse(this);
            case'!=':
                return(v1 !== v2) ? options.fn(this) : options.inverse(this);
            case'===':
                return(v1 === v2) ? options.fn(this) : options.inverse(this);
            case'<':
                return(v1 < v2) ? options.fn(this) : options.inverse(this);
            case'<=':
                return(v1 <= v2) ? options.fn(this) : options.inverse(this);
            case'>':
                return(v1 > v2) ? options.fn(this) : options.inverse(this);
            case'>=':
                return(v1 >= v2) ? options.fn(this) : options.inverse(this);
            case'&&':
                return(v1 && v2) ? options.fn(this) : options.inverse(this);
            case'||':
                return(v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
            }
        },
        isAnAdmin: function (value, options){
            if(value === 'true' || value === true){
                return options.fn(this);
            }
            return options.inverse(this);
        }
    }
});
app.enable('trust proxy');
app.use(helmet());
app.set('port', process.env.PORT || 1111);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser('5TOCyfH3HuszKGzFZntk'));
// session store
// Not working code
// RedisUtils.getRedisInstance()
//     .then((client) => {
//         let store = new RedisStore({
//             host: config.get('redis.host'),
//             port: config.get('redis.port'),
//             client: client,
//             ttl: 300
//         });
//         app.use(session({
//             resave: false, // don't save session if unmodified
//             saveUninitialized: false, // don't create session until something stored
//             secret: 'pAgGxo8Hzg7PFlv1HpO8Eg0Y6xtP7zYx',
//             cookie: {
//                 path: '/',
//                 httpOnly: true,
//                 maxAge: 3600000 * 24
//             },
//             store: store
//         }));
//     });

app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'pAgGxo8Hzg7PFlv1HpO8Eg0Y6xtP7zYx',
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 3600000 * 24
    },
    store: new RedisStore()
}));
// serving static content
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views', 'themes')));

// Make stuff accessible to our router
app.use((req, res, next) => {
    req.handlebars = handlebars;
    next();
});

// update config when modified
// app.use((req, res, next) => {
//     next();
//     if(res.configDirty){
//         config = common.getConfig();
//         app.config = config;
//     }
// });

// Ran on all routes
app.use((req, res, next) => {
    req.app = app;
    res.setHeader('Cache-Control', 'no-cache, no-store');
    next();
});

// setup the routes
app.use('/', index);
app.use('/', customer);
app.use('/', product);
app.use('/', order);
app.use('/', user);
app.use('/', admin);
app.use('/stripe', stripe);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
    app.use((err, req, res, next) => {
        console.error(colors.red(err.stack));
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            helpers: handlebars.helpers
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
    console.error(colors.red(err.stack));
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        helpers: handlebars.helpers
    });
});

// Nodejs version check
const nodeVersionMajor = parseInt(process.version.split('.')[0].replace('v', ''));
if(nodeVersionMajor < 7){
    console.log(colors.red(`Please use Node.js version 7.x or above. Current version: ${nodeVersionMajor}`));
    process.exit(2);
}

app.on('uncaughtException', (err) => {
    console.error(colors.red(err.stack));
    process.exit(2);
});

MangoUtils.getMangoDbInstance()
    .then((dbInstance) => {
        dbInstance.users = dbInstance.collection('users');
        dbInstance.products = dbInstance.collection('products');
        dbInstance.orders = dbInstance.collection('orders');
        dbInstance.pages = dbInstance.collection('pages');
        dbInstance.customers = dbInstance.collection('customers');
        dbInstance.menu = dbInstance.collection('menu');
        return dbInstance;
    })
    .then((dbInstance) => {
        return RedisUtils.getRedisInstance();
    })
    .then((redisInstance) => {
        IndexingService.runIndexing()
            .then((productIndex) => {
                app.productIndex = productIndex;
            })
            .then(app.listen(app.get('port')))
            .then(() => {
                app.emit('appStarted');
                console.log(colors.green('expressCart running on host: http://localhost:' + app.get('port')));
            })
            .catch((err) => {
                console.error(colors.red('Error setting up indexes:' + err));
                process.exit(2);
            });
    })
    .catch((err) => {
        console.error(colors.red('Error setting up indexes:' + err));
        process.exit(2);
    });

module.exports = app;
