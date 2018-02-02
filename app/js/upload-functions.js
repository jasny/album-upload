//Check if files can be uploaded to S3
function canUploadFiles() {
    const allowUpload = validateForm();

    if (!allowUpload) {
        awsSettings = getAWSSettings();
        allowUpload = awsSettings.accessKeyId && awsSettings.secret && awsSettings.region && awsSettings.bucket;

        if (!allowUpload) $.alert('danger', 'Access to AWS is not configured');
    }

    return allowUpload;
}

//Get album data from album form
function getFormAlbumData() {
    const $form = $('#album-form');

    return {
        name: $form.find('.album-name').val().trim(),
        message: $form.find('.album-message').val().trim(),
        location: $form.find('.album-location').val().trim()
    };
}

//Validate album form on add pictures before album auto-creation
function validateForm() {
    var $form = $('#album-form');
    $form.validator('validate');

    return !$form.find(':invalid').length;
}

var actions = [];

//Defer file upload or removal 
function addDefferedFileAction(action) { 
    actions.push(action); 
} 
 
//Do each file upload or removal after album auto-creation 
function doDefferedFileAction() { 
    if (!actions.length) return;  
     
    for (let i=0; i<actions.length; i++) { 
        if (actions[i]) actions[i](); 
    } 
     
    actions = []; 
}

$.alert = function(status, message, callback, autoClose) {
    if (status === 'error') status = 'danger';
    if (autoClose !== false) autoClose = true;
    
    var $alert = $('<div class="alert alert-fixed-top">')
        .addClass('alert-' + status)
        .hide()
        .append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>')
        .append(message)
        .appendTo('body')
        .fadeIn();
        
    if (!autoClose) {
        $alert.addClass('no-auto-close');
        return;
    }

    setTimeout(function() {
        $alert.fadeOut(function() { 
            this.remove(); 
            if (callback){
                callback();
            }
        });
    }, 3000);
}