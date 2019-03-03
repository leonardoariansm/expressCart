const lunr = require('lunr');
const promise = require('bluebird');
const StaticFunctions = require('../utilities/staticFunctions');

class LunrFullTextSearching{
    static creatLunrIndexing(fieldsBoostWise, documents){
        // if(StaticFunctions.isEmpty(documents) || StaticFunctions.isEmpty(fieldsBoostWise))return null;
        // return new promise((resolve, reject) => {
        //     let idx = lunr(() => {
        //         let that = this;
        //         that.ref(fieldsBoostWise[0]['name']);
        //         fieldsBoostWise.forEach((fieldBoostWise) => {
        //             that.field(fieldBoostWise['name'], fieldBoostWise['boostVal']);
        //         });
        //         documents.forEach((document) => {
        //             that.add(document);
        //         });
        //     });
        //     resolve(idx);
        // });
    }
}

module.exports = LunrFullTextSearching;
