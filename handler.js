'use strict';

module.exports.albumUpload = (event, context, callback) => {
  const albumUpload = require('./lambdas/create_facebook_album');

  albumUpload(event, context);
};
