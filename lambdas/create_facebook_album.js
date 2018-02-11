'use strict';

const FB = require('fb');
const Promise = require('promise');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

//Init Facebook settings
const facebookSettings = {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    pageId: process.env.FACEBOOK_PAGE_ID
};

exports.handler = function(event, context) {
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
       
    //Object key may have spaces or unicode non-ASCII characters.
    const fileKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));  
    const fileExt = fileKey.match(/\.([^.]*)$/);
    const bucket = event.Records[0].s3.bucket.name;

    if (!fileExt) {
        console.error('Unable to infer image type for key ' + fileKey);
        return;
    }    

    if (['jpg', 'jpeg'].indexOf(fileExt) === -1 ) {
        console.error('Skipping non jpg image ' + fileKey);
        return;
    }    

    FB.init({
        appId: facebookSettings.appId,
        autoLogAppEvents : true,
        xfbml: true,
        version: 'v2.11'
    });

    getMeta(bucket, fileKey)
        .then((albumId, pageAccessToken) => uploadPictureToAlbum(albumId, pageAccessToken, bucket, fileKey))
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
            
            const albumId = getMetaValue('x-amz-album-facebook-id');
            const pageAccessToken = getMetaValue('x-amz-page-facebook-access-token');

            if (!albumId) return reject('Album Facebook id is not set');
            if (!pageAccessToken) return reject('Facebook page access token is not set');

            resolve(albumId, pageAccessToken);
        });
    });

    function getMetaValue(data, name) {
        return typeof data.Metadata[name] != 'undefined' ? data.Metadata[name] : null;
    }
}

//Upload picture to album
function uploadPictureToAlbum(albumId, pageAccessToken, bucket, fileKey) {
    return new Promise((resolve, reject) => {
        const url = `https://${bucket}.s3.amazonaws.com/${fileKey}`;

        FB.api('/' + albumId + '/photos', 'post', { url: url, access_token: pageAccessToken }, function (res) {
            if(!res || res.error) {
                reject('Error while uploading picture to Facebook. ' + (res ? res.error : null));
            } else {
                resolve();
            }
        });
    });
}
