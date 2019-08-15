Sentry.init({ dsn: 'https://9a2dd82a420e4115aca3cc605e6131f7@sentry.io/1385360' });


var API_BASE_URL = "{{API_BASE_URL}}"

var getTimeDiff = function(time1, time2) {
  var hourDiff = time2 - time1;
  var diffDays = Math.floor(hourDiff / 86400000);
  var diffHrs = Math.floor((hourDiff % 86400000) / 3600000);
  var diffMins = Math.floor(((hourDiff % 86400000) % 3600000) / 60000);
  return {"days": diffDays, "hours": diffHrs, "mins": diffMins};
}


/**
 */
var getLicense = function(feature, date) {
  /* Auth token */
  var id_token = Cookies.get("com.neo4j.accounts.idToken");

  /* Return ajax for callback chaining */
  return $.ajax
  ({
    type: "GET",
    url: API_BASE_URL + "getLicense?date=" + date + "&feature=" + feature,
    async: true,
    headers: {
       "Authorization": id_token
    }
  });
}


$(document).ready(function() {  
  var start = Date.now();
  var userInfo = Cookies.getJSON("com.neo4j.accounts.userInfo");
  var id_token = Cookies.get("com.neo4j.accounts.idToken");
  var id_token_expired = true;
  var expiresIn = null;
  if (id_token) {
    expiresIn = getTimeDiff(Date.now(), (jwt_decode(id_token).exp) * 1000); 
    if ( (expiresIn.days > 0) || (expiresIn.hours > 0) || (expiresIn.mins > 0)) {
      id_token_expired = false;
    }  else {
      id_token_expired = true;
    } 
  } else {
    $('.pre-apply').show();
  }

  if (userInfo && id_token && !id_token_expired) {
    var qsmap = parseQueryString();
    if ('feature' in qsmap && 'date' in qsmap){
      getLicense(qsmap['feature'][0], qsmap['date'][0]).done(
        function (data) {
          license_text = data['license']['license_key'];
          license_instructions = data['license']['license_instructions'];
          $('#license_description').html("License for " + data['license']['licensed_feature_name']);
          $('#license_instructions').html(license_instructions);
          $('#license_text').html('<pre>' + license_text + '</pre>');
          sleepTime = 1500 - (Date.now() - start);
          if (sleepTime < 0) {
            sleepTime = 0;
          }
          setTimeout(function() { $('#pre-load').hide(); $('#post-load').show(); }, sleepTime);
        }
      );
    }
  } else {
    $('.application').hide();
    $('.pre-apply').show();
  }

}); // end document.ready() handler
