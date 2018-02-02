'use strict';

const FB = require('fb');
const Promise = require('promise');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

//Init Facebook settings
const facebookSettings = {
    appId: '346280555872882', //Test Fiestainfo app (Fiestainfo LocalTest)
    appSecret: process.env.APP_SECRET,
    pageId: '1595429480526327' //Test page
};

exports.handler = function(event, context) {
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));    
       
    //Object key may have spaces or unicode non-ASCII characters.
    const fileKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));  
    const bucket = event.Records[0].s3.bucket.name;

    FB.init({
        appId: facebookSettings.appId,
        autoLogAppEvents : true,
        xfbml: true,
        version: 'v2.11'
    });

    getAccessToken()
        .then(() => getAlbumId(bucket, fileKey))
        .then(albumId => uploadPictureToAlbum(albumId, bucket, fileKey))
        .then(() => {
            console.log('Picture uploaded to Facebook');
        })
        .catch(error => {
            console.log(error);
        });
}

//Get Facebook access token
function getAccessToken() {
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
                resolve();                
            }            
        });        
    })
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
