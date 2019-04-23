const StaticFunctions = require('../utilities/staticFunctions');

class AdminRequestProcessor{
    static injectStaticDependencies(){
        this.staticFunctions = StaticFunctions;
    }

    static getRawRequestMenuItem(req, res){
        let menu = {
            title: req.body.navMenu,
            mainlink: req.body.navLink
        };
        let subItems = [];
        let subTitles = (this.staticFunctions.isNotEmpty(menu.title)) ? menu.title.split(':-')[1].trim() : null;
        menu.title = (this.staticFunctions.isNotEmpty(menu.title)) ? menu.title.split(':-')[0].trim() : menu.title;
        if(this.staticFunctions.isNotEmpty(subTitles)){
            subTitles = [...new Set(subTitles.split(','))];
            for(let subtitle in subTitles){
                let subItem = {};
                subItem.subTitle = subTitles[subtitle].trim();
                subItem.subTitleLink = `/category/${subItem.subTitle}`;
                if(this.staticFunctions.isNotEmpty(subItem)) subItems.push(subItem);
            }
        }
        menu.subItems = JSON.stringify(subItems);
        return menu;
    }
}

module.exports = {
    dependencies: AdminRequestProcessor.injectStaticDependencies(),
    AdminRequestProcessor: AdminRequestProcessor
};
