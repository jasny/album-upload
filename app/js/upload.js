+function() {
    const maxFilesize = 5; //MB
    const $albumForm = $('#album-form');
    var uploading = false;

    //Init pictures upload area
    Dropzone.options.picturesUpload = {
        maxFilesize: maxFilesize,
        autoProcessQueue: false,
        acceptedFiles: 'image/jpg,image/jpeg',
        dictDefaultMessage: 'Drop files here to upload<br/>Max. file size: ' + maxFilesize + ' MB',
        accept: function(file, done) {
            var symbols = ['%', '+'];
            var invalid = false;

            for (var i=0; i<symbols.length; i++) {
                if (file.name.indexOf(symbols[i]) !== -1) invalid = true;
            }

            return invalid ? done('File name should not contain symbols ' + symbols.join(', ')) : done();
        },
        init: function () {            
            var drop = this;
            
            //Validate album form before processing added files
            this.on('addedfile', function(file) {
                if (!canUploadFiles()) {
                    drop.removeAllFiles();
                }
            });
            
            //If neccessary, create album, and then save pictures
            this.on('thumbnail', function(file) {                                
                //Check if form was invalid, so we removed all files without upload
                if (!drop.files.length) return;
                
                uploadState('start');

                addDefferedFileAction(function() {
                    drop.processFile(file);
                });

                syncFacebookAlbums(function() {
                    syncCurrentlAlbum(doDefferedFileAction);
                });
            });

            //Dropzone does not support dynamic change of form 'action' attribute, so we set upload url like this
            this.on('processing', function(file) {
                drop.options.url = `https://${uploadParams.bucket}.s3.amazonaws.com`;
            });
            
            var offset = 0;
            
            //Save names of uploaded files to db
            this.on('queuecomplete', function() {
                if (!uploading) return;

                uploadParams = null;

                var files = [];
                var denied = false;

                for (var i=offset; i<drop.files.length; i++) {
                    if (drop.files[i].status == 'success' && drop.files[i].accepted) files.push(drop.files[i].name);
                    else denied = true;
                }
                
                //Skip denied files next time
                offset = drop.files.length - files.length;

                if (denied) $.alert('warning', 'Some files were not uploaded');
                else $.alert('success', 'All photos were uploaded successfully');

                uploadState('end');

                var clear = drop.getAcceptedFiles();
                for (var i=0; i<clear.length; i++) {
                    drop.removeFile(clear[i]);
                }
            });
            
            //Prevent interrupting upload process
            window.onbeforeunload = function(e) {
                if (!uploading) return;
                
                var message = 'Upload is not finished yet. If it is interrupted, no files will be saved. Are you sure you want to continue and abort upload?';

                if (typeof e == 'undefined') e = window.event;        
                if (e) e.returnValue = message;

                return message;
            };
            
            //Set upload state
            function uploadState(state) {
                uploading = (state === 'start');
            }
        }
    };
}();