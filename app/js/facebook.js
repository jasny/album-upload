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
            facebookAuthResponse = null;

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
            facebookAuthResponse = response.authResponse;
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
var syncInProcess = false;

function syncFacebookAlbums(callback) {
    if (syncInProcess) return;

    var synced = false;
    for (let name in albumsFBIds) {
        synced = true;
        break;
    }

    if (synced) return callback();

    syncInProcess = true;
    loadAlbums(function() {
        syncInProcess = false;
        callback();
    });
}

//Fetch albums data from Facebook
function loadAlbums(callback) {
    if (!facebookAuthResponse) return callback();

    const params = {limit: 1, fields: 'id,name'};
    loadAlbumsPage(params, callback);
}

//Fetch single page of albums results
function loadAlbumsPage(params, callback) {    
    const url = '/' + facebookSettings.pageId + '/albums';

    FB.api(url, 'get', params, function(response) {
        const data = typeof response.data !== 'undefined' ? response.data : [];

        for (var i = 0; i < data.length; i++) {
            albumsFBIds[data[i].name] = data[i].id;
        }

        if (typeof response.paging.next !== 'undefined' && response.paging.next) {
            params.after = response.paging.cursors.after;
            loadAlbumsPage(params, callback);
        } else {
            callback();
        }
    });
}

var syncCurrentInProcess = false;

//Perform prepare upload actions after loading albums
function syncCurrentlAlbum(callback) {
    if (syncCurrentInProcess) return;

    syncCurrentInProcess = true;
    const albumData = getFormAlbumData();

    getAlbumFBId(albumData, function(albumId) {
        if (!uploadParams) {
            uploadParams = getUploadParams(albumData.name, albumId);
            useUpoadParams(uploadParams);            
        }

        syncCurrentInProcess = false;
        callback();
    });
}

//Get album FB id
function getAlbumFBId(albumData, callback) {
    const albumName = albumData.name;

    if (typeof albumsFBIds[albumName] !== 'undefined') {
        return callback(albumsFBIds[albumName]);
    }

    if (!facebookAuthResponse) {
        return callback(null);
    }

    createFbAlbum(albumData, callback);
}

//Create album on Facebook
function createFbAlbum(albumData, callback) {
    FB.api(facebookSettings.pageId + '/albums', 'post', albumData, function(response) {
        const id = typeof response.id !== 'undefined' ? response.id : null;

        if (!id) {
            const error = typeof response.error !== 'undefined' ? response.error.message : null;
            $.alert('warning', 'We failed to create album on Facebook. ' + error);
        }

        albumsFBIds[albumData.name] = id;
        callback(id);
    });
}
