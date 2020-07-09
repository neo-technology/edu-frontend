import { WebAuth } from 'auth0-js'

const auth = new WebAuth({
  clientID: 'hoNo6B00ckfAoFVzPTqzgBIJHFHDnHYu',
  domain: 'login.neo4j.com',
  redirectUri: `${window.location.origin}/accounts/login`,
  audience: 'neo4j://accountinfo/',
  scope: 'read:account-info openid email profile user_metadata',
  responseType: 'token id_token'
})

Sentry.init({ dsn: 'https://9a2dd82a420e4115aca3cc605e6131f7@sentry.io/1385360' });

var API_BASE_URL = "{{API_BASE_URL}}"

/**
 */
var getLicense = function (feature, date, token) {

  /* Return ajax for callback chaining */
  return $.ajax
    ({
      type: "GET",
      url: API_BASE_URL + "getLicense?date=" + date + "&feature=" + feature,
      async: true,
      headers: {
        "Authorization": token
      }
    });
}


$(document).ready(function () {
  var start = Date.now();

  auth.checkSession({}, (err, result) => {
    if (err) {
      $('.application').hide();
      $('.pre-apply').show();
      return;
    }

    const accessToken = result.idToken;

    var qsmap = parseQueryString();
    if ('feature' in qsmap && 'date' in qsmap) {
      getLicense(qsmap['feature'][0], qsmap['date'][0], accessToken).done(
        function (data) {
          const license_text = data['license']['license_key'];
          const license_instructions = data['license']['license_instructions'];
          $('#license_description').html("License for " + data['license']['licensed_feature_name']);
          $('#license_instructions').html(license_instructions);
          $('#license_text').html('<pre>' + license_text + '</pre>');
          let sleepTime = 1500 - (Date.now() - start);
          if (sleepTime < 0) {
            sleepTime = 0;
          }
          setTimeout(function () { $('#pre-load').hide(); $('#post-load').show(); }, sleepTime);
        }
      );
    }
  })
}); // end document.ready() handler
