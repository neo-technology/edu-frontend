import { WebAuth } from 'auth0-js'

Sentry.init({ dsn: 'https://9a2dd82a420e4115aca3cc605e6131f7@sentry.io/1385360' });

window._eduProgram = {};

const auth = new WebAuth({
  clientID: 'hoNo6B00ckfAoFVzPTqzgBIJHFHDnHYu',
  domain: 'login.neo4j.com',
  redirectUri: `${window.location.origin}/accounts/login`,
  audience: 'neo4j://accountinfo/',
  scope: 'read:account-info openid email profile user_metadata',
  responseType: 'token id_token'
})

const API_BASE_URL = "{{API_BASE_URL}}";

const truncateDateTime = function (dateTimeStr) {
  if (typeof dateTimeStr == 'string') {
    return dateTimeStr.substring(0, 10);
  } else {
    return dateTimeStr;
  }
}

/**
 * Post application in current form (id: edu-application)
 */
const postApplication = function () {
  const accessToken = window._eduProgram.accessToken;

  /* Serialize data into JSON */
  const checkboxes = [];
  const jsonData = $('#edu-application').serializeArray()
    .reduce(function (a, x) {
      if (x.name == "student-studies") {
        a[x.name] = checkboxes;
        checkboxes.push(x.value);
      } else {
        a[x.name] = x.value;
      }
      return a;
    }, {});

  /* Return ajax for callback chaining */
  return $.ajax
    ({
      type: "POST",
      url: API_BASE_URL + "apply",
      contentType: "application/json",
      dataType: 'json',
      async: true,
      data: JSON.stringify(jsonData),
      headers: {
        "Authorization": accessToken
      }
    });
}

/**
 * Get applications previously submitted by current user
 */
let getApplications = function (accessToken) {
  /* Return ajax for callback chaining */
  return $.ajax
    ({
      type: "GET",
      url: API_BASE_URL + 'getApplications',
      async: true,
      headers: {
        "Authorization": accessToken
      }
    });
}


$(document).ready(function () {
  Foundation.reInit('equalizer');

  $.validator.methods.agree = function (value, element) {
    return this.optional(element) || /^AGREE$/.test(value);
  }


  /* Register validation handler */
  $("#edu-application").validate({
    rules: {
      "terms-agree": "agree"
    },
    messages: {
      "terms-agree": "You must type AGREE in this field to agree to terms"
    },
    submitHandler: function (form) {
      /* TODO move into success and failure cases */
      postApplication()
        .fail(function (jqXHR, textStatus, errorThrown) {
          alert("Failed submitting application. (" + jqXHR.statusText + "). Contact edu@neo4j.com if this problem persists.");
        })
        .done(
          function (data) {
            $('.pre-apply').hide();
            $('.application').hide();
            $('#application-id').text("Application ID: " + data['application-id']);
            document.body.scrollTop = document.documentElement.scrollTop = 0;
            $('#load-edu-home-button').click(
              function () {
                window.location.reload(true);
                return false;
              }
            )
            $('.post-apply').show();
            $('.available-downloads').hide();
            $('.existing-applications').hide();
          }
        );
    }
  });

  /* Register button to submit form */
  $('#edu-application-button').click(
    function () {
      $("#edu-application").submit();
      return false;
    }
  );

  /* Register button to sign in*/
  $('#application-signin').click(
    function () {
      const currentLocation = [location.protocol, '//', location.host, location.pathname].join('');
      window.location = 'https://neo4j.com/accounts/login-b/?targetUrl=' + encodeURI(currentLocation + '?action=continue');
      return false;
    }
  );

  /* Register button to sign out*/
  $('.application-signout').click(
    function () {
      window.location = 'https://neo4j.com/accounts/logout/?targetUrl=' + encodeURI(window.location);
      return false;
    }
  );

  $('#application-toggle-button').click(
    function () {
      $('.pre-apply').hide();
      $('.post-apply').hide();
      $('.application').show();
      $('.application-toggle').hide();
      Foundation.reInit('equalizer');
    }
  );


  auth.checkSession({}, (err, result) => {
    try {
      if (err) {
        $('.pre-apply').show();
        $('.application').hide();
        $('.loading-icon').hide();
        Foundation.reInit('equalizer');
        return;
      }

      const accessToken = result.idToken;
      const userProfile = result.idTokenPayload;

      window._eduProgram.accessToken = accessToken;

      $('.pre-apply').hide();
      $('.loading-icon').show();
      getApplications(accessToken)
        .fail(function (jqXHR, textStatus, errorThrown) {
          alert("Failed retrieving existing apps. (" + jqXHR.statusText + "). Contact edu@neo4j.com if this persists.");
        })
        .done(function (data) {
          if (data['applications'].length > 0) {
            let approvedApps = 0;
            data['applications'].forEach(function (app) {
              let newListItem = $('#existing-applications-list-header').clone();
              newListItem.find('.app-date').text(truncateDateTime(app['created_date']));
              newListItem.find('.app-school-name').text(app['school_name']);
              newListItem.find('.app-status').text(app['status']);
              newListItem.find('.app-licenses').text('');
              newListItem.find('.license-expires').text(truncateDateTime(app['expires_date']));
              for (let keyid in app['license_keys']) {
                const key = app['license_keys'][keyid];
                newListItem.find('.app-licenses').append('<a target="_blank" href="view-edu-license?date=' + key['license_date'] + '&feature=' + key['licensed_feature'] + '">' + key['licensed_feature'].replace('neo4j-', '') + '</a> &nbsp;');
              }
              newListItem.insertAfter('#existing-applications-list-header');
              if (app['status'] == 'APPROVED') {
                approvedApps = approvedApps + 1;
              }
            });
            if (accessToken) {
              $('.existing-applications').show();
              $('.application').hide();
              $('.application-toggle').show();
              $('.loading-icon').hide();
              if (approvedApps > 0) {
                const rowId = 0;
                let insertAfter = 'available-downloads-list-header';
                const downloads = data['downloadUrls']
                let newListItem = $('#available-downloads-list-header').clone();
                newListItem.attr('id', 'available-downloads-list-row' + rowId);
                newListItem.find('.release-product').text('Neo4j Desktop');
                newListItem.find('.release-version').text(downloads['version']);
                newListItem.find('.download-link').html('<a target="_blank" href="' + downloads['windows'] + '">Windows</a>&nbsp;&nbsp; <a target="_blank" href="' + downloads['mac'] + '">macOS</a>&nbsp;&nbsp; <a target="_blank" href="' + downloads['linux'] + '">Linux</a>');
                newListItem.insertAfter('#' + insertAfter);
                insertAfter = 'available-downloads-list-row' + rowId;
                $('.available-downloads').show();
              }
              Foundation.reInit('equalizer');
            } else {
              $('.pre-apply').show();
              $('.application').hide();
              $('.loading-icon').hide();
              Foundation.reInit('equalizer');
            }
          } else if (data['applications'].length == 0) {
            if (accessToken) {
              $('.existing-applications').hide();
              $('.application').show();
              $('.loading-icon').hide();
              Foundation.reInit('equalizer');
            } else {
              $('.pre-apply').show();
              $('.loading-icon').hide();
              $('.application').hide();
              Foundation.reInit('equalizer');
            }
          }
        }
        );
      $('#first-name').val(userProfile.given_name);
      $('#last-name').val(userProfile.family_name);
      $('#email').val(userProfile.email);

    } catch (e) {
      console.log(e);
    }

  });

}); // end document.ready() handler
