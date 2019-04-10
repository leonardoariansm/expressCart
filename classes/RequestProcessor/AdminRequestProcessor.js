class AdminRequestProcessor{
    static injectStaticDependencies(){

    }

    static getRawRequestMenuItem(req, res){
        let menu = {
            title: req.body.navMenu,
            link: req.body.navLink
        };
        return menu;
    }
}

module.exports = {
    dependencies: AdminRequestProcessor.injectStaticDependencies(),
    AdminRequestProcessor: AdminRequestProcessor
}
