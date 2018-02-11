var uploadParams = null;

//Create upload params for sending file to AWS S3
function getUploadParams(albumName, albumId) {
    const settings = getAWSSettings();
        
    const today = new Date();
    const month = ("0" + (today.getMonth() + 1)).substr(-2);
    const day = ("0" + (today.getDate())).substr(-2);
    const hours = ("0" + (today.getHours())).substr(-2);
    const nextHour = ("0" + (today.getHours() + 1)).substr(-2);
    const minutes = ("0" + (today.getMinutes())).substr(-2);
    const seconds = ("0" + (today.getSeconds())).substr(-2);

    const dateFormatted = today.getFullYear() + "" + month + "" + day;
    const dateFormattedFull = dateFormatted + "T" + hours + "" + minutes + "" + seconds + "Z";
    const expiration = today.getFullYear() + "-" + month + "-" + day + "T" + nextHour + ":" + minutes + ":" + seconds + "Z";    

    const policyValues = {
        acl: "public-read",
        key: albumName + "/",
        "Content-Type": "image/",
        "x-amz-credential": settings.accessKeyId + "/" + dateFormatted + "/" + settings.region + "/s3/aws4_request",
        "x-amz-algorithm": "AWS4-HMAC-SHA256",
        "x-amz-date": dateFormattedFull,
        "x-amz-album-facebook-id": albumId ? albumId : "",
        "x-amz-page-facebook-access-token": facebookAuthResponse.pageAccessToken ? facebookAuthResponse.pageAccessToken : ""
    };

    const policy = {
        "expiration": expiration,
        "conditions": [
            {"bucket": settings.bucket},
            {"acl": policyValues.acl},
            ["starts-with", "$key", policyValues.key],
            ["starts-with", "$Content-Type", policyValues['Content-Type']],
            {"x-amz-credential": policyValues['x-amz-credential']},
            {"x-amz-algorithm": policyValues['x-amz-algorithm']},
            {"x-amz-date": policyValues['x-amz-date']},
            {"x-amz-album-facebook-id": policyValues['x-amz-album-facebook-id']},
            {"x-amz-page-facebook-access-token": policyValues['x-amz-page-facebook-access-token']}
        ]
    };
    
    const policyJson = JSON.stringify(policy);
    const base64 = forge.util.encode64(policyJson);
    const signatureKey = getSignatureKey(settings.secret, settings.region, dateFormatted);
    const signature = encodeSHA256(base64, signatureKey); 

    return {
        policyValues: policyValues,
        policy: policy,
        policyBase64: base64,
        signature: signature,
        bucket: settings.bucket
    };
}

//Insert params into form for uploading files
function useUpoadParams(params) {
    var $form = $('#pictures-upload');
    
    for (var name in params.policyValues) {
        var value = params.policyValues[name];
        $form.find('[name="' + name + '"]').val(value);
    }

    $form.find('[name="key"]').val(params.policyValues.key + '${filename}');
    $form.find('[name="policy"]').val(params.policyBase64);
    $form.find('[name="x-amz-signature"]').val(params.signature);
}

//Calculate signature key
function getSignatureKey(secret, region, dateStamp) {
    var kDate = encodeSHA256(dateStamp, "AWS4" + secret, true);
    var kRegion = encodeSHA256(region, kDate, true);
    var kService = encodeSHA256('s3', kRegion, true);
    var kSigning = encodeSHA256("aws4_request", kService, true);

    return kSigning;
}

//Perform sha256 encoding
function encodeSHA256(stringToEncode, key, binary) {
    var hmac = forge.hmac.create();
    hmac.start('sha256', key);
    hmac.update(stringToEncode);

    return binary ? 
        hmac.digest().bytes() :
        hmac.digest().toHex();
}

//Get base AWS settings
function getAWSSettings() {
    return awsSettings;
}
