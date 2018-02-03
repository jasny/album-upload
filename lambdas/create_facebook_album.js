'use strict';

const FB = require('fb');
const Promise = require('promise');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

//Init Facebook settings
const facebookSettings = {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.APP_SECRET,
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

    getAlbumId(bucket, fileKey)
        .then(albumId => getAccessToken(albumId))
        .then(albumId => uploadPictureToAlbum(albumId, bucket, fileKey))
        .then(() => {
            console.log('Picture uploaded to Facebook');
        })
        .catch(error => {
            console.log(error);
        });
}

//Get facebook album id
function getAlbumId(bucket, fileKey) {
    return new Promise((resolve, reject) => {
        var params = {
            Bucket: bucket, 
            Key: fileKey
        };

        s3.headObject(params, function(error, data) {
            if (error) return reject('Unable to get file metadata: ', err);                
            
            const albumId = typeof data.Metadata['x-amz-album-facebook-id'] != 'undefined' ? 
                data.Metadata['x-amz-album-facebook-id'] :
                null;

            if (!albumId) return reject('Album Facebook id is not set');

            resolve(albumId);
        });
    });
}

//Get Facebook access token
function getAccessToken(albumId) {    
    FB.init({
        appId: facebookSettings.appId,
        autoLogAppEvents : true,
        xfbml: true,
        version: 'v2.11'
    });

    return new Promise((resolve, reject) => {
        FB.api('oauth/access_token', {
            client_id: facebookSettings.appId,
            client_secret: facebookSettings.appSecret,
            grant_type: 'client_credentials'
        }, function (res) {
            if(!res || res.error || !res.access_token) {
                reject('Unable to obtain facebook access token. ' + (res ? res.error : null));
            } else {
                FB.setAccessToken(res.access_token);
                resolve(albumId);
            }            
        });        
    })
}

//Upload picture to album
function uploadPictureToAlbum(albumId, bucket, fileKey) {
    return new Promise((resolve, reject) => {
        const url = `https://${bucket}.s3.amazonaws.com/${fileKey}`;

        FB.api('/' + albumId + '/photos', 'post', { url: url }, function (res) {
            if(!res || res.error) {
                reject('Error while uploading picture to Facebook. ' + (res ? res.error : null));
            } else {
                resolve();
            }
        });
    });
}
