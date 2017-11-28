'use strict'

angular.module('spBlogger.directives',[])
.directive('dropboxSync', function ($window, $interval,$http,$filter,$q) {
    return {
        restrict: 'E',
        templateUrl: 'app/dropboxFiles.html',
        require: 'ngModel',
       

        link: function (scope, element, attrs,ngModel) {
            scope.folder="";
            scope.accountName = "";
            scope.dropboxFilelist = [];
            
            scope.$watch(function(){
                return ngModel.$modelValue;
            }, function(modelValue){
                if (modelValue) {
                    element.addClass("active");
                    
                }else{
                    element.removeClass("active");
                };
            });
          
            var winref = "";    
                    // assign the current $scope to $window so that the popup window can access it
                    $window.scope = scope;
                    console.log(scope);

                    scope.showPopup = function showPopup() {
                        var x = "https://www.dropbox.com/oauth2/authorize?client_id="+"<account_id>"+"&redirect_uri=http:%2F%2Flocalhost:8000&response_type=code";

                        // center the popup window
                        var popup = $window.open(x, '', "width=900,height=500")
                            , interval = 1000;
                           scope.authToken ="";
                           
                            
                        // create an ever increasing interval to check a certain global value getting assigned in the popup
                        var i = $interval(function () {
                            interval += 500;
                            try {
                                   console.log(popup.location.href);
                                   var urlParams = new URLSearchParams(popup.location.search);
                                   scope.oauthCode=urlParams.get('code'); 
                                   if(scope.oauthCode != "" || scope.oauthCode != "null"|| scope.oauthCode !== null)
                                   {    
                                   console.log( scope.oauthCode );
                                   popup.close();
                                   $interval.cancel(i);
                                   getOauthToken();
                                   }
                                
                            } catch (e) {
                                console.error(e);
                            }
                        }, interval);

                    }                   
                    scope.folder_sync = true;


                    function getOauthToken(){
                       
                      var promise =  $http({
                          headers:{"content-type":"application/x-www-form-urlencoded"},
                            data: "code="+scope.oauthCode+"&grant_type=authorization_code"+
                             "&client_id="+encodeURIComponent("<app_key>")+"&client_secret="+encodeURIComponent("<app_secret>")+
                             "&redirect_uri=http://localhost:8000",
                               withCredentials:false, 
                                method: 'POST',
                                url: 'https://api.dropboxapi.com/1/oauth2/token',                      
                                       }).then(function (respo) {
                                           console.log("response below");
                                           scope.oauthToken=respo.data.access_token; 
                                           scope.account_id = respo.data.account_id;  
                                           getUserAccountInfo();                                      
                                    }, function (respo) {
                                        console.log(respo);                                         
                                        
                                    });
                    }

                    function getUserAccountInfo(){
                         
                        var dropboxAccountPromise = $http({headers: { 'Content-Type': 'application/json','Authorization':'Bearer '+ scope.oauthToken },
                        data:{"account_id":scope.account_id},
                        withCredentials : false,                  
                         method: 'POST',
                         url: 'https://api.dropboxapi.com/2/users/get_account',                  
     
                     }).then(function (resp) {
                          console.log(resp.data.name.display_name);
                          scope.account_configured = true;
                          scope.accountName = resp.data.name.display_name;
                        
                     });
                    }
                
                    
                    scope.importFiles = function importFiles() {                       
                        if(ngModel.$modelValue =="")
                        scope.folder_no_fill_error = true;  
                         else
                        {
                        scope.folder_no_fill_error = false;
                        scope.folder_sync_spinner = true;
                        scope.folder_sync = false;
                        scope.FolderName=ngModel.$modelValue;                        
                        dropboxPromise();
                        }                
                    }

            function dropboxPromise() {
 var dropboxFolderPromise = $http({headers: { 'Content-Type': 'application/json','Authorization':'Bearer '+ scope.oauthToken },
                   data:{"path":"/" + scope.FolderName},
                   withCredentials : false,                  
                   origin:"http://localhost:8000",
                 method: 'POST',
                    url: 'https://api.dropboxapi.com/2/files/list_folder',                  

                }).then(function (resp) {

                    scope.folder_not_found_error=false;             
                    scope.fileList = angular.copy(resp.data.entries);
                    scope.folderArray = [];

                    //push the file names into folderArray Variable
                    angular.forEach(scope.fileList, function (item) {
                              if(item['.tag'] != "folder") 
                              {
                                  scope.folderArray.push(item.name);
                              }   
                      
                        });
                        
                        // Creating an empty initial promise that always resolves itself.
                        var dropboxFilePromise = $q.all([]);                        

                        // Iterating list of items.
                        angular.forEach(scope.folderArray, function (item) {
                          dropboxFilePromise = dropboxFilePromise.then(function () {
                            return $http({headers: { 'Content-Type': 'application/json','Authorization':'Bearer '+ scope.oauthToken ,
                            "Dropbox-API-Arg": "{\"path\":\"/"+scope.FolderName+"/"+item+"\"}"},
                                 withCredentials : false,                                      
                                 origin:"http://localhost:8000",
                                 method: 'POST',
                                    url: 'https://content.dropboxapi.com/2/files/download',                      
                                           }).then(function (respo) {
                                            scope.dropboxFileObj = {};                                           
                                            scope.dropboxFileObj.data = respo.data;
                                            var fileObj = (JSON.parse(respo.config.headers["Dropbox-API-Arg"]));
                                            var filePath = fileObj.path;                                            
                                            var fileNameArr= filePath.split("/");                                            
                                            scope.dropboxFileObj.name = fileNameArr.pop();                                            
                                           scope.dropboxFilelist.push(scope.dropboxFileObj);                                          
                                        }, function (respo) {
                                            console.log(scope.dropboxFileObj.name +'failed downloaded from dropbox');
                                        });
                          });                         
                        }); 
                        dropboxFilePromise.finally(function () {                            
                            console.log('dropbox download Chain finished!');
                            s3FileUpload();
                          });                       
                }, function (resp) {
                    scope.folder_not_found_error=true;
                    scope.folder_sync_spinner = false;
                    scope.folder_sync = true;                    
                });
            }

          function s3FileUpload() {
                
                var config = {
                    bucket: "advokitbucket",
                    access_key: "<acess_key>",
                    secret_key: "<secret_key>",
                    region: "ap-south-1",
                    acl: "public-read",                                                 // to allow the uploaded file to be publicly accessible. Can also be set to "private"
                    "x-amz-algorithm": "AWS4-HMAC-SHA256",                              // algorithm used for signing the policy document
                    success_action_status: "201"                                        // to return an XML object to the browser detailing the file state
                  };

                  var datestring = new Date().toISOString();
                  var date = datestring.substr(0, 4) + datestring.substr(5, 2) + datestring.substr(8, 2);                 
                  
                  // create upload credentials
                  var credential = config.access_key + "/" + date + "/" + config.region + "/s3/aws4_request";

                  // create policy
                  var policy = {
                    expiration: (new Date(Date.now() + 100000)).toISOString(),         // to set the time after which upload will no longer be allowed using this policy
                    conditions: [
                      { bucket: config.bucket },
                      [ "starts-with", "$key", "" ],                                          // filename with which the uploaded file will be saved on s3
                      { acl: config.acl },
                      ["starts-with", "$Content-Type", ""],                      
                      { "x-amz-algorithm": config["x-amz-algorithm"] },
                      { "x-amz-credential": credential },
                      { "x-amz-date": date + "T000000Z" }
                    ]
                  };
                  
                  // base64 encode policy
                  var polstr = JSON.stringify(policy);
                  var policyBase64 = window.btoa(polstr);
            
                  var dateKey = CryptoJS.HmacSHA256( date,"AWS4" + config.secret_key);                  
                  var dateRegionKey = CryptoJS.HmacSHA256(config.region,dateKey);                  
                  var dateRegionServiceKey = CryptoJS.HmacSHA256("s3",dateRegionKey);                  
                  var signingKey = CryptoJS.HmacSHA256("aws4_request",dateRegionServiceKey);  
                   
                   // hex encode signature
                  var xAmzSignature = CryptoJS.HmacSHA256(policyBase64,signingKey).toString(CryptoJS.enc.Hex);
                  var upload_url = "https://" + config.bucket + ".s3.amazonaws.com";
                 
                  var awsS3FilePromise = $q.all([]);
                  
                  angular.forEach(scope.dropboxFilelist, function (item) {
                    awsS3FilePromise = awsS3FilePromise.then(function () {  
                                   
                  // Construct a blob
                  var fileDataBlob = [
                    new Blob([item.data], {type: 'text/html'}),
                    ' Same way as you do with blob',
                    new Uint16Array([33])
                  ];
                  
                  // Construct a file
                  var dropboxDataFile = new File(fileDataBlob, item.name, {
                      lastModified: new Date(0), // optional - default = now
                      type: "overide/mimetype" // optional - default = ''
                  });
                  
                  var formData = new FormData();
                  formData.append('acl', "public-read");
                  formData.append('Content-Type', 'text/html');
                  formData.append('X-Amz-Date',date + "T000000Z");
                  formData.append('X-Amz-Algorithm', "AWS4-HMAC-SHA256");
                  formData.append('X-Amz-Credential', credential);
                  formData.append('X-Amz-Signature', xAmzSignature);
                  formData.append('Policy', policyBase64);
                  formData.append('key', item.name);
                  formData.append('file', item.data);                 
                  
                 /* Angular’s default transformRequest function will try to serialize FormData object,
                  override it with the identity function to leave the data intact.Angular’s default 
                  Content-Type header for POST and PUT requests is application/json ,to change set 
                  ‘Content-Type’: undefined, the browser sets the Content-Type to multipart/form-data
                  for promise and fills in the correct boundary. Manually setting ‘Content-Type’: multipart/form-data
                  will fail to fill in the boundary parameter of the request.*/

                  return $http({data: formData,
                    headers: {'Content-Type': undefined}
                    ,transformRequest: angular.identity,
                               method: 'POST',
                                  url: upload_url,       
                              }).then(function (respo) {
                                 console.log(item.name +" Is Successfully Uploaded to S3");
                                      
                              }, function (respo) {
                                console.log(item.name +" file failed Upload to S3");                                
                            })
                        });                
                       
                        });
                        awsS3FilePromise.finally(function () {                            
                            console.log('S3 upload Chain finished!');
                            scope.folder_sync_spinner = false;
                            scope.folder_sync = true;
                          });
                        
                          }

            
        
        }
    }
});
