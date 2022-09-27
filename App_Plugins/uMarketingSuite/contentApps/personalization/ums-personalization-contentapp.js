angular.module("uMarketingSuite").controller("umsPersonalizationContentAppCtrl", [
    "umsUtilService",
    "umsDocumentTypePermissionsService",
    umsPersonalizationContentAppCtrl
]);

function umsPersonalizationContentAppCtrl(utils, doctypePermissionService) {
    var $ctrl = this;

    this.load = function() {
        this.contentTypeId = utils.getCurrentContentTypeId();

        this.showApplyPersonalization = false;
        this.showScorePersonalization = false;

        doctypePermissionService.getPermission(this.contentTypeId).then(function(permission) {
            $ctrl.showApplyPersonalization = permission.allowApplyPersonalization;
            $ctrl.showScorePersonalization = permission.allowScorePersonalization;
        }).finally(function() {
            $ctrl.loaded = true;
        });
    };
}
