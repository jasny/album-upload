'use strict';

const FB = require('fb');
const Promise = require('promise');
const util = require('util');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

//Init Facebook settings
const facebookSettings = {
    appId: process.env.FACEBOOK_APP_ID
};

exports.handler = function(event, context) {
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    console.log("Facebook settings: ", facebookSettings);
       
    const bucket = event.Records[0].s3.bucket.name;
    const fileKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));  //Object key may have spaces or unicode non-ASCII characters.
    var fileExt = fileKey.match(/\.([^.]*)$/);
    fileExt = fileExt && fileExt[1];

    if (!fileExt) {
        console.error('Unable to infer image type for key ' + fileKey);
        return;
    }    

    if (['jpg', 'jpeg'].indexOf(fileExt) === -1 ) {
        console.error('Skipping non jpg image ' + fileKey);
        return;
    }    

    FB.options({
        appId: facebookSettings.appId,
        autoLogAppEvents : true,
        xfbml: true,
        version: 'v2.11'
    });

    getMeta(bucket, fileKey)
        .then((meta) => uploadPictureToAlbum(meta, bucket, fileKey))
        .then(() => {
            console.log('Picture uploaded to Facebook');
        })
        .catch(error => {
            console.log(error);
        });
}

//Get facebook album id
function getMeta(bucket, fileKey) {
    return new Promise((resolve, reject) => {
        var params = {
            Bucket: bucket, 
            Key: fileKey
        };

        s3.headObject(params, function(error, data) {
            if (error) return reject('Unable to get file metadata: ', err);                

            console.log('Obtained meta: ', data);
            
            const albumId = getMetaValue(data, 'album-facebook-id');
            const pageAccessToken = getMetaValue(data, 'page-facebook-access-token');

            if (!albumId) return reject('Album Facebook id is not set');
            if (!pageAccessToken) return reject('Facebook page access token is not set');

            resolve({albumId, pageAccessToken});
        });
    });

    function getMetaValue(data, name) {
        return typeof data.Metadata[name] != 'undefined' ? data.Metadata[name] : null;
    }
}

//Upload picture to album
function uploadPictureToAlbum(meta, bucket, fileKey) {
    const albumId = meta.albumId;
    const pageAccessToken = meta.pageAccessToken;

    return new Promise((resolve, reject) => {
        const url = '/' + albumId + '/photos';
        const imageUrl = encodeURI(`https://${bucket}.s3.amazonaws.com/${fileKey}`);
        const params = {url: imageUrl, access_token: pageAccessToken};

        console.log('Query: ', url, params);

        FB.api(url, 'post', params, function (res) {
            if(!res || res.error) {
                reject('Error while uploading picture to Facebook. ' + (res ? res.error : null));
            } else {
                resolve();
            }
        });
    });
}
