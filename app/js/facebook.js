+function() {
    const $loginBlock = $('.facebook-login-block');
    const loginOptions = {
        scope: 'publish_pages,manage_pages', 
        return_scopes: true
    };

    //Login into Facebook
    $(document).on('click', '.facebook-login', function(e) {
        FB.login(function(response) {
            facebookAuthResponse = response;
            if (!response.authResponse) {
                $.alert('warning', 'Facebook login is canceled or not full');
                return;
            }

            if (!canUploadPicturesToFB()) {
                $.alert('warning', 'You do not have permissions to upload pictures to Facebook');
            }

            $loginBlock.children().hide();
            $loginBlock.find('.done').show();            
        }, loginOptions);
    });

    //Logout from Facebook
    $(document).on('click', '.facebook-logout', function(e) {
        FB.logout(function(response) {
            facebookAuthSettings = null;

            $loginBlock.children().hide();
            $loginBlock.find('.not-done').show();            
        });
    });
}();

//Check if user is logged in into Facebook
function onFacebookLoad() {
    const $loginBlock = $('.facebook-login-block');
    $loginBlock.children().hide();

    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            facebookAuthSettings = response.authResponse;
            $loginBlock.find('.done').show();
        } else {
            $loginBlock.find('.not-done').show();
        }
    });
};

//Check if user has permissions to upload pictures to Facebook
function canUploadPicturesToFB() {
    const data = facebookAuthResponse;
    if (typeof data.authResponse.grantedScopes === 'undefined') return false;

    const permissions = data.authResponse.grantedScopes;

    return permissions.indexOf('manage_pages') !== -1 && 
        permissions.indexOf('publish_pages') !== -1;
}

const albumsFBIds = {};

//Create album on Facebook
function createFbAlbum(albumData, callback) {
    const albumName = albumData.name;
    if (albumsFBIds[albumName] || !facebookAuthResponse) {
        return callback();
    }

    const url = '/' + facebookSettings.pageId + '/albums';

    checkAlbumExists(url, albumName, function(exists) {
        if (exists) return callback();

        FB.api(facebookSettings.pageId + '/albums', 'post', albumData, function(response) {
            callback();
        });
    });    
}

//Check if album with this name already exists on Facebook
function checkAlbumExists(url, album, callback) {
    FB.api(url, 'get', {fields: 'id,name', access_token: facebookAuthResponse.accessToken}, function(response) {
        var exists = false;
        const data = typeof response.data !== 'undefined' ? response.data : [];

        for (var i = 0; i < data.length; i++) {
            if (data[i].name !== album) continue;

            exists = true;
            break;
        }

        callback(exists);
    });
}
