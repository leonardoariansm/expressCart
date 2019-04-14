const common = require('../../lib/common');
const fs = require('fs');
const path = require('path');
const config = require('config');
const promise = require('bluebird');
const mime = require('mime-type/with-db');
const{ProductDataStores} = require('../DataStores/ProductDataStores');

const uploadDir = config.get('products.productImageUploadDir');

class FileServices{
    static injectStaticDependencies(){
        this.productDataStores = ProductDataStores;
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
        const mimeType = mime.lookup(file.originalname);
        if(!common.allowedMimeType.includes(mimeType) || file.size > common.fileSizeLimit){
            fs.unlinkSync(file.path);
            return promise.reject(false);
        }
        let product = await this.productDataStores.getProductByProductID(req.body.frmProductId);
        const productPath = product.productPermalink;
        const uploadDir = path.join('public', 'uploads', productPath);
        common.checkDirectorySync(uploadDir);
        let source = fs.createReadStream(file.path);
        let dest = fs.createWriteStream(path.join(uploadDir, file.originalname.replace(/ /g, '_')));
        source.pipe(dest);
        let result = await new promise((resolve, reject) => {
            source.on('end', async () => {
                try{
                    fs.unlinkSync(file.path);
                    let imagePath = path.join('uploads', productPath, file.originalname.replace(/ /g, '_'));
                    if(!product.productImage){
                        product.productImage = imagePath;
                        await this.productService.setProductImage(req, res, product.productId, product);
                    }
                    resolve(true);
                }catch(e){
                    reject(false);
                }
            });
        });
        return result;
    }

    static async removeFile(req, res){
        let imagePath = path.join('public', req.body.frmProductImage);
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
