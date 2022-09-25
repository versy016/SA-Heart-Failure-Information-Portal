angular.module("uMarketingSuite").component("umsProfilesContentApp", {
    templateUrl: "/App_Plugins/uMarketingSuite/contentApps/profiles/ums-profiles-content-app.html",
    controller: [
        "umsProfileInfoService",
        "$location",
        "memberResource",
        function umsProfilesContentAppController(service, $location, memberResource) {
            var ctrl = this;
            
            ctrl.state = {
                isLoading: true,
                visitorIds: [],
            }

            ctrl.fn = {
                getMemberFromUrl: function() {
                    var url = $location.path();
                    url = url.split("/");
                    return url[url.length -1];
                },
                getMemberIdFromGuid: function(guid) {
                    return memberResource.getByKey(guid).then(function(result) {
                        return result.id;
                    })
                }
            }

            this.load = function () {
                var memberGuid = ctrl.fn.getMemberFromUrl();
                if(memberGuid.indexOf("Member") === 0) {
                    // This is the case when the member does not yet have an id, for example when creating the member.
                    ctrl.state.isLoading = false;
                } else {
                    ctrl.fn.getMemberIdFromGuid(memberGuid).then(function(memberId) {
                        service.getRelatedProfiles(memberId).then(function(visitorIds) {
                            if(visitorIds.length > 0) {
                                ctrl.state.visitorIds = visitorIds;
                            }
                            ctrl.state.isLoading = false;
                        });
                    });                
                }
            }
        }   
    ],
});
