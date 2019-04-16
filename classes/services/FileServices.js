const common = require('../../lib/common');
const fs = require('fs');
const path = require('path');
const config = require('config');
const promise = require('bluebird');
const mime = require('mime-type/with-db');
const Enums = require('../models/Enums');
const sharp = require('sharp');
const{ProductDataStores} = require('../DataStores/ProductDataStores');
const IMAGE_HEIGHT = config.get('products.imageHeight');
const IMAGE_WIDTH = config.get('products.imageWidth');

const uploadDir = config.get('products.productImageUploadDir');

class FileServices{
    static injectStaticDependencies(){
        this.productDataStores = ProductDataStores;
        this.enums = Enums;
    }

    static async getAllFiles(){
        let fileList = [];
        let dirList = [];
        let result = await new promise((resolve, reject) => {
            fs.readdir(uploadDir, (err, files) => {
                if(err){
                    reject({fileList: [], dirList: []});
                }
                files.sort();
                for(let key in files){
                    if(fs.lstatSync(files[key]).isDirectory()){
                        let dirObj = {
                            id: key,
                            path: files[key].substring(6)
                        };
                        dirList.push(dirObj);
                    }else{
                        let fileObj = {
                            id: key,
                            path: files[key].substring(6)
                        };
                        fileList.push(fileObj);
                    }
                }
                resolve({fileList: fileList, dirList: dirList});
            });
        });
        return result;
    }

    static async uploadFile(req, res, file){
        try{
            const mimeType = mime.lookup(file.originalname);
            if(!common.allowedMimeType.includes(mimeType) || file.size > common.fileSizeLimit){
                fs.unlinkSync(file.path);
                throw Error(this.enums.UNSUPPORTED_MIME_TYPE);
            }
            let product = await this.productDataStores.getProductByProductID(req.body.productId);
            const productPath = product.productPermalink;
            const uploadDir = path.join('public', 'uploads', productPath);
            common.checkDirectorySync(uploadDir);
            let source = sharp(file.path).resize({height: IMAGE_HEIGHT, width: IMAGE_WIDTH});
            let dest = fs.createWriteStream(path.join(uploadDir, file.originalname.replace(/ /g, '_')));
            source.pipe(dest);
            let result = await new promise((resolve, reject) => {
                source.on('end', async () => {
                    try{
                        fs.unlinkSync(file.path);
                        let imagePath = path.join('uploads', productPath, file.originalname.replace(/ /g, '_'));
                        if(!product.productImage){
                            product.productImage = imagePath;
                            await this.productDataStores.setProductProperty(product.productId, {productImage: product.productImage});
                        }
                        resolve(true);
                    }catch(e){
                        reject(false);
                    }
                });
            });
            return result;
        }catch(e){
            console.log(`Error: uploadFile function: ${e.message}`);
            throw e;
        }
    }

    static async removeFile(req, res, image){
        let imagePath = (image !== null && image !== undefined) ? image : path.join('public', req.body.frmProductImage);
        let result = await new promise((resolve, reject) => {
            fs.unlink(imagePath, (err) => {
                if(err){
                    reject(false);
                }
                resolve(true);
            });
        });
        return result;
    }

    static updateFile(path){

    }
}

module.exports = {
    dependencies: FileServices.injectStaticDependencies(),
    FileService: FileServices
};
