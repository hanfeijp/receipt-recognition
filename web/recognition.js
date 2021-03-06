'use strict';

const request = require('request');
const formidable = require('formidable');
const fs = require('fs');
const endpoint = process.env.RECOGNITION_HOST || 'localhost';
const port = process.env.RECOGNITION_PORT || 8080;
const recognitionServer = `http://${endpoint}:${port}`;

module.exports = {

    hasToken: (req) => new Promise((resolve,reject) => {

        if(!req.query['userToken']) {
            reject({
                code: 400,
                error: 'badRequest',
                case: 'user token is required'
            })
        }
        else resolve(true)
    }),

    hasItems: (req) => new Promise((resolve,reject) => {

        if(req.body.items) {
            resolve(true)
        }
        else reject({
            code: 400,
            error: 'badRequest',
            case: 'items are required'
        })
    }),

    checkItems: (req) => new Promise((resolve,reject) => {

        let items = req.body.items;
        const categories = {
            'foods':1, 'electronics': 1,
            'clothes':1, 'household':1, 'others':1
        };

        if(Array.isArray(req.body.items) &&
           req.body.items.length > 0 &&
           items.every(item =>
               item.price !== undefined &&
               item.category &&
               categories[item.category] &&
               item.name !== undefined
           )
        ) {
            resolve(true);
        }

        else reject({
            code: 400,
            error: 'badRequest',
            case: 'items are invalid'
        });
    }),

    receivePhoto: (req) => new Promise((resolve, reject) => {

        console.log('receivePhoto start');
        let form = formidable.IncomingForm({uploadDir: './uploads'});

        form.parse(req, (err, fields, files) => {

                if(err) {

                    console.log(err.message);
                    return reject({
                        code: 500,
                        error: 'serverError',
                        case: 'receipt not received',
                        message: err.message
                    });
                }

                if (!files.receipt || !files.receipt.path) {

                    console.log('badRequest - receipt field not exist');
                    return reject({
                        code: 400,
                        error: 'badRequest',
                        case: 'receipt field not exist'
                    });
                }

                let path = __dirname + '/' + files.receipt.path;
                if(fs.existsSync(path)) {
                    resolve(path);
                }
                else {
                    console.log('serverError - receipt received but not saved');
                    return reject({
                        code: 500,
                        error: 'serverError',
                        case: 'receipt received but not saved'
                    });
                }
            });

    }),

    ocr: (params) => new Promise((resolve,reject) => {

        let json = {
            needOcr: !!(params && params.path),
            file: params && params.path ? params.path : null,
            items: params && params.items ? params.items: null
        };

        console.log('ocr request send');
        request({
            method: 'POST',
            uri: `${recognitionServer}/ocr`,
            json: json
        },
            (err, response, body) => {

                if(err) {
                    console.log(err.message);
                    reject({
                        code: 500,
                        error: 'serverError',
                        case: 'ocr request failed',
                        message: err.message
                    })
                }
                else {
                    console.log('ocr request successful');
                    resolve(body);
                }
            }
        );
    }),

    feedback: (json) => new Promise((resolve,reject) => {

        console.log('feedback request send');
        request({
            method: 'POST',
            uri: `${recognitionServer}/feedback`,
            json: json
        },
            (err, response, body) => {
                if(err) {
                    console.log(err.message);
                    reject({
                        code: 500,
                        error: 'serverError',
                        case: 'feedback request failed',
                        message: err.message
                    })
                }
                else {
                    console.log('feedback request successful');
                    resolve(body);
                }
            }
        );
    }),

    hasLoginAndPassword: (req) => new Promise((resolve,reject) => {

        if(!req.body.login || !req.body.password) {

            reject({
                "code": 400,
                "error": "badRequest"
            });
        }
        else resolve(true);
    })
};
