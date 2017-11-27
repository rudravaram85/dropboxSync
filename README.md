# dropboxSync
AngularJS custom directive for Dropbox folder to Aws S3 sync

This Feature enables a user to select a dropbox folder and sync it with aws s3 storage service.

To avail thise feature an app must be created in dropbox developer website where we can get app key and app secret key.Refer below link,

https://www.dropbox.com/developers

To authenticate dropbox account we use Oauth2 methodology.First a user has to configure the dropbox account and then he can sync the folder.

TO configure dropbox account , dropbox api explorer provides an option of opening a popup on button click.This popup has the signin logic already inbuilt by dropbox. When the user tries to authenticate , if it's a success dropbox redirects to the redirect_uri provided in the dropbox app with a authorization code in the url parameter.

This parameter has to be accessed and an api call has to be made to https://api.dropboxapi.com/oauth2/token url.On success dropbox api sends a response with bearer token, this bearer token is used to make api calls to get data and metadata.

When the user enters folder name , an api call is made to https://api.dropboxapi.com/2/files/list_folder. This api returns the details about the files in the folder.It is metadata of each file.

An api call for each single file detail to https://content.dropboxapi.com/2/files/download to get the data.Filename is extracted from the response and object is associated with each filenmae and datapair.We use $q service for chaning the promises.

An aws s3 policy is made, with all the requirements. A signature is calculated using hmac sha256, please refer below,

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
                  
                  
  An api call is made for each imported file from dropbox to aws s3 using $q,this the tricky part,
  
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
  
  
                  
                  
                  
                  
                  

